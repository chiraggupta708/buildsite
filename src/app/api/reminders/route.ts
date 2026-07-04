import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    const upcoming = url.searchParams.get("upcoming") === "true";

    const where: Record<string, unknown> = {
      site: { client: { userId } },
    };
    if (siteId) where.siteId = siteId;
    if (upcoming) where.done = false;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    // If upcoming filter, only show where dueDate >= now
    let filtered = reminders;
    if (upcoming) {
      const now = new Date();
      filtered = reminders.filter((r) => new Date(r.dueDate) >= now);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Failed to fetch reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { title, message, dueDate, siteId } = await req.json();
    if (!title || !dueDate || !siteId) {
      return NextResponse.json(
        { error: "Title, dueDate, and siteId are required" },
        { status: 400 }
      );
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        message: message || null,
        dueDate: new Date(dueDate),
        siteId,
        userId,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Failed to create reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}
