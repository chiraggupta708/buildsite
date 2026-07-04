import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/phases/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockSiteFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    phase: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    site: {
      findFirst: mockSiteFindFirst,
    },
  },
}));

describe("GET /api/phases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only phases for user's sites (scoped by site->client->userId)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const phases = [
      { id: "p1", name: "Foundation", order: 1, siteId: "s1", userId: "user-1", estimate: null },
    ];
    mockFindMany.mockResolvedValue(phases);

    const req = createGetRequest("http://localhost:3000/api/phases");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(phases);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { site: { client: { userId: "user-1" } } },
      include: { estimate: { select: { id: true } } },
      orderBy: { order: "asc" },
    });
  });

  it("filters phases by siteId when query param provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const phases = [
      { id: "p1", name: "Foundation", order: 1, siteId: "s1", userId: "user-1", estimate: null },
    ];
    mockFindMany.mockResolvedValue(phases);

    const req = createGetRequest("http://localhost:3000/api/phases?siteId=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(phases);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { site: { client: { userId: "user-1" } }, siteId: "s1" },
      include: { estimate: { select: { id: true } } },
      orderBy: { order: "asc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGetRequest("http://localhost:3000/api/phases");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });
});

describe("POST /api/phases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates phase with user's userId and verifies site ownership", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockSiteFindFirst.mockResolvedValue({ id: "s1", name: "Site A" });
    const created = { id: "p1", name: "Foundation", order: 1, siteId: "s1", userId: "user-1" };
    mockCreate.mockResolvedValue(created);

    const req = createRequest({ name: "Foundation", order: 1, siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(created);
    expect(mockSiteFindFirst).toHaveBeenCalledWith({
      where: { id: "s1", client: { userId: "user-1" } },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "Foundation", order: 1, siteId: "s1", userId: "user-1" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({ name: "Foundation", siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing name", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Name and site are required" });
  });

  it("returns 400 for missing siteId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ name: "Foundation" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Name and site are required" });
  });

  it("returns 404 when site does not belong to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockSiteFindFirst.mockResolvedValue(null);

    const req = createRequest({ name: "Foundation", siteId: "s-other" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Site not found" });
  });
});
