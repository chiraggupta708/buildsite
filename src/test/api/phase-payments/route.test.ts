import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/phase-payments/route";
import { createRequest, createGetRequest, createParams } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockPhaseFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    phasePayment: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    phase: {
      findFirst: mockPhaseFindFirst,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/phase-payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payments scoped to user via phase chain", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindMany.mockResolvedValue([
      { id: "pp1", amount: 10000, phaseId: "ph1", phase: { id: "ph1", name: "Foundation", site: { id: "s1", name: "Site A" } } },
    ]);

    const req = new Request("http://localhost/api/phase-payments");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          phase: { site: { client: { userId: USER_ID } } },
        }),
      })
    );
  });

  it("filters by phaseId", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/phase-payments?phaseId=ph1");
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ phaseId: "ph1" }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/phase-payments"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/phase-payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates payment with verified phase ownership", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPhaseFindFirst.mockResolvedValue({ id: "ph1", siteId: "s1" });
    mockCreate.mockResolvedValue({ id: "pp1", phaseId: "ph1", amount: 10000 });

    const req = createRequest({ phaseId: "ph1", amount: 10000 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("pp1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 10000 }),
      })
    );
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ phaseId: "ph1", amount: 5000 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = createRequest({ phaseId: "ph1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's phase", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPhaseFindFirst.mockResolvedValue(null);

    const req = createRequest({ phaseId: "ph-other", amount: 5000 });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});