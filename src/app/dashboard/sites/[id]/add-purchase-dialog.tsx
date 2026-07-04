"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddPurchaseDialog({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      itemName: form.get("itemName") as string,
      uom: form.get("uom") as string,
      quantity: Number(form.get("quantity")),
      ratePerUnit: Number(form.get("ratePerUnit")),
      purchaseDate: (form.get("purchaseDate") as string) || undefined,
      supplier: (form.get("supplier") as string) || undefined,
      lowStockThreshold: form.get("lowStockThreshold")
        ? Number(form.get("lowStockThreshold"))
        : undefined,
      siteId,
    };

    if (!data.itemName || !data.uom || !data.quantity || !data.ratePerUnit) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/materials/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Purchase added");
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add purchase");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Material Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input id="itemName" name="itemName" placeholder="e.g. Cement" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom">Unit *</Label>
              <Input id="uom" name="uom" placeholder="e.g. Bags, Kg" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" name="quantity" type="number" step="any" min="0" placeholder="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratePerUnit">Rate per Unit ($) *</Label>
              <Input id="ratePerUnit" name="ratePerUnit" type="number" step="any" min="0" placeholder="0.00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" name="supplier" placeholder="e.g. ABC Supplies" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
            <Input id="lowStockThreshold" name="lowStockThreshold" type="number" step="any" min="0" placeholder="e.g. 10" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Purchase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
