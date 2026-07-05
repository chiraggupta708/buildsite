import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({ tables: [], error: "No DB configured" });
  }

  try {
    const sql = neon(connectionString);
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const counts: Record<string, number> = {};
    for (const t of tables) {
      const r = await sql`SELECT COUNT(*)::int as cnt FROM ${sql(t.table_name)}`;
      counts[t.table_name as string] = r[0]?.cnt ?? 0;
    }

    return NextResponse.json({ tables, counts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}