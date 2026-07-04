import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const labours = await prisma.labour.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(labours);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { name, phone, trade } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const labour = await prisma.labour.create({
      data: { name, phone, trade: trade || "misc", userId },
    });

    return NextResponse.json(labour);
  } catch {
    return NextResponse.json({ error: "Failed to create labour" }, { status: 500 });
  }
}
