"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Eye, Layers } from "lucide-react";
import { toast } from "sonner";

type Phase = {
  id: string;
  name: string;
  order: number;
  siteId: string;
  estimate: { id: string } | null;
};

export function PhaseList({ siteId }: { siteId: string }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhase, setDeletePhase] = useState<Phase | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPhases = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/phases?siteId=${siteId}`);
    if (res.ok) {
      setPhases(await res.json());
    }
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPhases();
    });
  }, [loadPhases]);

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      order: parseInt(form.get("order") as string) || 0,
      siteId,
    };

    const res = await fetch("/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Phase added");
      setAddOpen(false);
      loadPhases();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add phase");
    }
    setAddLoading(false);
  }

  async function onEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPhase) return;
    setEditLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      order: parseInt(form.get("order") as string) || 0,
    };

    const res = await fetch(`/api/phases/${editPhase.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Phase updated");
      setEditOpen(false);
      loadPhases();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to update phase");
    }
    setEditLoading(false);
  }

  async function onDelete() {
    if (!deletePhase) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/phases/${deletePhase.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Phase deleted");
      setDeleteOpen(false);
      loadPhases();
    } else {
      toast.error("Failed to delete phase");
    }
    setDeleteLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading phases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="section-header">
        <h2 className="text-xl font-semibold">Phases</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Phase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Phase</DialogTitle>
            </DialogHeader>
            <form onSubmit={onAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Phase Name *</Label>
                <Input id="name" name="name" placeholder="e.g., Foundation" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Order Number</Label>
                <Input id="order" name="order" type="number" defaultValue={phases.length + 1} />
              </div>
              <Button type="submit" className="w-full" disabled={addLoading}>
                {addLoading ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {phases.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No phases yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add phases to break down this site
            </p>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phase
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Phase</DialogTitle>
                </DialogHeader>
                <form onSubmit={onAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-empty">Phase Name *</Label>
                    <Input id="name-empty" name="name" placeholder="e.g., Foundation" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-empty">Order Number</Label>
                    <Input id="order-empty" name="order" type="number" defaultValue={1} />
                  </div>
                  <Button type="submit" className="w-full" disabled={addLoading}>
                    {addLoading ? "Saving..." : "Save"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => (
            <Card key={phase.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {phase.order}
                  </span>
                  <CardTitle className="text-base">{phase.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/phases/${phase.id}`}>
                    <Button variant="outline" size="xs">
                      <Eye className="mr-1 h-3 w-3" />
                      {phase.estimate ? "View Estimate" : "Add Estimate"}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setEditPhase(phase);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => {
                      setDeletePhase(phase);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editPhase && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Phase</DialogTitle>
            </DialogHeader>
            <form onSubmit={onEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Phase Name *</Label>
                <Input id="edit-name" name="name" defaultValue={editPhase.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order">Order Number</Label>
                <Input id="edit-order" name="order" type="number" defaultValue={editPhase.order} />
              </div>
              <Button type="submit" className="w-full" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {deletePhase && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Phase</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deletePhase.name}</strong>?
              This will also remove any associated estimate and payments.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}