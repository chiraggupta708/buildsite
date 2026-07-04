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

  const phase = await prisma.phase.findFirst({
    where: { id, site: { client: { userId } } },
    include: {
      site: { select: { id: true, name: true } },
      estimate: {
        include: { lineItems: true },
      },
      payments: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(phase);
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
    const existing = await prisma.phase.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const phase = await prisma.phase.update({
      where: { id },
      data: {
        name: data.name,
        order: data.order !== undefined ? data.order : undefined,
      },
    });
    return NextResponse.json(phase);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
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
    const existing = await prisma.phase.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.phase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}