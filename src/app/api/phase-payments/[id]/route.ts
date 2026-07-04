import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const payment = await prisma.phasePayment.findFirst({
    where: {
      id,
      phase: { site: { client: { userId } } },
    },
    include: {
      phase: { select: { id: true, name: true, site: { select: { id: true, name: true } } } },
    },
  });

  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payment);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  try {
    const existing = await prisma.phasePayment.findFirst({
      where: {
        id,
        phase: { site: { client: { userId } } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const payment = await prisma.phasePayment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: parseFloat(data.amount) } : {}),
        ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  try {
    const existing = await prisma.phasePayment.findFirst({
      where: {
        id,
        phase: { site: { client: { userId } } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.phasePayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
