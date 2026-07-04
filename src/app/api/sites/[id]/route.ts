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

  const site = await prisma.site.findFirst({
    where: { id, client: { userId } },
    include: {
      client: true,
      labourAssignments: {
        include: { labour: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(site);
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
    const existing = await prisma.site.findFirst({
      where: { id, client: { userId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const site = await prisma.site.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      },
    });
    return NextResponse.json(site);
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
    const existing = await prisma.site.findFirst({
      where: { id, client: { userId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
