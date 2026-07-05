import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
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
  ArrowLeft,
  DollarSign,
  Wrench,
  Package,
  Banknote,
  TrendingUp,
  TrendingDown,
  Minus,
  HardHat,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

type ItemSummary = {
  itemName: string;
  uom: string;
  totalQty: number;
  totalCost: number;
  avgRate: number;
  consumed: number;
  remaining: number;
};

type PurchaseForSummary = {
  itemName: string;
  uom: string;
  quantity: number;
  total: number;
  ratePerUnit: number;
  usage: { quantityUsed: number }[];
};

function computeSummary(purchases: PurchaseForSummary[]): ItemSummary[] {
  const grouped = new Map<string, { uom: string; qties: number[]; costs: number[]; rates: number[]; used: number[] }>();
  for (const p of purchases) {
    const key = p.itemName;
    const g = grouped.get(key) || { uom: p.uom, qties: [], costs: [], rates: [], used: [] };
    g.uom = p.uom;
    g.qties.push(p.quantity);
    g.costs.push(p.total);
    g.rates.push(p.ratePerUnit);
    g.used.push(p.usage.reduce((s, u) => s + u.quantityUsed, 0));
    grouped.set(key, g);
  }
  return Array.from(grouped.entries()).map(([name, g]) => ({
    itemName: name,
    uom: g.uom,
    totalQty: g.qties.reduce((s, q) => s + q, 0),
    totalCost: g.costs.reduce((s, c) => s + c, 0),
    avgRate: g.qties.length > 0 ? g.costs.reduce((s, c, i) => s + c, 0) / g.qties.reduce((s, q) => s + q, 0) : 0,
    consumed: g.used.reduce((s, u) => s + u, 0),
    remaining: g.qties.reduce((s, q, i) => s + q - g.used[i], 0),
  }));
}

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const { id } = await params;
  const site = await prisma.site.findFirst({
    where: { id, client: { userId } },
    include: {
      client: { select: { name: true } },
      phases: {
        include: {
          estimate: { include: { lineItems: true } },
          payments: true,
        },
        orderBy: { order: "asc" },
      },
      labourPayments: {
        include: { labour: { select: { trade: true } } },
      },
      materialPurchases: {
        include: { usage: { select: { quantityUsed: true } } },
      },
    },
  });

  if (!site) notFound();

  const totalLabourCost = site.labourPayments.reduce((s, p) => s + p.amount, 0);
  const totalMaterialCost = site.materialPurchases.reduce((s, p) => s + p.total, 0);
  const totalInvestment = totalLabourCost + totalMaterialCost;

  const allPhasePayments = site.phases.flatMap((p) => p.payments);
  const totalClientPayments = allPhasePayments.reduce((s, p) => s + p.amount, 0);

  // Estimate vs Actual by phase
  const phasesWithEstimates = site.phases.filter((p) => p.estimate);

  // Labour Cost Breakdown by Trade
  const tradeMap = new Map<string, { labours: Set<string>; totalPayments: number }>();
  for (const p of site.labourPayments) {
    const trade = p.labour.trade;
    const entry = tradeMap.get(trade) || { labours: new Set<string>(), totalPayments: 0 };
    entry.labours.add(p.labourId);
    entry.totalPayments += p.amount;
    tradeMap.set(trade, entry);
  }
  const tradeBreakdown = Array.from(tradeMap.entries())
    .map(([trade, data]) => ({
      trade,
      labourCount: data.labours.size,
      totalPayments: data.totalPayments,
    }))
    .sort((a, b) => b.totalPayments - a.totalPayments);

  // Material Breakdown (reuses computeSummary logic)
  const materialSummary = computeSummary(site.materialPurchases);

  function varianceBadge(estimated: number, paid: number) {
    const remaining = estimated - paid;
    if (paid >= estimated) {
      return { label: `₹${paid.toFixed(2)} — Fully paid`, color: "text-emerald-600", icon: TrendingUp };
    }
    const pct = ((paid / estimated) * 100).toFixed(0);
    return { label: `${pct}% paid (₹${remaining.toFixed(2)} remaining)`, color: "text-amber-600", icon: Minus };
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${site.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
          <p className="text-sm text-muted-foreground">Financial Dashboard</p>
        </div>
      </div>

      {/* Section 1: Total Investment Summary */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Total Investment Summary
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Labour Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalLabourCost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Material Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalMaterialCost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalInvestment.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Client Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalClientPayments.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Estimate vs Actual */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Estimate vs Actual
        </h2>
        {phasesWithEstimates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No estimates created yet for any phase
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {phasesWithEstimates.map((phase) => {
              const estimatedTotal = phase.estimate!.lineItems.reduce((s, li) => s + li.total, 0);
              const paymentsTotal = phase.payments.reduce((s, p) => s + p.amount, 0);
              const remaining = estimatedTotal - paymentsTotal;
              const { label, color, icon: VarianceIcon } = varianceBadge(estimatedTotal, paymentsTotal);

              return (
                <Card key={phase.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      <Badge variant={remaining <= 0 ? "default" : "secondary"}>
                        <VarianceIcon className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Description</TableHead>
                          <TableHead className="whitespace-nowrap hidden sm:table-cell">UOM</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                          <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Rate</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phase.estimate!.lineItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="whitespace-nowrap">{item.description}</TableCell>
                            <TableCell className="whitespace-nowrap hidden sm:table-cell">{item.uom}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{item.quantity}</TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden sm:table-cell">₹{item.ratePerUnit.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">₹{item.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-end gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimated: </span>
                        <span className="font-semibold">₹{estimatedTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="font-semibold text-emerald-600">₹{paymentsTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{remaining <= 0 ? "Overpaid: " : "Remaining: "}</span>
                        <span className={`font-semibold ${remaining <= 0 ? "text-destructive" : "text-amber-600"}`}>
                          ₹{Math.abs(remaining).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Labour Cost Breakdown by Trade */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <HardHat className="h-5 w-5" />
          Labour Cost by Trade
        </h2>
        {tradeBreakdown.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No labour payments recorded yet
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Trade</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Labours</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeBreakdown.map((trade) => (
                  <TableRow key={trade.trade}>
                    <TableCell className="font-medium whitespace-nowrap">{trade.trade}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{trade.labourCount}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">₹{trade.totalPayments.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold whitespace-nowrap">Total</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {tradeBreakdown.reduce((s, t) => s + t.labourCount, 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{tradeBreakdown.reduce((s, t) => s + t.totalPayments, 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Section 4: Material Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Material Breakdown
        </h2>
        {materialSummary.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No material purchases recorded yet
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Avg Rate</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialSummary.map((item) => (
                  <TableRow key={item.itemName}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell className="text-right">{item.totalQty}</TableCell>
                    <TableCell className="text-right">₹{item.totalCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{item.avgRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.consumed}</TableCell>
                    <TableCell className="text-right">{item.remaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}