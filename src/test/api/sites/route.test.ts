import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/sites/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    client: {
      findFirst: mockFindFirst,
    },
  },
}));

describe("GET /api/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only sites belonging to user's clients", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const sites = [
      { id: "s1", name: "Site A", clientId: "c1", _count: { labourAssignments: 0 } },
    ];
    mockFindMany.mockResolvedValue(sites);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(sites);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { client: { userId: "user-1" } },
      include: { client: true, _count: { select: { labourAssignments: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates site only for user's client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "c1", userId: "user-1" });
    mockCreate.mockResolvedValue({
      id: "s1",
      name: "New Site",
      clientId: "c1",
    });

    const req = createRequest({ name: "New Site", clientId: "c1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("New Site");
  });

  it("returns 404 for another user's client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest({ name: "New Site", clientId: "c-other" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Client not found" });
  });

  it("returns 400 for missing name", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ clientId: "c1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Name and client are required" });
  });
});