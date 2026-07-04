import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/clients/[id]/route";
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
    client: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("GET /api/clients/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns client only if it belongs to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const client = {
      id: "c1",
      name: "My Client",
      userId: OWNER_USER_ID,
      sites: [],
    };
    mockFindFirst.mockResolvedValue(client);

    const params = createParams("c1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(client);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "c1", userId: OWNER_USER_ID },
      include: {
        sites: {
          include: { _count: { select: { labourAssignments: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("returns 404 for another user's client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("c-other");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("c1");
    const res = await GET(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/clients/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "c1",
      userId: OWNER_USER_ID,
    });
    mockUpdate.mockResolvedValue({
      id: "c1",
      name: "Updated",
      phone: "456",
    });

    const params = createParams("c1");
    const req = createRequest({ name: "Updated", phone: "456" });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        name: "Updated",
        phone: "456",
        email: undefined,
        address: undefined,
      },
    });
  });

  it("returns 404 for another user's client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("c-other");
    const req = createRequest({ name: "Hacked" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/clients/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "c1", userId: OWNER_USER_ID });
    mockDelete.mockResolvedValue({ id: "c1" });

    const params = createParams("c1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("returns 404 for another user's client", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("c-other");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(404);
  });
});