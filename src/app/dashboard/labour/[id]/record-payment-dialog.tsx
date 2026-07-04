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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Site = {
  id: string;
  name: string;
};

type Assignment = {
  site: Site;
};

export function RecordLabourPaymentDialog({
  labourId,
  labourName,
  assignments,
}: {
  labourId: string;
  labourName: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [siteId, setSiteId] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!siteId) {
      toast.error("Please select a site");
      return;
    }
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
      setSiteId("");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to record payment");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Record Payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for {labourName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Labourer is not assigned to any sites. Assign them first.
              </p>
            ) : (
              <Select value={siteId} onValueChange={(v) => v && setSiteId(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.site.id} value={a.site.id}>
                      {a.site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
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
            disabled={loading || assignments.length === 0}
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}