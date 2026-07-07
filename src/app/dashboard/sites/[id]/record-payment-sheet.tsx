"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

export function RecordPaymentSheet({
  siteId,
  labourId,
  labourName,
  balanceDue,
  rate,
  open,
  onOpenChange,
}: {
  siteId: string;
  labourId: string;
  labourName: string;
  balanceDue: number;
  rate: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      labourId,
      siteId,
      amount: parseFloat(form.get("amount") as string),
      date: (form.get("date") as string) || undefined,
      notes: (form.get("notes") as string) || null,
    };

    const res = await fetch("/api/labour-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Payment recorded");
      onOpenChange(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to record payment");
    }
    setLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-6 pb-8 pt-6">
        <SheetHeader className="pb-4">
          <SheetTitle>
            Record Payment{labourName ? ` for ${labourName}` : ""}
          </SheetTitle>
          <SheetDescription>
            Balance due: ₹{balanceDue.toFixed(2)} · Rate: ₹{rate.toFixed(2)}/day
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min="0"
              defaultValue={balanceDue > 0 ? balanceDue.toFixed(2) : ""}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" placeholder="Any notes about this payment" />
          </div>
          <SheetFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                "Recording..."
              ) : (
                <>
                  <DollarSign className="mr-1 h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}