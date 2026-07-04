import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/labour-payments/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockLabourFindFirst = vi.hoisted(() => vi.fn());
const mockSiteFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    labourPayment: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    labour: {
      findFirst: mockLabourFindFirst,
    },
    site: {
      findFirst: mockSiteFindFirst,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/labour-payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payments scoped to user", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindMany.mockResolvedValue([
      { id: "p1", amount: 500, labourId: "l1", siteId: "s1", labour: { id: "l1", name: "John" }, site: { id: "s1", name: "Site A" } },
    ]);

    const req = new Request("http://localhost/api/labour-payments");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      })
    );
  });

  it("filters by labourId", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/labour-payments?labourId=l1");
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ labourId: "l1" }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/labour-payments"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/labour-payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates payment with verified labour and site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockLabourFindFirst.mockResolvedValue({ id: "l1", userId: USER_ID });
    mockSiteFindFirst.mockResolvedValue({ id: "s1", client: { userId: USER_ID } });
    mockCreate.mockResolvedValue({ id: "p1", labourId: "l1", siteId: "s1", amount: 1000, userId: USER_ID });

    const req = createRequest({ labourId: "l1", siteId: "s1", amount: 1000 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("p1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 1000, userId: USER_ID }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ labourId: "l1", siteId: "s1", amount: 100 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ labourId: "l1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's labour", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockLabourFindFirst.mockResolvedValue(null);

    const req = createRequest({ labourId: "l-other", siteId: "s1", amount: 100 });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockLabourFindFirst.mockResolvedValue({ id: "l1", userId: USER_ID });
    mockSiteFindFirst.mockResolvedValue(null);

    const req = createRequest({ labourId: "l1", siteId: "s-other", amount: 100 });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});