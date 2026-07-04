import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-compatible middleware — NO Prisma import (keeps under 1MB edge limit)
// Checks for the NextAuth session token cookie to determine auth state
// Full DB-backed auth happens in API routes and server components

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isOnAuth = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

  // Check for NextAuth session cookie (set after JWT-based login)
  const sessionCookie =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionCookie;

  if (isOnDashboard) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  if (isOnAuth) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)"],
};