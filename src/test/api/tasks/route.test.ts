import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/tasks/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockSiteFindFirst = vi.hoisted(() => vi.fn());
const mockTaskFindMany = vi.hoisted(() => vi.fn());
const mockTaskFindFirst = vi.hoisted(() => vi.fn());
const mockTaskCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findFirst: mockSiteFindFirst,
    },
    task: {
      findMany: mockTaskFindMany,
      findFirst: mockTaskFindFirst,
      create: mockTaskCreate,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tasks for a site scoped to user", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue({ id: "s1" });
    mockTaskFindMany.mockResolvedValue([
      { id: "t1", title: "Pour foundation", status: "todo", order: 0, siteId: "s1", phase: null, labour: null },
    ]);

    const req = new Request("http://localhost/api/tasks?siteId=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: "s1", userId: USER_ID }),
      })
    );
  });

  it("filters by status", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue({ id: "s1" });
    mockTaskFindMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/tasks?siteId=s1&status=done");
    await GET(req);

    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "done" }),
      })
    );
  });

  it("returns 400 without siteId", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const res = await GET(new Request("http://localhost/api/tasks"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue(null);
    const req = new Request("http://localhost/api/tasks?siteId=s-other");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/tasks?siteId=s1"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a task with verified site ownership", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue({ id: "s1" });
    mockTaskFindFirst.mockResolvedValue(null);
    mockTaskCreate.mockResolvedValue({
      id: "t1", title: "Test task", status: "todo", order: 0, siteId: "s1",
      phase: null, labour: null,
    });

    const req = createRequest({ title: "Test task", siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe("Test task");
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ title: "Test", siteId: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing title", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ siteId: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing siteId", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ title: "Test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue(null);
    const req = createRequest({ title: "Test", siteId: "s-other" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});