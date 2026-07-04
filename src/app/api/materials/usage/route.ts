import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const data = await req.json();
    const { materialPurchaseId, quantityUsed, dateUsed } = data;

    if (!materialPurchaseId || quantityUsed == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify purchase ownership via site->client->userId chain
    const purchase = await prisma.materialPurchase.findFirst({
      where: { id: materialPurchaseId, site: { client: { userId } } },
      include: {
        usage: { select: { quantityUsed: true } },
      },
    });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Calculate remaining stock
    const totalConsumed = purchase.usage.reduce((sum, u) => sum + u.quantityUsed, 0);
    const remainingStock = purchase.quantity - totalConsumed;

    if (Number(quantityUsed) > remainingStock) {
      return NextResponse.json(
        { error: `Quantity used (${quantityUsed}) exceeds remaining stock (${remainingStock})` },
        { status: 400 }
      );
    }

    const usage = await prisma.materialUsage.create({
      data: {
        quantityUsed: Number(quantityUsed),
        dateUsed: dateUsed ? new Date(dateUsed) : undefined,
        materialPurchaseId,
      },
    });

    return NextResponse.json(usage, { status: 201 });
  } catch (error) {
    console.error("Failed to log usage:", error);
    return NextResponse.json({ error: "Failed to log usage" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const url = new URL(req.url);
    const materialPurchaseId = url.searchParams.get("materialPurchaseId");
    const siteId = url.searchParams.get("siteId");

    const where: Record<string, unknown> = {
      materialPurchase: { site: { client: { userId } } },
    };
    if (materialPurchaseId) {
      where.materialPurchaseId = materialPurchaseId;
    }
    if (siteId) {
      where.materialPurchase = { siteId };
    }

    const usage = await prisma.materialUsage.findMany({
      where,
      include: {
        materialPurchase: {
          select: { itemName: true, uom: true },
        },
      },
      orderBy: { dateUsed: "desc" },
    });

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
