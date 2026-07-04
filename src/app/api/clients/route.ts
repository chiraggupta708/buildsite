import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: { _count: { select: { sites: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { name, phone, email, address } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const client = await prisma.client.create({
      data: { name, phone, email, address, userId },
    });

    return NextResponse.json(client);
  } catch {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
