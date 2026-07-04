import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const sites = await prisma.site.findMany({
    where: { client: { userId } },
    include: { client: true, _count: { select: { labourAssignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { name, address, startDate, clientId } = await req.json();
    if (!name || !clientId) {
      return NextResponse.json({ error: "Name and client are required" }, { status: 400 });
    }

    // Verify the client belongs to the user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const site = await prisma.site.create({
      data: {
        name,
        address,
        startDate: startDate ? new Date(startDate) : null,
        clientId,
      },
    });

    return NextResponse.json(site);
  } catch {
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 });
  }
}
