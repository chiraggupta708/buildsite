import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  PackageOpen,
  ArrowUpDown,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { AddPurchaseDialog } from "./add-purchase-dialog";
import { EditPurchaseDialog, DeletePurchaseButton } from "./purchase-actions";
import { LogUsageDialog } from "./log-usage-dialog";

type MaterialPurchaseWithUsage = {
  id: string;
  itemName: string;
  uom: string;
  quantity: number;
  ratePerUnit: number;
  total: number;
  purchaseDate: Date;
  supplier: string | null;
  lowStockThreshold: number | null;
  siteId: string;
  usage: { quantityUsed: number }[];
};

// Client-side Purchase type (dates as string after serialization)
type Purchase = {
  id: string;
  itemName: string;
  uom: string;
  quantity: number;
  ratePerUnit: number;
  total: number;
  purchaseDate: string | Date;
  supplier: string | null;
  lowStockThreshold: number | null;
  usage: { quantityUsed: number }[];
};

type ItemSummary = {
  itemName: string;
  uom: string;
  totalQty: number;
  totalCost: number;
  avgRate: number;
  consumed: number;
  remaining: number;
};

function computeSummary(purchases: Purchase[]): ItemSummary[] {
  const grouped: Record<string, { uom: string; quantities: number[]; totals: number[]; rates: number[]; consumptions: number[] }> = {};

  for (const p of purchases) {
    if (!grouped[p.itemName]) {
      grouped[p.itemName] = { uom: p.uom, quantities: [], totals: [], rates: [], consumptions: [] };
    }
    const g = grouped[p.itemName];
    g.quantities.push(p.quantity);
    g.totals.push(p.total);
    g.rates.push(p.ratePerUnit);
    const consumed = p.usage.reduce((s, u) => s + u.quantityUsed, 0);
    g.consumptions.push(consumed);
  }

  return Object.entries(grouped).map(([itemName, g]) => {
    const totalQty = g.quantities.reduce((a, b) => a + b, 0);
    const totalCost = g.totals.reduce((a, b) => a + b, 0);
    const totalRate = g.rates.reduce((a, b) => a + b, 0);
    const consumed = g.consumptions.reduce((a, b) => a + b, 0);
    return {
      itemName,
      uom: g.uom,
      totalQty,
      totalCost,
      avgRate: g.rates.length > 0 ? totalRate / g.rates.length : 0,
      consumed,
      remaining: totalQty - consumed,
    };
  });
}

export async function MaterialsSection({ siteId }: { siteId: string }) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const purchases = await prisma.materialPurchase.findMany({
    where: { siteId, site: { client: { userId } } },
    include: {
      usage: { select: { quantityUsed: true } },
    },
    orderBy: { purchaseDate: "desc" },
  }) as unknown as MaterialPurchaseWithUsage[];

  // Serialize dates to strings for client components
  const serialized: Purchase[] = purchases.map((p) => ({
    ...p,
    purchaseDate: p.purchaseDate.toISOString(),
  }));

  const summary = computeSummary(serialized);

  const isLowStock = (item: ItemSummary) => {
    // Check if any purchase of this item has a threshold and remaining is below it
    const relevantPurchases = purchases.filter((p) => p.itemName === item.itemName);
    return relevantPurchases.some(
      (p) => p.lowStockThreshold != null && item.remaining <= p.lowStockThreshold
    );
  };

  return (
    <div className="space-y-6">
      {/* Per-Item Summary */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <PackageOpen className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Materials Summary</h2>
        </div>
        {summary.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No materials yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add material purchases for this site
              </p>
              <AddPurchaseDialog siteId={siteId} />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Total Purchased</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Avg Rate</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((item) => (
                  <TableRow key={item.itemName}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.itemName}
                        {isLowStock(item) && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell className="text-right">{item.totalQty}</TableCell>
                    <TableCell className="text-right">
                      ₹{item.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.avgRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{item.consumed}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isLowStock(item) ? "text-destructive font-medium" : ""
                        }
                      >
                        {item.remaining}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Purchase History</h2>
          </div>
          <AddPurchaseDialog siteId={siteId} />
        </div>

        {purchases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No purchases yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first material purchase
              </p>
              <AddPurchaseDialog siteId={siteId} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => {
              const consumed = purchase.usage.reduce((s, u) => s + u.quantityUsed, 0);
              const remaining = purchase.quantity - consumed;
              const isLow = purchase.lowStockThreshold != null && remaining <= purchase.lowStockThreshold;

              return (
                <Card key={purchase.id} className={isLow ? "border-destructive/50" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{purchase.itemName}</CardTitle>
                        {isLow && (
                          <Badge variant="destructive" className="text-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <EditPurchaseDialog purchase={purchase}>
                          <Button variant="ghost" size="icon-sm">
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </EditPurchaseDialog>
                        <DeletePurchaseButton purchaseId={purchase.id} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Qty:</span>{" "}
                          {purchase.quantity} {purchase.uom}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate:</span> ₹
                          ₹{purchase.ratePerUnit.toFixed(2)}/{purchase.uom}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span> ₹
                          ₹{purchase.total.toFixed(2)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Supplier:</span>{" "}
                          {purchase.supplier || "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <span className="text-muted-foreground">Date:</span>{" "}
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Remaining:</span>{" "}
                          <span className={isLow ? "text-destructive font-medium" : ""}>
                            {remaining} {purchase.uom}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <LogUsageDialog purchase={purchase} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}