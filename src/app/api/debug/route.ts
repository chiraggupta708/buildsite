import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    POSTGRES_URL: process.env.POSTGRES_URL ? "✅ set" : "❌ missing",
    DATABASE_URL: process.env.DATABASE_URL ? "✅ set" : "❌ missing",
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? "✅ set" : "❌ missing",
    AUTH_SECRET: process.env.AUTH_SECRET ? "✅ set" : "❌ missing",
  });
}