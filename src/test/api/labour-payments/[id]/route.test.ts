import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/labour-payments/[id]/route";
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
    labourPayment: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const USER_ID = "user-1";

describe("GET /api/labour-payments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payment if user owns labour or site", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({
      id: "p1", amount: 500, labourId: "l1", siteId: "s1",
      labour: { id: "l1", name: "John" },
      site: { id: "s1", name: "Site A" },
    });

    const params = createParams("p1");
    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("p1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "p1" }),
      })
    );
  });

  it("returns 404 for another user's payment", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("p-other");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("p1");
    const res = await GET(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/labour-payments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own payment", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "p1", amount: 500, labourId: "l1" });
    mockUpdate.mockResolvedValue({ id: "p1", amount: 600 });

    const req = createRequest({ amount: 600 });
    const params = createParams("p1");
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.amount).toBe(600);
  });

  it("returns 404 for another user's payment", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest({ amount: 600 });
    const params = createParams("p-other");
    const res = await PUT(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest({ amount: 600 });
    const params = createParams("p1");
    const res = await PUT(req, { params });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/labour-payments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes own payment", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue({ id: "p1", amount: 500 });
    mockDelete.mockResolvedValue({ id: "p1" });

    const params = createParams("p1");
    const res = await DELETE(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 404 for another user's payment", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockFindFirst.mockResolvedValue(null);

    const params = createParams("p-other");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const params = createParams("p1");
    const res = await DELETE(createGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});