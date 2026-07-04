/**
 * Test helpers for API route testing.
 *
 * Strategy: We mock the auth() and prisma modules at the module level.
 * This allows us to test Next.js App Router route handlers by calling
 * them as plain functions with mock Request objects.
 */

import { vi } from "vitest";
import type { MockedFunction } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? MockedFunction<(...args: A) => R>
    : T[K] extends object
      ? DeepMocked<T[K]>
      : T[K];
};

type PrismaClient = {
  user: {
    findUnique: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
  };
  client: {
    findMany: (...args: unknown[]) => unknown;
    findFirst: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
    count: (...args: unknown[]) => unknown;
  };
  site: {
    findMany: (...args: unknown[]) => unknown;
    findFirst: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
    count: (...args: unknown[]) => unknown;
  };
  labour: {
    findMany: (...args: unknown[]) => unknown;
    findFirst: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
    count: (...args: unknown[]) => unknown;
  };
  labourAssignment: {
    findMany: (...args: unknown[]) => unknown;
    findFirst: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
  };
};

export function createMockPrisma(): DeepMocked<PrismaClient> {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    site: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    labour: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    labourAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as DeepMocked<PrismaClient>;
}

// ---------------------------------------------------------------------------
// Mock auth session
// ---------------------------------------------------------------------------

export interface MockSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  expires?: string;
}

export function createAuthSession(userId = "user-1") {
  return Promise.resolve({
    user: { id: userId, name: "Test User", email: "test@example.com" },
    expires: "2099-01-01T00:00:00.000Z",
  } as MockSession);
}

export function createUnauthenticatedSession() {
  return Promise.resolve(null);
}

// ---------------------------------------------------------------------------
// Build Next.js Request objects
// ---------------------------------------------------------------------------

export function createRequest(
  body?: Record<string, unknown>,
  init?: RequestInit & { headers?: Record<string, string> },
): Request {
  const req = new Request("http://localhost:3000", {
    method: init?.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
  return req;
}

export function createGetRequest(url = "http://localhost:3000"): Request {
  return new Request(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Helper to make params Promise for route handlers
// ---------------------------------------------------------------------------

export function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

// ---------------------------------------------------------------------------
