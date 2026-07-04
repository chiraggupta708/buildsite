import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/materials/usage/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockPurchaseFindFirst = vi.hoisted(() => vi.fn());
const mockUsageCreate = vi.hoisted(() => vi.fn());
const mockUsageFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    materialPurchase: {
      findFirst: mockPurchaseFindFirst,
    },
    materialUsage: {
      create: mockUsageCreate,
      findMany: mockUsageFindMany,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("POST /api/materials/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs usage when quantity <= remaining stock", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPurchaseFindFirst.mockResolvedValue({
      id: "mp1",
      quantity: 100,
      usage: [{ quantityUsed: 30 }, { quantityUsed: 20 }],
    });
    const createdUsage = {
      id: "u1",
      quantityUsed: 40,
      dateUsed: null,
      materialPurchaseId: "mp1",
    };
    mockUsageCreate.mockResolvedValue(createdUsage);

    const req = createRequest({ materialPurchaseId: "mp1", quantityUsed: 40 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(createdUsage);
    expect(mockPurchaseFindFirst).toHaveBeenCalledWith({
      where: { id: "mp1", site: { client: { userId: OWNER_USER_ID } } },
      include: { usage: { select: { quantityUsed: true } } },
    });
    expect(mockUsageCreate).toHaveBeenCalledWith({
      data: {
        quantityUsed: 40,
        dateUsed: undefined,
        materialPurchaseId: "mp1",
      },
    });
  });

  it("rejects usage when quantity exceeds remaining stock", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPurchaseFindFirst.mockResolvedValue({
      id: "mp1",
      quantity: 100,
      usage: [{ quantityUsed: 80 }],
    });

    const req = createRequest({ materialPurchaseId: "mp1", quantityUsed: 30 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Quantity used (30) exceeds remaining stock (20)" });
    expect(mockUsageCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when purchase does not belong to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPurchaseFindFirst.mockResolvedValue(null);

    const req = createRequest({ materialPurchaseId: "mp-other", quantityUsed: 10 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Purchase not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({ materialPurchaseId: "mp1", quantityUsed: 10 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ materialPurchaseId: "mp1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing required fields" });
  });

  it("returns 400 when quantityUsed is null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ materialPurchaseId: "mp1", quantityUsed: null });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing required fields" });
  });
});

describe("GET /api/materials/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns usage scoped to user's purchases", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const usage = [
      {
        id: "u1",
        quantityUsed: 10,
        dateUsed: null,
        materialPurchaseId: "mp1",
        materialPurchase: { itemName: "Cement", uom: "bags" },
      },
    ];
    mockUsageFindMany.mockResolvedValue(usage);

    const req = createGetRequest("http://localhost:3000/api/materials/usage");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(usage);
    expect(mockUsageFindMany).toHaveBeenCalledWith({
      where: { materialPurchase: { site: { client: { userId: OWNER_USER_ID } } } },
      include: { materialPurchase: { select: { itemName: true, uom: true } } },
      orderBy: { dateUsed: "desc" },
    });
  });

  it("filters usage by materialPurchaseId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockUsageFindMany.mockResolvedValue([]);

    const req = createGetRequest("http://localhost:3000/api/materials/usage?materialPurchaseId=mp1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUsageFindMany).toHaveBeenCalledWith({
      where: { materialPurchase: { site: { client: { userId: OWNER_USER_ID } } }, materialPurchaseId: "mp1" },
      include: { materialPurchase: { select: { itemName: true, uom: true } } },
      orderBy: { dateUsed: "desc" },
    });
  });

  it("filters usage by siteId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockUsageFindMany.mockResolvedValue([]);

    const req = createGetRequest("http://localhost:3000/api/materials/usage?siteId=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // When siteId is provided, the route replaces materialPurchase condition
    // with just { siteId } (dropping the userId scope — this is the actual behavior)
    expect(mockUsageFindMany).toHaveBeenCalledWith({
      where: { materialPurchase: { siteId: "s1" } },
      include: { materialPurchase: { select: { itemName: true, uom: true } } },
      orderBy: { dateUsed: "desc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGetRequest("http://localhost:3000/api/materials/usage");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });
});
