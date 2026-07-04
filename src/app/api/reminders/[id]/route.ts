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

  const reminder = await prisma.reminder.findFirst({
    where: { id, site: { client: { userId } } },
  });

  if (!reminder)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(reminder);
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
    const existing = await prisma.reminder.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.done !== undefined) updateData.done = data.done;

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Failed to update reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
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
    const existing = await prisma.reminder.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
