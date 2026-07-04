"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import type { Phase, Labour } from "./types";

export function AddTaskDialog({
  siteId,
  phases,
  labours,
  defaultStatus = "todo",
  onSuccess,
}: {
  siteId: string;
  phases: Phase[];
  labours: Labour[];
  defaultStatus?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      status: defaultStatus,
      siteId,
    };
    const phaseId = form.get("phaseId") as string;
    const labourId = form.get("labourId") as string;
    if (phaseId) data.phaseId = phaseId;
    if (labourId) data.labourId = labourId;

    if (!data.title) {
      toast.error("Title is required");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Task created");
      setOpen(false);
      router.refresh();
      onSuccess?.();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create task");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" placeholder="Task title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional description" />
          </div>
          {phases.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="phaseId">Phase</Label>
              <Select name="phaseId">
                <SelectTrigger>
                  <SelectValue placeholder="No phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {labours.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="labourId">Assigned Labour</Label>
              <Select name="labourId">
                <SelectTrigger>
                  <SelectValue placeholder="Not assigned" />
                </SelectTrigger>
                <SelectContent>
                  {labours.map((labour) => (
                    <SelectItem key={labour.id} value={labour.id}>
                      {labour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}