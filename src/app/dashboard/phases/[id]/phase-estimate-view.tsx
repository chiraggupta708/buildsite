"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign, FileText, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { RecordPhasePaymentDialog } from "./record-phase-payment-dialog";

type LineItem = {
  id?: string;
  description: string;
  uom: string;
  quantity: number;
  ratePerUnit: number;
  total: number;
};

type Estimate = {
  id: string;
  supplier: string | null;
  notes: string | null;
  lineItems: LineItem[];
};

type PhasePayment = {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
};

type Phase = {
  id: string;
  name: string;
  order: number;
  site: { id: string; name: string };
  estimate: Estimate | null;
  payments: PhasePayment[];
};

export function PhaseEstimateView({ phaseId }: { phaseId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estLoading, setEstLoading] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", uom: "", quantity: 0, ratePerUnit: 0, total: 0 },
  ]);

  const loadPhase = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/phases/${phaseId}`);
    if (res.ok) {
      setPhase(await res.json());
    }
    setLoading(false);
  }, [phaseId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPhase();
    });
  }, [loadPhase]);

  function openEstimateDialog() {
    if (phase?.estimate) {
      setLineItems(
        phase.estimate.lineItems.map((li) => ({
          description: li.description,
          uom: li.uom,
          quantity: li.quantity,
          ratePerUnit: li.ratePerUnit,
          total: li.total,
        }))
      );
    } else {
      setLineItems([
        { description: "", uom: "", quantity: 0, ratePerUnit: 0, total: 0 },
      ]);
    }
    setEstimateOpen(true);
  }

  function updateLineItem(
    index: number,
    field: keyof LineItem,
    value: string | number
  ) {
    setLineItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const newItem = { ...item, [field]: value };
        if (field === "quantity" || field === "ratePerUnit") {
          newItem.total =
            (field === "quantity"
              ? Number(value)
              : item.quantity) *
            (field === "ratePerUnit"
              ? Number(value)
              : item.ratePerUnit);
        }
        return newItem;
      });
      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", uom: "", quantity: 0, ratePerUnit: 0, total: 0 },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      phaseId,
      supplier: (form.get("supplier") as string) || null,
      notes: (form.get("notes") as string) || null,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        uom: li.uom,
        quantity: li.quantity,
        ratePerUnit: li.ratePerUnit,
      })),
    };

    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Estimate saved");
      setEstimateOpen(false);
      loadPhase();
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save estimate");
    }
    setEstLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Phase not found</p>
      </div>
    );
  }

  const grandTotal = phase.estimate
    ? phase.estimate.lineItems.reduce((sum, li) => sum + li.total, 0)
    : 0;

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{phase.name}</h1>
        <p className="text-sm text-muted-foreground">
          Site: {phase.site.name}
        </p>
      </div>

      <div className="section-header">
        <h2 className="text-xl font-semibold">Estimate</h2>
        <Button size="sm" onClick={openEstimateDialog}>
          <DollarSign className="mr-2 h-4 w-4" />
          {phase.estimate ? "Edit Estimate" : "Create Estimate"}
        </Button>
      </div>

      {!phase.estimate ? (
        <Card>
          <CardContent className="empty-state">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No estimate yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a locked quote with line-item estimates
            </p>
            <Button size="sm" onClick={openEstimateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Estimate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(phase.estimate.supplier || phase.estimate.notes) && (
            <Card>
              <CardContent className="py-4 space-y-2">
                {phase.estimate.supplier && (
                  <p className="text-sm">
                    <span className="font-medium">Supplier:</span>{" "}
                    {phase.estimate.supplier}
                  </p>
                )}
                {phase.estimate.notes && (
                  <p className="text-sm">
                    <span className="font-medium">Notes:</span>{" "}
                    {phase.estimate.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">UOM</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Rate/Unit</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {phase.estimate.lineItems.map((item, i) => (
                  <tr key={item.id || i} className="border-b last:border-0">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3">{item.uom}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      ₹{item.ratePerUnit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Client Payments Section */}
      <div className="section-header">
        <h2 className="text-xl font-semibold">Client Payments</h2>
        <RecordPhasePaymentDialog phaseId={phase.id} />
      </div>

      {phase.payments.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No payments received yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Record client payments for this phase
            </p>
            <RecordPhasePaymentDialog phaseId={phase.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Total Paid:{" "}
                <span className="text-lg font-bold text-foreground">
                  ₹{phase.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                </span>
                {phase.estimate && (
                  <span className="ml-4">
                    of{" "}
                    <span className="font-semibold text-foreground">
                      ₹{grandTotal.toFixed(2)}
                    </span>{" "}
                    estimated
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {phase.payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      ₹{payment.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(payment.date).toLocaleDateString()}
                    </p>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estimate Dialog */}
      <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {phase.estimate ? "Edit Estimate" : "Create Estimate"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  placeholder="Supplier name"
                  defaultValue={phase.estimate?.supplier || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Any notes"
                  defaultValue={phase.estimate?.notes || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="section-header">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="xs" onClick={addLineItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Row
                </Button>
              </div>

              <div className="">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left font-medium">Description</th>
                      <th className="px-2 py-2 text-left font-medium">UOM</th>
                      <th className="px-2 py-2 text-right font-medium">Qty</th>
                      <th className="px-2 py-2 text-right font-medium">Rate</th>
                      <th className="px-2 py-2 text-right font-medium">Total</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1">
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(i, "description", e.target.value)
                            }
                            placeholder="Item name"
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            value={item.uom}
                            onChange={(e) =>
                              updateLineItem(i, "uom", e.target.value)
                            }
                            placeholder="e.g., sqft"
                            className="h-7 text-xs w-20"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantity || ""}
                            onChange={(e) =>
                              updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)
                            }
                            className="h-7 text-xs w-20 text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.ratePerUnit || ""}
                            onChange={(e) =>
                              updateLineItem(i, "ratePerUnit", parseFloat(e.target.value) || 0)
                            }
                            className="h-7 text-xs w-20 text-right"
                          />
                        </td>
                        <td className="px-2 py-1 text-right text-xs font-medium">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="px-2 py-1">
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => removeLineItem(i)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={estLoading}>
              {estLoading
                ? "Saving..."
                : phase.estimate
                ? "Update Estimate"
                : "Save Estimate"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}