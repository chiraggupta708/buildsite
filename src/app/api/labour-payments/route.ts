import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const labourId = searchParams.get("labourId");
  const siteId = searchParams.get("siteId");

  const payments = await prisma.labourPayment.findMany({
    where: {
      userId,
      ...(labourId ? { labourId } : {}),
      ...(siteId ? { siteId } : {}),
    },
    include: {
      labour: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { labourId, siteId, amount, date, notes } = await req.json();
    if (!labourId || !siteId || amount === undefined) {
      return NextResponse.json({ error: "labourId, siteId, and amount are required" }, { status: 400 });
    }

    // Verify labour belongs to user
    const labour = await prisma.labour.findFirst({ where: { id: labourId, userId } });
    if (!labour) {
      return NextResponse.json({ error: "Labour not found" }, { status: 404 });
    }

    // Verify site belongs to user (through client)
    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const payment = await prisma.labourPayment.create({
      data: {
        labourId,
        siteId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        userId,
      },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
