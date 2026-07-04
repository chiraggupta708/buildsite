import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/register/route";
import { createRequest } from "@/test/helpers";

// Mock auth — register doesn't use it but import resolves it
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("can register a new user", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-1",
      name: "Test",
      email: "test@example.com",
    });

    const req = createRequest({
      name: "Test",
      email: "test@example.com",
      password: "password123",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Test",
        email: "test@example.com",
        password: expect.any(String),
      },
    });
  });

  it("returns error for existing email", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing",
      email: "test@example.com",
    });

    const req = createRequest({
      name: "Test",
      email: "test@example.com",
      password: "password123",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Email already in use" });
  });

  it("returns error for missing email", async () => {
    const req = createRequest({
      name: "Test",
      password: "password123",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Email and password are required" });
  });

  it("returns error for missing password", async () => {
    const req = createRequest({
      name: "Test",
      email: "test@example.com",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Email and password are required" });
  });
});