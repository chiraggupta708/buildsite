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

  const purchase = await prisma.materialPurchase.findFirst({
    where: { id, site: { client: { userId } } },
    include: {
      usage: {
        select: { quantityUsed: true },
      },
    },
  });

  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(purchase);
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
    const existing = await prisma.materialPurchase.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const updateData: Record<string, unknown> = {};

    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.uom !== undefined) updateData.uom = data.uom;
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.ratePerUnit !== undefined) updateData.ratePerUnit = Number(data.ratePerUnit);
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold ? Number(data.lowStockThreshold) : null;

    // Auto-recalculate total if quantity or ratePerUnit changed
    const qty = updateData.quantity ?? existing.quantity;
    const rate = updateData.ratePerUnit ?? existing.ratePerUnit;
    updateData.total = Number(qty) * Number(rate);

    const purchase = await prisma.materialPurchase.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(purchase);
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
    const existing = await prisma.materialPurchase.findFirst({
      where: { id, site: { client: { userId } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete usage records first (cascade), then the purchase
    await prisma.materialUsage.deleteMany({ where: { materialPurchaseId: id } });
    await prisma.materialPurchase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
