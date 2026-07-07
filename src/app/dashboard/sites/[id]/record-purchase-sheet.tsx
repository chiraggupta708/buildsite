"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export function RecordPurchaseSheet({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string;
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
      itemName: form.get("itemName") as string,
      uom: form.get("uom") as string,
      quantity: parseFloat(form.get("quantity") as string),
      total: parseFloat(form.get("totalCost") as string),
      ratePerUnit: 0,
      supplier: (form.get("supplier") as string) || undefined,
      purchaseDate: (form.get("date") as string) || undefined,
      siteId,
    };

    if (!data.itemName || !data.quantity || !data.total) {
      toast.error("Please fill in required fields");
      setLoading(false);
      return;
    }

    // Calculate ratePerUnit from total / quantity
    data.ratePerUnit = data.total / data.quantity;

    const res = await fetch("/api/material-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Purchase recorded");
      onOpenChange(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to record purchase");
    }
    setLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-6 pb-8 pt-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Record Material Purchase</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input
              id="itemName"
              name="itemName"
              placeholder="e.g. Cement, Bricks"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom">Unit</Label>
              <Input
                id="uom"
                name="uom"
                placeholder="e.g. Bags, Kg"
                defaultValue="nos"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalCost">Total Cost (₹) *</Label>
            <Input
              id="totalCost"
              name="totalCost"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                placeholder="e.g. ABC Traders"
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
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  Record Purchase
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}