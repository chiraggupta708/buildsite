import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id, site: { client: { userId } } },
      include: {
        phase: { select: { id: true, name: true } },
        labour: { select: { id: true, name: true } },
      },
    });
    if (!task)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description:
          data.description !== undefined ? data.description : undefined,
        status: data.status !== undefined ? data.status : undefined,
        order: data.order !== undefined ? data.order : undefined,
        phaseId: data.phaseId !== undefined ? data.phaseId : null,
        labourId: data.labourId !== undefined ? data.labourId : null,
      },
      include: {
        phase: { select: { id: true, name: true } },
        labour: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}