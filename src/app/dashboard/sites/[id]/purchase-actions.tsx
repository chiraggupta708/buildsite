"use client";

import { useState, useEffect } from "react";
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
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export function EditPurchaseDialog({
  purchase,
  children,
}: {
  purchase: Purchase;
  children: React.ReactNode;
}) {
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
        : null,
    };

    const res = await fetch(`/api/materials/purchases/${purchase.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Purchase updated");
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to update");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-itemName">Item Name *</Label>
              <Input
                id="edit-itemName"
                name="itemName"
                defaultValue={purchase.itemName}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-uom">Unit *</Label>
              <Input
                id="edit-uom"
                name="uom"
                defaultValue={purchase.uom}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity *</Label>
              <Input
                id="edit-quantity"
                name="quantity"
                type="number"
                step="any"
                min="0"
                defaultValue={purchase.quantity}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ratePerUnit">Rate per Unit ($) *</Label>
              <Input
                id="edit-ratePerUnit"
                name="ratePerUnit"
                type="number"
                step="any"
                min="0"
                defaultValue={purchase.ratePerUnit}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
              <Input
                id="edit-purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={
                  purchase.purchaseDate
                    ? new Date(purchase.purchaseDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">Supplier</Label>
              <Input
                id="edit-supplier"
                name="supplier"
                defaultValue={purchase.supplier || ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lowStockThreshold">Low Stock Threshold</Label>
            <Input
              id="edit-lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              step="any"
              min="0"
              defaultValue={purchase.lowStockThreshold ?? ""}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePurchaseButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Are you sure you want to delete this purchase and its usage records?")) return;
    setLoading(true);
    const res = await fetch(`/api/materials/purchases/${purchaseId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Purchase deleted");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
    setLoading(false);
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={loading}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
