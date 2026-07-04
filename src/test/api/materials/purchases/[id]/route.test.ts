import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/materials/purchases/[id]/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDeletePurchase = vi.hoisted(() => vi.fn());
const mockDeleteUsage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    materialPurchase: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDeletePurchase,
    },
    materialUsage: {
      deleteMany: mockDeleteUsage,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("GET /api/materials/purchases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns purchase if user owns it", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const purchase = {
      id: "mp1",
      itemName: "Cement",
      uom: "bags",
      quantity: 50,
      ratePerUnit: 10,
      total: 500,
      siteId: "s1",
      userId: OWNER_USER_ID,
      usage: [{ quantityUsed: 10 }],
    };
    mockFindFirst.mockResolvedValue(purchase);

    const params = createParams("mp1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(purchase);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "mp1", site: { client: { userId: OWNER_USER_ID } } },
      include: { usage: { select: { quantityUsed: true } } },
    });
  });

  it("returns 404 for another user's purchase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("mp-other");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("mp1");
    const res = await GET(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/materials/purchases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own purchase and recalculates total", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "mp1",
      quantity: 50,
      ratePerUnit: 10,
      userId: OWNER_USER_ID,
    });
    mockUpdate.mockResolvedValue({
      id: "mp1",
      itemName: "Cement (Premium)",
      quantity: 100,
      ratePerUnit: 12,
      total: 1200,
    });

    const params = createParams("mp1");
    const req = createRequest({ itemName: "Cement (Premium)", quantity: 100, ratePerUnit: 12 });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "mp1" },
      data: expect.objectContaining({
        itemName: "Cement (Premium)",
        quantity: 100,
        ratePerUnit: 12,
        total: 1200,
      }),
    });
  });

  it("recalculates total when only quantity changes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "mp1",
      quantity: 50,
      ratePerUnit: 10,
      userId: OWNER_USER_ID,
    });
    mockUpdate.mockResolvedValue({
      id: "mp1",
      quantity: 75,
      ratePerUnit: 10,
      total: 750,
    });

    const params = createParams("mp1");
    const req = createRequest({ quantity: 75 });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(750);
  });

  it("returns 404 for another user's purchase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("mp-other");
    const req = createRequest({ itemName: "Hacked" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("mp1");
    const req = createRequest({ itemName: "Updated" });
    const res = await PUT(req, { params });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/materials/purchases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own purchase and cascades usage records", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "mp1", userId: OWNER_USER_ID });
    mockDeleteUsage.mockResolvedValue({ count: 3 });
    mockDeletePurchase.mockResolvedValue({ id: "mp1" });

    const params = createParams("mp1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDeleteUsage).toHaveBeenCalledWith({ where: { materialPurchaseId: "mp1" } });
    expect(mockDeletePurchase).toHaveBeenCalledWith({ where: { id: "mp1" } });
  });

  it("returns 404 for another user's purchase", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("mp-other");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("mp1");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});
