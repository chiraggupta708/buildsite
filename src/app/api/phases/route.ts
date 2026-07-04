import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");

  const phases = await prisma.phase.findMany({
    where: {
      site: { client: { userId } },
      ...(siteId ? { siteId } : {}),
    },
    include: { estimate: { select: { id: true } } },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(phases);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { name, order, siteId } = await req.json();
    if (!name || siteId === undefined) {
      return NextResponse.json({ error: "Name and site are required" }, { status: 400 });
    }

    // Verify the site belongs to the user
    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const phase = await prisma.phase.create({
      data: { name, order: order ?? 0, siteId, userId },
    });

    return NextResponse.json(phase);
  } catch {
    return NextResponse.json({ error: "Failed to create phase" }, { status: 500 });
  }
}