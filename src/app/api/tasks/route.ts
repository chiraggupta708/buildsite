import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");

  if (!siteId)
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const where: Record<string, unknown> = { siteId, userId };
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        phase: { select: { id: true, name: true } },
        labour: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { title, description, status, order, siteId, phaseId, labourId } =
      body;

    if (!title || !siteId)
      return NextResponse.json(
        { error: "title and siteId are required" },
        { status: 400 }
      );

    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const maxOrder = await prisma.task.findFirst({
      where: { siteId, status: status || "todo" },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || "todo",
        order: order ?? (maxOrder ? maxOrder.order + 1 : 0),
        siteId,
        phaseId: phaseId || null,
        labourId: labourId || null,
        userId,
      },
      include: {
        phase: { select: { id: true, name: true } },
        labour: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}