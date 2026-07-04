import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/sites/[id]/route";
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
    site: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns site only if owned by user (via client→user chain)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "s1",
      name: "Site A",
      clientId: "c1",
      client: { id: "c1", name: "Client A" },
      labourAssignments: [],
    });

    const params = createParams("s1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("s1");
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "s1", client: { userId: USER_ID } },
      include: {
        client: true,
        labourAssignments: {
          include: { labour: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("s-other");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own site only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "s1", client: { userId: USER_ID } });
    mockUpdate.mockResolvedValue({ id: "s1", name: "Updated", status: "completed" });

    const params = createParams("s1");
    const req = createRequest({ name: "Updated", status: "completed" });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated");
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("s-other");
    const req = createRequest({ name: "Hacked" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own site only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "s1", client: { userId: USER_ID } });
    mockDelete.mockResolvedValue({ id: "s1" });

    const params = createParams("s1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("s-other");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(404);
  });
});