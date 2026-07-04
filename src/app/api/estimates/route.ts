import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { phaseId, supplier, notes, lineItems } = await req.json();
    if (!phaseId || !lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json({ error: "phaseId and lineItems are required" }, { status: 400 });
    }

    // Verify the phase belongs to the user
    const phase = await prisma.phase.findFirst({
      where: { id: phaseId, site: { client: { userId } } },
    });
    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Auto-calculate totals
    const items = lineItems.map((item: { description: string; uom: string; quantity: number; ratePerUnit: number }) => ({
      description: item.description,
      uom: item.uom,
      quantity: item.quantity,
      ratePerUnit: item.ratePerUnit,
      total: item.quantity * item.ratePerUnit,
    }));

    // Upsert: if estimate exists, update it + replace line items
    const estimate = await prisma.phaseEstimate.upsert({
      where: { phaseId },
      update: {
        supplier: supplier ?? null,
        notes: notes ?? null,
        lineItems: {
          deleteMany: {},
          create: items,
        },
      },
      create: {
        phaseId,
        supplier: supplier ?? null,
        notes: notes ?? null,
        lineItems: {
          create: items,
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json({ error: "Failed to save estimate" }, { status: 500 });
  }
}