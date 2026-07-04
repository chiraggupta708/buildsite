import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const phaseId = searchParams.get("phaseId");

  const payments = await prisma.phasePayment.findMany({
    where: {
      phase: { site: { client: { userId } } },
      ...(phaseId ? { phaseId } : {}),
    },
    include: {
      phase: { select: { id: true, name: true, site: { select: { id: true, name: true } } } },
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
    const { phaseId, amount, date, notes } = await req.json();
    if (!phaseId || amount === undefined) {
      return NextResponse.json({ error: "phaseId and amount are required" }, { status: 400 });
    }

    // Verify phase belongs to user (phase -> site -> client -> userId)
    const phase = await prisma.phase.findFirst({
      where: { id: phaseId, site: { client: { userId } } },
    });
    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const payment = await prisma.phasePayment.create({
      data: {
        phaseId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
