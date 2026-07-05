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
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

export function RecordLabourPaymentDialog({
  labourId,
  labourName,
  siteId,
  siteName,
}: {
  labourId: string;
  labourName: string;
  siteId: string;
  siteName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to record payment");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="xs">
          <DollarSign className="mr-1 h-3 w-3" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Record Payment{labourName ? ` for ${labourName}` : ""}
          </DialogTitle>
        </DialogHeader>
        {siteName && (
          <p className="text-sm text-muted-foreground -mt-2">
            Site: {siteName}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min="0"
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
            <Input id="notes" name="notes" placeholder="Any notes" />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}