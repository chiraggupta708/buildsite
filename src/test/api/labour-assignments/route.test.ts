import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/labour-assignments/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockLabourFindFirst = vi.hoisted(() => vi.fn());
const mockSiteFindFirst = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    labourAssignment: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    labour: {
      findFirst: mockLabourFindFirst,
    },
    site: {
      findFirst: mockSiteFindFirst,
    },
  },
}));

describe("GET /api/labour-assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only user's assignments", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const assignments = [
      {
        id: "a1",
        labourId: "l1",
        siteId: "s1",
        userId: "user-1",
        labour: { id: "l1", name: "John" },
        site: { id: "s1", name: "Site A", client: { name: "Client A" } },
      },
    ];
    mockFindMany.mockResolvedValue(assignments);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(assignments);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { labour: true, site: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("POST /api/labour-assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns only user's labour to user's site", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockLabourFindFirst.mockResolvedValue({ id: "l1", userId: "user-1" });
    mockSiteFindFirst.mockResolvedValue({ id: "s1", client: { userId: "user-1" } });
    mockCreate.mockResolvedValue({
      id: "a1",
      labourId: "l1",
      siteId: "s1",
      userId: "user-1",
    });

    const req = createRequest({ labourId: "l1", siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("a1");
  });

  it("returns 404 for another user's labour", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockLabourFindFirst.mockResolvedValue(null);

    const req = createRequest({ labourId: "l-other", siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Labour not found" });
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockLabourFindFirst.mockResolvedValue({ id: "l1", userId: "user-1" });
    mockSiteFindFirst.mockResolvedValue(null);

    const req = createRequest({ labourId: "l1", siteId: "s-other" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Site not found" });
  });

  it("returns 400 for missing fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ labourId: "l1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Labour and site are required" });
  });
});