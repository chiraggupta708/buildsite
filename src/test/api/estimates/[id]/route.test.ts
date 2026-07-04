import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, DELETE } from "@/app/api/estimates/[id]/route";
import { createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    phaseEstimate: {
      findFirst: mockFindFirst,
      delete: mockDelete,
    },
  },
}));

const OWNER_USER_ID = "user-1";

describe("GET /api/estimates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns estimate with line items if user owns it", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    const estimate = {
      id: "e1",
      phaseId: "p1",
      supplier: null,
      notes: null,
      lineItems: [
        { id: "li1", description: "Concrete", uom: "m3", quantity: 10, ratePerUnit: 150, total: 1500 },
      ],
      phase: { id: "p1", name: "Foundation" },
    };
    mockFindFirst.mockResolvedValue(estimate);

    const params = createParams("e1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(estimate);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "e1", phase: { site: { client: { userId: OWNER_USER_ID } } } },
      include: { lineItems: true, phase: { select: { id: true, name: true } } },
    });
  });

  it("returns 404 for another user's estimate", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("e-other");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("e1");
    const res = await GET(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/estimates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own estimate", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue({ id: "e1", phaseId: "p1" });
    mockDelete.mockResolvedValue({ id: "e1" });

    const params = createParams("e1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("returns 404 for another user's estimate", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, name: "Test", email: "test@example.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("e-other");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const params = createParams("e1");
    const res = await DELETE(createGetRequest(), { params });

    expect(res.status).toBe(401);
  });
});
