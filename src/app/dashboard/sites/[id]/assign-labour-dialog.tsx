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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

type Labour = { id: string; name: string; trade: string };

export function AssignLabourDialog({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/labour").then((res) => res.json()).then(setLabours);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      labourId: form.get("labourId") as string,
      siteId,
      startDate: form.get("startDate") as string,
    };

    if (!data.labourId) {
      toast.error("Please select a labourer");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/labour-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Labour assigned");
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to assign");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Assign Labour
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Labour to Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="labourId">Labourer *</Label>
            <Select name="labourId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a labourer" />
              </SelectTrigger>
              <SelectContent>
                {labours.map((labour) => (
                  <SelectItem key={labour.id} value={labour.id}>
                    {labour.name} — {labour.trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
