// One-time schema migration endpoint
// Call: curl -X POST https://buildsite-nu.vercel.app/api/migrate
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json(
      { ok: false, error: "No database connection configured" },
      { status: 400 }
    );
  }

  try {
    const sql = neon(connectionString);

    // Each statement MUST be a separate call (no multi-statement)
    await sql`CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      email_verified TIMESTAMPTZ,
      image TEXT,
      password TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS "Account" (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, provider_account_id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "Session" (
      id TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "VerificationToken" (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      UNIQUE(identifier, token)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS "Client" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Client_userId_idx" ON "Client"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "Site" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'active',
      start_date TIMESTAMPTZ,
      client_id TEXT NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS "Labour" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      trade TEXT DEFAULT 'misc',
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Labour_userId_idx" ON "Labour"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "LabourAssignment" (
      id TEXT PRIMARY KEY,
      labour_id TEXT NOT NULL REFERENCES "Labour"(id) ON DELETE CASCADE,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      status TEXT DEFAULT 'active',
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourAssignment_labourId_idx" ON "LabourAssignment"(labour_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourAssignment_siteId_idx" ON "LabourAssignment"(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourAssignment_userId_idx" ON "LabourAssignment"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "Phase" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "order" INT NOT NULL,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Phase_siteId_idx" ON "Phase"(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "Phase_userId_idx" ON "Phase"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "PhaseEstimate" (
      id TEXT PRIMARY KEY,
      phase_id TEXT UNIQUE NOT NULL REFERENCES "Phase"(id) ON DELETE CASCADE,
      supplier TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "PhaseEstimate_phaseId_idx" ON "PhaseEstimate"(phase_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "EstimateLineItem" (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES "PhaseEstimate"(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      uom TEXT NOT NULL,
      quantity FLOAT NOT NULL,
      rate_per_unit FLOAT NOT NULL,
      total FLOAT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "EstimateLineItem_estimateId_idx" ON "EstimateLineItem"(estimate_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "MaterialPurchase" (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      uom TEXT NOT NULL,
      quantity FLOAT NOT NULL,
      rate_per_unit FLOAT NOT NULL,
      total FLOAT NOT NULL,
      purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      supplier TEXT,
      low_stock_threshold FLOAT,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "MaterialPurchase_siteId_idx" ON "MaterialPurchase"(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "MaterialPurchase_userId_idx" ON "MaterialPurchase"(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "MaterialPurchase_itemName_idx" ON "MaterialPurchase"(item_name)`;

    await sql`CREATE TABLE IF NOT EXISTS "MaterialUsage" (
      id TEXT PRIMARY KEY,
      quantity_used FLOAT NOT NULL,
      date_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      material_purchase_id TEXT NOT NULL REFERENCES "MaterialPurchase"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "MaterialUsage_materialPurchaseId_idx" ON "MaterialUsage"(material_purchase_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "LabourPayment" (
      id TEXT PRIMARY KEY,
      labour_id TEXT NOT NULL REFERENCES "Labour"(id) ON DELETE CASCADE,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      amount FLOAT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourPayment_labourId_idx" ON "LabourPayment"(labour_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourPayment_siteId_idx" ON "LabourPayment"(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "LabourPayment_userId_idx" ON "LabourPayment"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "PhasePayment" (
      id TEXT PRIMARY KEY,
      amount FLOAT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      phase_id TEXT NOT NULL REFERENCES "Phase"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "PhasePayment_phaseId_idx" ON "PhasePayment"(phase_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "Task" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      "order" INT DEFAULT 0,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      phase_id TEXT REFERENCES "Phase"(id) ON DELETE SET NULL,
      labour_id TEXT REFERENCES "Labour"(id) ON DELETE SET NULL,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Task_siteId_status_idx" ON "Task"(site_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS "Reminder" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT,
      due_date TIMESTAMPTZ NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS "Reminder_siteId_idx" ON "Reminder"(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "Reminder_userId_idx" ON "Reminder"(user_id)`;

    return NextResponse.json({ ok: true, message: "All tables created successfully" });
  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Migration failed" },
      { status: 500 }
    );
  }
}