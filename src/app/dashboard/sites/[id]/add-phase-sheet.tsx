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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddPhaseSheet({
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
      name: form.get("name") as string,
      siteId,
      estimatedCost: form.get("estimatedCost")
        ? parseFloat(form.get("estimatedCost") as string)
        : undefined,
    };

    if (!data.name) {
      toast.error("Please enter a phase name");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Phase added");
      onOpenChange(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add phase");
    }
    setLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-6 pb-8 pt-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Add Phase</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Phase Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Foundation, Framing, Electrical"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost (₹) — optional</Label>
            <Input
              id="estimatedCost"
              name="estimatedCost"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
            />
          </div>
          <SheetFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                "Adding..."
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Phase
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}