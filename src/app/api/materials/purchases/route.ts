import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const data = await req.json();
    const { itemName, uom, quantity, ratePerUnit, purchaseDate, supplier, lowStockThreshold, siteId } = data;

    if (!itemName || !uom || quantity == null || ratePerUnit == null || !siteId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, client: { userId } },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const total = Number(quantity) * Number(ratePerUnit);

    const purchase = await prisma.materialPurchase.create({
      data: {
        itemName,
        uom,
        quantity: Number(quantity),
        ratePerUnit: Number(ratePerUnit),
        total,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        supplier: supplier || null,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        siteId,
        userId,
      },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase:", error);
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");

    const where: Record<string, unknown> = {
      site: { client: { userId } },
    };
    if (siteId) {
      where.siteId = siteId;
    }

    const purchases = await prisma.materialPurchase.findMany({
      where,
      include: {
        usage: {
          select: { quantityUsed: true },
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Failed to fetch purchases:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}
