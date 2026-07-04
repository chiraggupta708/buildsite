import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/clients/route";
import { createRequest, createGetRequest } from "@/test/helpers";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    client: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

describe("GET /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only authenticated user's clients", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const clients = [
      { id: "c1", name: "Client A", userId: "user-1", _count: { sites: 2 } },
    ];
    mockFindMany.mockResolvedValue(clients);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(clients);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { _count: { select: { sites: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });
});

describe("POST /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates client with session userId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });
    const created = {
      id: "c1",
      name: "New Client",
      phone: "123",
      email: "c@example.com",
      address: "Addr",
      userId: "user-1",
    };
    mockCreate.mockResolvedValue(created);

    const req = createRequest({
      name: "New Client",
      phone: "123",
      email: "c@example.com",
      address: "Addr",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "New Client",
        phone: "123",
        email: "c@example.com",
        address: "Addr",
        userId: "user-1",
      },
    });
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest({ name: "Client" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing name", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
    });

    const req = createRequest({ phone: "123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Name is required" });
  });
});