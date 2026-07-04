import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/tasks/[id]/route";
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
    task: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns task if user owns site chain", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({
      id: "t1", title: "Pour foundation", status: "todo",
      phase: null, labour: null,
    });

    const params = createParams("t1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("t1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "t1" }),
      })
    );
  });

  it("returns 404 for another user's task", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("t-other");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("t1");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own task", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "t1", title: "Old" });
    mockUpdate.mockResolvedValue({
      id: "t1", title: "Updated", status: "done", phase: null, labour: null,
    });

    const req = createRequest({ title: "Updated", status: "done" });
    const params = createParams("t1");
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe("Updated");
    expect(data.status).toBe("done");
  });

  it("updates status and order (drag and drop)", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "t1", status: "todo" });
    mockUpdate.mockResolvedValue({
      id: "t1", title: "Task", status: "in_progress", order: 1000, phase: null, labour: null,
    });

    const req = createRequest({ status: "in_progress", order: 1000 });
    const params = createParams("t1");
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("in_progress");
    expect(data.order).toBe(1000);
  });

  it("returns 404 for another user's task", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest({ title: "Hacked" });
    const params = createParams("t-other");
    const res = await PUT(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ status: "done" });
    const params = createParams("t1");
    const res = await PUT(req, { params });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own task", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "t1", title: "Test" });
    mockDelete.mockResolvedValue({ id: "t1" });

    const params = createParams("t1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 404 for another user's task", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("t-other");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("t1");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});