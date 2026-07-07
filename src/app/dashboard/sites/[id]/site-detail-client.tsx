"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  HardHat,
  Layers,
  ShoppingCart,
  Plus,
  DollarSign,
  AlertTriangle,
  IndianRupee,
  Package,
} from "lucide-react";
import { AssignLabourDialog } from "./assign-labour-dialog";
import { RecordPaymentSheet } from "./record-payment-sheet";
import { AddPhaseSheet } from "./add-phase-sheet";
import { RecordPurchaseSheet } from "./record-purchase-sheet";

/* ---------- Types ---------- */

type LabourAssignmentData = {
  id: string;
  labourId: string;
  labour: { id: string; name: string; trade: string; phone: string | null };
  status: string;
  startDate: string | null;
  endDate: string | null;
  payments: { amount: number }[];
};

type PhaseData = {
  id: string;
  name: string;
  order: number;
  estimateTotal: number | null;
  payments: { amount: number }[];
};

type MaterialPurchaseData = {
  id: string;
  itemName: string;
  uom: string;
  quantity: number;
  total: number;
  purchaseDate: string;
  supplier: string | null;
  lowStockThreshold: number | null;
  usage: { quantityUsed: number }[];
};

type SiteDetailClientProps = {
  siteId: string;
  siteName: string;
  siteStatus: string;
  clientName: string;
  clientAddress: string | null;
  startDate: string | null;
  labourAssignments: LabourAssignmentData[];
  phases: PhaseData[];
  materialPurchases: MaterialPurchaseData[];
};

/* ---------- Helpers ---------- */

function getPaymentStatusBadge(estimateTotal: number | null, paidTotal: number) {
  if (!estimateTotal || estimateTotal === 0) {
    return <Badge variant="outline">No estimate</Badge>;
  }
  const pct = Math.round((paidTotal / estimateTotal) * 100);
  if (pct >= 100) {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-700">
        Fully Paid
      </Badge>
    );
  }
  if (pct >= 60) {
    return (
      <Badge className="bg-amber-500 text-white hover:bg-amber-600">
        {pct}% Paid
      </Badge>
    );
  }
  return (
    <Badge className="bg-orange-500 text-white hover:bg-orange-600">
      Pending
    </Badge>
  );
}

function UsageBar({ pct }: { pct: number }) {
  const color =
    pct < 50 ? "bg-green-500" : pct < 85 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

/* ---------- Component ---------- */

export function SiteDetailClient(props: SiteDetailClientProps) {
  const router = useRouter();
  const [paymentSheetLabour, setPaymentSheetLabour] = useState<{
    labourId: string;
    labourName: string;
    balanceDue: number;
    rate: number;
  } | null>(null);
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [recordPurchaseOpen, setRecordPurchaseOpen] = useState(false);

  /* ------ Computed values ------ */

  const totalBudget = useMemo(
    () => props.phases.reduce((s, p) => s + (p.estimateTotal ?? 0), 0),
    [props.phases]
  );
  const totalPhasePaid = useMemo(
    () =>
      props.phases.reduce(
        (s, p) => s + p.payments.reduce((ps, pp) => ps + pp.amount, 0),
        0
      ),
    [props.phases]
  );
  const totalMaterialCost = useMemo(
    () => props.materialPurchases.reduce((s, m) => s + m.total, 0),
    [props.materialPurchases]
  );
  const totalSpent = totalPhasePaid + totalMaterialCost;
  const budgetPct =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const activeLaboursCount = useMemo(
    () =>
      props.labourAssignments.filter((la) => la.status === "active").length,
    [props.labourAssignments]
  );

  // Low stock items: purchases where remaining <= threshold
  const lowStockItems = useMemo(
    () =>
      props.materialPurchases.filter((mp) => {
        if (!mp.lowStockThreshold) return false;
        const consumed = mp.usage.reduce((s, u) => s + u.quantityUsed, 0);
        const remaining = mp.quantity - consumed;
        return remaining <= mp.lowStockThreshold;
      }),
    [props.materialPurchases]
  );

  // Pending payments: unpaid labour payments (balance > 0)
  const pendingPaymentsAmt = useMemo(
    () =>
      props.labourAssignments.reduce((total, la) => {
        const paid = la.payments.reduce((s, p) => s + p.amount, 0);
        // Rate is 0 since not in schema — pending payments shown as total due
        const totalDue = 0; // no rate data
        const balance = totalDue - paid;
        return total + (balance > 0 ? balance : 0);
      }, 0),
    [props.labourAssignments]
  );

  // Item summaries for materials tab
  const itemSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        itemName: string;
        uom: string;
        totalQty: number;
        totalCost: number;
        consumed: number;
      }
    >();
    for (const mp of props.materialPurchases) {
      const existing = map.get(mp.itemName);
      const consumed = mp.usage.reduce((s, u) => s + u.quantityUsed, 0);
      if (existing) {
        existing.totalQty += mp.quantity;
        existing.totalCost += mp.total;
        existing.consumed += consumed;
      } else {
        map.set(mp.itemName, {
          itemName: mp.itemName,
          uom: mp.uom,
          totalQty: mp.quantity,
          totalCost: mp.total,
          consumed,
        });
      }
    }
    return Array.from(map.values());
  }, [props.materialPurchases]);

  return (
    <div className="space-y-6">
      {/* ===== Tabs ===== */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="pt-4 space-y-6">
          {/* Budget vs Actual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Budget vs Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-muted-foreground">
                  Budget: ₹{totalBudget.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  Spent: ₹{totalSpent.toFixed(2)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPct >= 100
                      ? "bg-red-500"
                      : budgetPct >= 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {budgetPct}% of budget used
              </p>
            </CardContent>
          </Card>

          {/* 2x2 Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Active Labours */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                  <HardHat className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeLaboursCount}</p>
                  <p className="text-xs text-muted-foreground">
                    Active Labours
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lowStockItems.length}</p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </div>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full bg-red-50 p-2 dark:bg-red-950">
                  <DollarSign className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">
                    ₹{totalPhasePaid > 0
                      ? (props.phases.reduce((s, p) => s + (p.estimateTotal ?? 0), 0) - totalPhasePaid).toFixed(0)
                      : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pending Payments
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Add Phase */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setAddPhaseOpen(true)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                  <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Add Phase</p>
                  <p className="text-xs text-muted-foreground">
                    New project phase
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phases List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Phases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {props.phases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No phases yet</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add a phase to break down this project
                  </p>
                  <Button size="sm" onClick={() => setAddPhaseOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Phase
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {props.phases.map((phase) => {
                    const paidAmount = phase.payments.reduce(
                      (s, p) => s + p.amount,
                      0
                    );
                    const dueAmount = phase.estimateTotal
                      ? Math.max(phase.estimateTotal - paidAmount, 0)
                      : 0;
                    return (
                      <div
                        key={phase.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {phase.order}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{phase.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Est: ₹
                              {phase.estimateTotal !== null
                                ? phase.estimateTotal.toFixed(2)
                                : "—"}{" "}
                              · Paid: ₹{paidAmount.toFixed(2)}
                              {dueAmount > 0 && (
                                <span className="text-red-500">
                                  {" "}
                                  · Due: ₹{dueAmount.toFixed(2)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div>
                          {getPaymentStatusBadge(
                            phase.estimateTotal,
                            paidAmount
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LABOUR TAB ==================== */}
        <TabsContent value="labour" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HardHat className="h-5 w-5" />
              Assigned Labours
            </h2>
            <AssignLabourDialog siteId={props.siteId} />
          </div>

          {props.labourAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <HardHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No labours assigned</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Assign labourers to work on this site
                </p>
                <AssignLabourDialog siteId={props.siteId} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {props.labourAssignments.map((la) => {
                const totalPaid = la.payments.reduce((s, p) => s + p.amount, 0);
                // Days worked computed from startDate to now if still active
                const daysWorked = la.startDate
                  ? Math.max(
                      Math.floor(
                        (new Date().getTime() -
                          new Date(la.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ),
                      0
                    )
                  : 0;
                const rate = 0; // No rate field in schema
                const totalDue = daysWorked * rate;
                const balance = Math.max(totalDue - totalPaid, 0);

                return (
                  <Card key={la.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">👤</span>
                          <CardTitle className="text-base">
                            {la.labour.name}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={
                            la.status === "active" ? "default" : "secondary"
                          }
                          className={
                            la.status === "active"
                              ? "bg-green-600 text-white"
                              : la.status === "completed"
                                ? "bg-blue-600 text-white"
                                : ""
                          }
                        >
                          {la.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <Badge variant="outline">{la.labour.trade}</Badge>
                        {la.startDate && (
                          <p className="text-muted-foreground mt-2">
                            Since{" "}
                            {new Date(la.startDate).toLocaleDateString()}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Days worked:
                          </span>
                          <span>{daysWorked}</span>
                          <span className="text-muted-foreground">
                            Rate/day:
                          </span>
                          <span>₹{rate.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            Total due:
                          </span>
                          <span>₹{totalDue.toFixed(2)}</span>
                          <span className="text-muted-foreground">Paid:</span>
                          <span>₹{totalPaid.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            Balance:
                          </span>
                          <span
                            className={
                              balance > 0 ? "text-red-500 font-medium" : ""
                            }
                          >
                            ₹{balance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setPaymentSheetLabour({
                            labourId: la.labourId,
                            labourName: la.labour.name,
                            balanceDue: balance,
                            rate,
                          })
                        }
                      >
                        <DollarSign className="mr-1 h-4 w-4" />
                        Record Payment
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ==================== MATERIALS TAB ==================== */}
        <TabsContent value="materials" className="pt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materials &amp; Stock
            </h2>
            <Button size="sm" onClick={() => setRecordPurchaseOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Record Purchase
            </Button>
          </div>

          {props.materialPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No materials yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Record material purchases for this site
                </p>
                <Button size="sm" onClick={() => setRecordPurchaseOpen(true)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Record Purchase
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Item Stock Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {itemSummaries.map((item) => {
                  const remaining = item.totalQty - item.consumed;
                  const pct =
                    item.totalQty > 0
                      ? (item.consumed / item.totalQty) * 100
                      : 0;
                  return (
                    <Card key={item.itemName}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{item.itemName}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.uom}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <span className="text-muted-foreground">
                            Purchased:
                          </span>
                          <span>{item.totalQty}</span>
                          <span className="text-muted-foreground">
                            Remaining:
                          </span>
                          <span>{remaining}</span>
                          <span className="text-muted-foreground">
                            Total Cost:
                          </span>
                          <span>₹{item.totalCost.toFixed(2)}</span>
                        </div>
                        <UsageBar pct={pct} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Separator />

              {/* Recent Purchases */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Recent Purchases
                </h3>
                <div className="divide-y rounded-lg border">
                  {props.materialPurchases.map((mp) => {
                    const consumed = mp.usage.reduce(
                      (s, u) => s + u.quantityUsed,
                      0
                    );
                    const remaining = mp.quantity - consumed;
                    const isLow =
                      mp.lowStockThreshold != null &&
                      remaining <= mp.lowStockThreshold;
                    return (
                      <div
                        key={mp.id}
                        className={`flex items-center justify-between px-4 py-3 ${
                          isLow ? "bg-red-50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {mp.itemName}
                            {mp.supplier && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({mp.supplier})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mp.quantity} {mp.uom} · ₹{mp.total.toFixed(2)} ·{" "}
                            {new Date(mp.purchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{remaining}</p>
                          <p
                            className={`text-xs ${
                              isLow
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isLow ? "Low stock" : `${mp.quantity} qty`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== Bottom Sheets ===== */}
      <RecordPaymentSheet
        siteId={props.siteId}
        labourId={paymentSheetLabour?.labourId ?? ""}
        labourName={paymentSheetLabour?.labourName ?? ""}
        balanceDue={paymentSheetLabour?.balanceDue ?? 0}
        rate={paymentSheetLabour?.rate ?? 0}
        open={!!paymentSheetLabour}
        onOpenChange={(open) => {
          if (!open) setPaymentSheetLabour(null);
        }}
      />

      <AddPhaseSheet
        siteId={props.siteId}
        open={addPhaseOpen}
        onOpenChange={setAddPhaseOpen}
      />

      <RecordPurchaseSheet
        siteId={props.siteId}
        open={recordPurchaseOpen}
        onOpenChange={setRecordPurchaseOpen}
      />
    </div>
  );
}