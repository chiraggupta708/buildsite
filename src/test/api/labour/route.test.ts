import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/labour/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    labour: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

describe("GET /api/labour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only user's labours", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const labours = [
      { id: "l1", name: "John", trade: "electrician", userId: "user-1" },
    ];
    mockFindMany.mockResolvedValue(labours);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(labours);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/labour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates labour with session userId and default trade", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockCreate.mockResolvedValue({
      id: "l1",
      name: "John",
      phone: "555",
      trade: "electrician",
      userId: "user-1",
    });

    const req = createRequest({ name: "John", phone: "555", trade: "electrician" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("John");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "John", phone: "555", trade: "electrician", userId: "user-1" },
    });
  });

  it("uses 'misc' as default trade when not provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    mockCreate.mockResolvedValue({
      id: "l1",
      name: "John",
      trade: "misc",
      userId: "user-1",
    });

    const req = createRequest({ name: "John" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "John", phone: undefined, trade: "misc", userId: "user-1" },
    });
  });

  it("returns 400 for missing name", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ trade: "carpenter" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Name is required" });
  });
});