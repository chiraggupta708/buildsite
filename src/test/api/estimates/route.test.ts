import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/estimates/route";
import { createRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockPhaseFindFirst = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    phase: {
      findFirst: mockPhaseFindFirst,
    },
    phaseEstimate: {
      upsert: mockUpsert,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("POST /api/estimates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates estimate with line items and auto-calculates totals", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPhaseFindFirst.mockResolvedValue({ id: "p1", name: "Foundation" });

    const createdEstimate = {
      id: "e1",
      phaseId: "p1",
      supplier: null,
      notes: null,
      lineItems: [
        { id: "li1", description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150, total: 1500 },
        { id: "li2", description: "Rebar", uom: "kg", quantity: 500, ratePerUnit: 2, total: 1000 },
      ],
    };
    mockUpsert.mockResolvedValue(createdEstimate);

    const req = createRequest({
      phaseId: "p1",
      supplier: "Supplier Co",
      notes: "Rush order",
      lineItems: [
        { description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150 },
        { description: "Rebar", uom: "kg", quantity: 500, ratePerUnit: 2 },
      ],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(createdEstimate);
    expect(mockPhaseFindFirst).toHaveBeenCalledWith({
      where: { id: "p1", site: { client: { userId: OWNER_USER_ID } } },
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { phaseId: "p1" },
      update: {
        supplier: "Supplier Co",
        notes: "Rush order",
        lineItems: {
          deleteMany: {},
          create: [
            { description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150, total: 1500 },
            { description: "Rebar", uom: "kg", quantity: 500, ratePerUnit: 2, total: 1000 },
          ],
        },
      },
      create: {
        phaseId: "p1",
        supplier: "Supplier Co",
        notes: "Rush order",
        lineItems: {
          create: [
            { description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150, total: 1500 },
            { description: "Rebar", uom: "kg", quantity: 500, ratePerUnit: 2, total: 1000 },
          ],
        },
      },
      include: { lineItems: true },
    });
  });

  it("uses upsert — updates existing estimate for same phaseId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPhaseFindFirst.mockResolvedValue({ id: "p1", name: "Foundation" });

    const updatedEstimate = {
      id: "e1",
      phaseId: "p1",
      supplier: null,
      notes: "Revised",
      lineItems: [
        { id: "li3", description: "Gravel", uom: "ton", quantity: 5, ratePerUnit: 50, total: 250 },
      ],
    };
    mockUpsert.mockResolvedValue(updatedEstimate);

    const req = createRequest({
      phaseId: "p1",
      notes: "Revised",
      lineItems: [
        { description: "Gravel", uom: "ton", quantity: 5, ratePerUnit: 50 },
      ],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(updatedEstimate);
    // upsert with same phaseId should trigger the update branch
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { phaseId: "p1" },
      update: expect.objectContaining({
        supplier: null,
        notes: "Revised",
      }),
      create: expect.objectContaining({
        phaseId: "p1",
        lineItems: expect.any(Object),
      }),
      include: { lineItems: true },
    });
  });

  it("returns 404 when phase does not belong to user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockPhaseFindFirst.mockResolvedValue(null);

    const req = createRequest({
      phaseId: "p-other",
      lineItems: [{ description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150 }],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Phase not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({
      phaseId: "p1",
      lineItems: [],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing phaseId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({
      lineItems: [{ description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150 }],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "phaseId and lineItems are required" });
  });

  it("returns 400 for missing lineItems", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ phaseId: "p1" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "phaseId and lineItems are required" });
  });

  it("returns 400 when lineItems is not an array", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ phaseId: "p1", lineItems: "not-an-array" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "phaseId and lineItems are required" });
  });
});
