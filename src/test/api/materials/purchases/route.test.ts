import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/materials/purchases/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockSiteFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    materialPurchase: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    site: {
      findFirst: mockSiteFindFirst,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("GET /api/materials/purchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns purchases scoped to user's sites", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const purchases = [
      { id: "mp1", itemName: "Cement", uom: "bags", quantity: 50, ratePerUnit: 10, total: 500, siteId: "s1", userId: OWNER_USER_ID, usage: [] },
    ];
    mockFindMany.mockResolvedValue(purchases);

    const req = createGetRequest("http://localhost:3000/api/materials/purchases");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(purchases);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { site: { client: { userId: OWNER_USER_ID } } },
      include: { usage: { select: { quantityUsed: true } } },
      orderBy: { purchaseDate: "desc" },
    });
  });

  it("filters purchases by siteId when query param provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const purchases = [
      { id: "mp1", itemName: "Cement", uom: "bags", quantity: 50, ratePerUnit: 10, total: 500, siteId: "s1", userId: OWNER_USER_ID, usage: [] },
    ];
    mockFindMany.mockResolvedValue(purchases);

    const req = createGetRequest("http://localhost:3000/api/materials/purchases?siteId=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(purchases);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { site: { client: { userId: OWNER_USER_ID } }, siteId: "s1" },
      include: { usage: { select: { quantityUsed: true } } },
      orderBy: { purchaseDate: "desc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGetRequest("http://localhost:3000/api/materials/purchases");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });
});

describe("POST /api/materials/purchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates purchase with auto-calc total and verifies site ownership", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockSiteFindFirst.mockResolvedValue({ id: "s1", name: "Site A" });

    const created = {
      id: "mp1",
      itemName: "Cement",
      uom: "bags",
      quantity: 50,
      ratePerUnit: 10,
      total: 500,
      purchaseDate: null,
      supplier: null,
      lowStockThreshold: null,
      siteId: "s1",
      userId: OWNER_USER_ID,
    };
    mockCreate.mockResolvedValue(created);

    const req = createRequest({
      itemName: "Cement",
      uom: "bags",
      quantity: 50,
      ratePerUnit: 10,
      siteId: "s1",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockSiteFindFirst).toHaveBeenCalledWith({
      where: { id: "s1", client: { userId: OWNER_USER_ID } },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        itemName: "Cement",
        uom: "bags",
        quantity: 50,
        ratePerUnit: 10,
        total: 500,
        purchaseDate: undefined,
        supplier: null,
        lowStockThreshold: null,
        siteId: "s1",
        userId: OWNER_USER_ID,
      },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({ itemName: "Cement", uom: "bags", quantity: 50, ratePerUnit: 10, siteId: "s1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ itemName: "Cement" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing required fields" });
  });

  it("returns 404 when site does not belong to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockSiteFindFirst.mockResolvedValue(null);

    const req = createRequest({
      itemName: "Cement",
      uom: "bags",
      quantity: 50,
      ratePerUnit: 10,
      siteId: "s-other",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Site not found" });
  });
});
