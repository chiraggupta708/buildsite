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
import { PackagePlus } from "lucide-react";
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

export function LogUsageDialog({ purchase }: { purchase: Purchase }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalConsumed = purchase.usage.reduce((sum, u) => sum + u.quantityUsed, 0);
  const remainingStock = purchase.quantity - totalConsumed;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const quantityUsed = Number(form.get("quantityUsed"));
    const dateUsed = (form.get("dateUsed") as string) || undefined;

    if (!quantityUsed || quantityUsed <= 0) {
      toast.error("Please enter a valid quantity");
      setLoading(false);
      return;
    }

    if (quantityUsed > remainingStock) {
      toast.error(`Quantity exceeds remaining stock (${remainingStock} ${purchase.uom})`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/materials/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialPurchaseId: purchase.id,
        quantityUsed,
        dateUsed,
      }),
    });

    if (res.ok) {
      toast.success("Usage logged");
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to log usage");
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm">
          <PackagePlus className="mr-2 h-4 w-4" />
          Log Usage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log Material Usage</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p>
            <span className="font-medium">{purchase.itemName}</span> — {purchase.uom}
          </p>
          <p className="text-muted-foreground">
            Remaining stock:{" "}
            <span className={remainingStock <= (purchase.lowStockThreshold ?? 0) ? "text-destructive font-medium" : ""}>
              {remainingStock} {purchase.uom}
            </span>
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantityUsed">Quantity Used *</Label>
            <Input
              id="quantityUsed"
              name="quantityUsed"
              type="number"
              step="any"
              min="0.01"
              max={remainingStock}
              placeholder={`Max: ${remainingStock}`}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateUsed">Date Used</Label>
            <Input
              id="dateUsed"
              name="dateUsed"
              type="date"
              defaultValue={today}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging..." : "Log Usage"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
