import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const assignments = await prisma.labourAssignment.findMany({
    where: { userId },
    include: { labour: true, site: { include: { client: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { labourId, siteId, startDate } = await req.json();
    if (!labourId || !siteId) {
      return NextResponse.json({ error: "Labour and site are required" }, { status: 400 });
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

    const assignment = await prisma.labourAssignment.create({
      data: {
        labourId,
        siteId,
        startDate: startDate ? new Date(startDate) : null,
        userId,
      },
    });

    return NextResponse.json(assignment);
  } catch {
    return NextResponse.json({ error: "Failed to assign labour" }, { status: 500 });
  }
}
