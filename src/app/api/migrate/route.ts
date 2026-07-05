// One-time schema migration — runs prisma db push via Neon connection
// Call: curl -X POST https://buildsite-nu.vercel.app/api/migrate
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({ ok: false, error: "No DB configured" }, { status: 400 });
  }

  try {
    const sql = neon(connectionString);

    // Drop all tables to re-create with correct column names
    await sql`DROP TABLE IF EXISTS "Reminder" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Task" CASCADE`;
    await sql`DROP TABLE IF EXISTS "PhasePayment" CASCADE`;
    await sql`DROP TABLE IF EXISTS "LabourPayment" CASCADE`;
    await sql`DROP TABLE IF EXISTS "MaterialUsage" CASCADE`;
    await sql`DROP TABLE IF EXISTS "MaterialPurchase" CASCADE`;
    await sql`DROP TABLE IF EXISTS "EstimateLineItem" CASCADE`;
    await sql`DROP TABLE IF EXISTS "PhaseEstimate" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Phase" CASCADE`;
    await sql`DROP TABLE IF EXISTS "LabourAssignment" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Labour" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Site" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Client" CASCADE`;
    await sql`DROP TABLE IF EXISTS "VerificationToken" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Session" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Account" CASCADE`;
    await sql`DROP TABLE IF EXISTS "User" CASCADE`;

    // Now create all tables with Prisma-compatible column names (camelCase)
    await sql`CREATE TABLE "User" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      "emailVerified" TIMESTAMPTZ,
      image TEXT,
      password TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE "Account" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, "providerAccountId")
    )`;
    await sql`CREATE INDEX "Account_userId_idx" ON "Account"("userId")`;

    await sql`CREATE TABLE "Session" (
      id TEXT PRIMARY KEY,
      "sessionToken" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX "Session_userId_idx" ON "Session"("userId")`;

    await sql`CREATE TABLE "VerificationToken" (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      UNIQUE(identifier, token)
    )`;

    await sql`CREATE TABLE "Client" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "Client_userId_idx" ON "Client"("userId")`;

    await sql`CREATE TABLE "Site" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'active',
      "startDate" TIMESTAMPTZ,
      "clientId" TEXT NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`CREATE TABLE "Labour" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      trade TEXT DEFAULT 'misc',
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "Labour_userId_idx" ON "Labour"("userId")`;

    await sql`CREATE TABLE "LabourAssignment" (
      id TEXT PRIMARY KEY,
      "labourId" TEXT NOT NULL REFERENCES "Labour"(id) ON DELETE CASCADE,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      "startDate" TIMESTAMPTZ,
      "endDate" TIMESTAMPTZ,
      status TEXT DEFAULT 'active',
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "LabourAssignment_labourId_idx" ON "LabourAssignment"("labourId")`;
    await sql`CREATE INDEX "LabourAssignment_siteId_idx" ON "LabourAssignment"("siteId")`;
    await sql`CREATE INDEX "LabourAssignment_userId_idx" ON "LabourAssignment"("userId")`;

    await sql`CREATE TABLE "Phase" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "order" INT NOT NULL,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "Phase_siteId_idx" ON "Phase"("siteId")`;
    await sql`CREATE INDEX "Phase_userId_idx" ON "Phase"("userId")`;

    await sql`CREATE TABLE "PhaseEstimate" (
      id TEXT PRIMARY KEY,
      "phaseId" TEXT UNIQUE NOT NULL REFERENCES "Phase"(id) ON DELETE CASCADE,
      supplier TEXT,
      notes TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "PhaseEstimate_phaseId_idx" ON "PhaseEstimate"("phaseId")`;

    await sql`CREATE TABLE "EstimateLineItem" (
      id TEXT PRIMARY KEY,
      "estimateId" TEXT NOT NULL REFERENCES "PhaseEstimate"(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      uom TEXT NOT NULL,
      quantity FLOAT NOT NULL,
      "ratePerUnit" FLOAT NOT NULL,
      total FLOAT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "EstimateLineItem_estimateId_idx" ON "EstimateLineItem"("estimateId")`;

    await sql`CREATE TABLE "MaterialPurchase" (
      id TEXT PRIMARY KEY,
      "itemName" TEXT NOT NULL,
      uom TEXT NOT NULL,
      quantity FLOAT NOT NULL,
      "ratePerUnit" FLOAT NOT NULL,
      total FLOAT NOT NULL,
      "purchaseDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      supplier TEXT,
      "lowStockThreshold" FLOAT,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "MaterialPurchase_siteId_idx" ON "MaterialPurchase"("siteId")`;
    await sql`CREATE INDEX "MaterialPurchase_userId_idx" ON "MaterialPurchase"("userId")`;
    await sql`CREATE INDEX "MaterialPurchase_itemName_idx" ON "MaterialPurchase"("itemName")`;

    await sql`CREATE TABLE "MaterialUsage" (
      id TEXT PRIMARY KEY,
      "quantityUsed" FLOAT NOT NULL,
      "dateUsed" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "materialPurchaseId" TEXT NOT NULL REFERENCES "MaterialPurchase"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "MaterialUsage_materialPurchaseId_idx" ON "MaterialUsage"("materialPurchaseId")`;

    await sql`CREATE TABLE "LabourPayment" (
      id TEXT PRIMARY KEY,
      "labourId" TEXT NOT NULL REFERENCES "Labour"(id) ON DELETE CASCADE,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      amount FLOAT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "LabourPayment_labourId_idx" ON "LabourPayment"("labourId")`;
    await sql`CREATE INDEX "LabourPayment_siteId_idx" ON "LabourPayment"("siteId")`;
    await sql`CREATE INDEX "LabourPayment_userId_idx" ON "LabourPayment"("userId")`;

    await sql`CREATE TABLE "PhasePayment" (
      id TEXT PRIMARY KEY,
      amount FLOAT NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      "phaseId" TEXT NOT NULL REFERENCES "Phase"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "PhasePayment_phaseId_idx" ON "PhasePayment"("phaseId")`;

    await sql`CREATE TABLE "Task" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      "order" INT DEFAULT 0,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      "phaseId" TEXT REFERENCES "Phase"(id) ON DELETE SET NULL,
      "labourId" TEXT REFERENCES "Labour"(id) ON DELETE SET NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "Task_siteId_status_idx" ON "Task"("siteId", status)`;
    await sql`CREATE INDEX "Task_userId_idx" ON "Task"("userId")`;

    await sql`CREATE TABLE "Reminder" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT,
      "dueDate" TIMESTAMPTZ NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      "siteId" TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX "Reminder_siteId_idx" ON "Reminder"("siteId")`;
    await sql`CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId")`;

    return NextResponse.json({ ok: true, message: "All tables created with correct camelCase columns" });
  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}