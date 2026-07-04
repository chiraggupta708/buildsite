import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/reminders/[id]/route";
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
    reminder: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/reminders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reminder if user owns site chain", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({
      id: "r1", title: "Check foundation", dueDate: "2026-07-10T00:00:00.000Z", done: false,
    });

    const params = createParams("r1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("r1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "r1" }),
      })
    );
  });

  it("returns 404 for another user's reminder", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("r-other");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("r1");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/reminders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own reminder", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "r1", done: false });
    mockUpdate.mockResolvedValue({ id: "r1", title: "Updated", done: true });

    const req = createRequest({ title: "Updated", done: true });
    const params = createParams("r1");
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.done).toBe(true);
  });

  it("returns 404 for another user's reminder", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest({ done: true });
    const params = createParams("r-other");
    const res = await PUT(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ done: true });
    const params = createParams("r1");
    const res = await PUT(req, { params });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/reminders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own reminder", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "r1", title: "Test" });
    mockDelete.mockResolvedValue({ id: "r1" });

    const params = createParams("r1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 404 for another user's reminder", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("r-other");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("r1");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});