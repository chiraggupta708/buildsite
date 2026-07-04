import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/phases/[id]/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    phase: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("GET /api/phases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns phase if user owns it (via phase->site->client->userId)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const phase = {
      id: "p1",
      name: "Foundation",
      order: 1,
      siteId: "s1",
      userId: OWNER_USER_ID,
      site: { id: "s1", name: "Site A" },
      estimate: null,
      payments: [],
    };
    mockFindFirst.mockResolvedValue(phase);

    const params = createParams("p1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(phase);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "p1", site: { client: { userId: OWNER_USER_ID } } },
      include: {
        site: { select: { id: true, name: true } },
        estimate: { include: { lineItems: true } },
        payments: { orderBy: { date: "desc" } },
      },
    });
  });

  it("returns 404 for another user's phase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("p-other");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("p1");
    const res = await GET(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/phases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own phase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "p1", userId: OWNER_USER_ID, siteId: "s1" });
    mockUpdate.mockResolvedValue({ id: "p1", name: "Updated Phase", order: 2 });

    const params = createParams("p1");
    const req = createRequest({ name: "Updated Phase", order: 2 });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated Phase");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "Updated Phase", order: 2 },
    });
  });

  it("returns 404 for another user's phase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("p-other");
    const req = createRequest({ name: "Hacked" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("p1");
    const req = createRequest({ name: "Updated" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/phases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own phase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "p1", userId: OWNER_USER_ID });
    mockDelete.mockResolvedValue({ id: "p1" });

    const params = createParams("p1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("returns 404 for another user's phase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("p-other");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("p1");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});
