import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/reminders/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockReminderFindMany = vi.hoisted(() => vi.fn());
const mockReminderCreate = vi.hoisted(() => vi.fn());
const mockSiteFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    reminder: {
      findMany: mockReminderFindMany,
      create: mockReminderCreate,
    },
    site: {
      findFirst: mockSiteFindFirst,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reminders scoped to user via site chain", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockReminderFindMany.mockResolvedValue([
      { id: "r1", title: "Check foundation", dueDate: "2026-07-10T00:00:00.000Z", done: false, siteId: "s1" },
    ]);

    const req = new Request("http://localhost/api/reminders?siteId=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockReminderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          site: { client: { userId: USER_ID } },
          siteId: "s1",
        }),
      })
    );
  });

  it("filters by upcoming", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    mockReminderFindMany.mockResolvedValue([
      { id: "r1", title: "Future check", dueDate: futureDate.toISOString(), done: false, siteId: "s1" },
    ]);

    const req = new Request("http://localhost/api/reminders?siteId=s1&upcoming=true");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockReminderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ done: false }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/reminders?siteId=s1"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates reminder with verified site ownership", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue({ id: "s1" });
    mockReminderCreate.mockResolvedValue({
      id: "r1", title: "Test reminder", dueDate: "2026-07-15T00:00:00.000Z", done: false, siteId: "s1",
    });

    const req = createRequest({ title: "Test reminder", dueDate: "2026-07-15", siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe("Test reminder");
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ title: "Test", dueDate: "2026-07-15", siteId: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing title", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ dueDate: "2026-07-15", siteId: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing dueDate", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ title: "Test", siteId: "s1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockSiteFindFirst.mockResolvedValue(null);

    const req = createRequest({ title: "Test", dueDate: "2026-07-15", siteId: "s-other" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});