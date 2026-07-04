import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/labour/[id]/route";
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
    labour: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/labour/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns labour only if it belongs to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "l1",
      name: "John",
      trade: "electrician",
      userId: USER_ID,
      assignments: [],
    });

    const params = createParams("l1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("l1");
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "l1", userId: USER_ID },
      include: {
        assignments: {
          include: { site: { include: { client: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("returns 404 for another user's labour", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("l-other");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/labour/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own labour only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "l1", userId: USER_ID });
    mockUpdate.mockResolvedValue({ id: "l1", name: "Updated", trade: "plumber" });

    const req = createRequest({ name: "Updated", trade: "plumber" });
    const params = createParams("l1");
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated");
  });

  it("returns 404 for another user's labour", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest({ name: "Hacked" });
    const params = createParams("l-other");
    const res = await PUT(req, { params });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/labour/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own labour only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "l1", userId: USER_ID });
    mockDelete.mockResolvedValue({ id: "l1" });

    const params = createParams("l1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 404 for another user's labour", async () => {
    mockAuth.mockResolvedValue({
      user: { id: USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("l-other");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });
});