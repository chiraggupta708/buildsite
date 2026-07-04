"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Trash2, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import type { TaskWithRelations, Phase, Labour } from "./types";

export function TaskCard({
  task,
  phases,
  labours,
}: {
  task: TaskWithRelations;
  phases: Phase[];
  labours: Labour[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [phaseId, setPhaseId] = useState(task.phaseId || "");
  const [labourId, setLabourId] = useState(task.labourId || "");
  const [saving, setSaving] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Task deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete task");
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description || null,
        phaseId: phaseId || null,
        labourId: labourId || null,
      }),
    });
    if (res.ok) {
      toast.success("Task updated");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Failed to update task");
    }
    setSaving(false);
  }

  function handleCancel() {
    setTitle(task.title);
    setDescription(task.description || "");
    setPhaseId(task.phaseId || "");
    setLabourId(task.labourId || "");
    setEditing(false);
  }

  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-xs space-y-2">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <div
              className="text-sm font-medium cursor-pointer truncate"
              onClick={() => setEditing(true)}
            >
              {task.title}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5">
        {task.phase && !editing && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {task.phase.name}
          </Badge>
        )}
        {task.labour && !editing && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {task.labour.name}
          </Badge>
        )}
        {task.description && !editing && (
          <span className="text-[10px] text-muted-foreground truncate max-w-full">
            {task.description}
          </span>
        )}
      </div>

      {/* Expanded inline edit */}
      {expanded && editing && (
        <div className="space-y-2 pt-1 border-t">
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-7 text-sm mt-1"
              placeholder="No description"
            />
          </div>
          {phases.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground">Phase</label>
              <Select
                              value={phaseId}
                              onValueChange={(val) => setPhaseId(val ?? "")}
                            >
                <SelectTrigger className="h-7 text-sm mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {labours.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground">Assigned Labour</label>
              <Select value={labourId} onValueChange={(val: string | null) => setLabourId(val ?? "")}>
                <SelectTrigger className="h-7 text-sm mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {labours.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {expanded && !editing && (
        <div className="space-y-1 pt-1 border-t text-xs text-muted-foreground">
          {task.description && <p>{task.description}</p>}
          {phases.length > 0 && task.phaseId && (
            <p>Phase: {task.phase?.name}</p>
          )}
          {labours.length > 0 && task.labourId && (
            <p>Labour: {task.labour?.name}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-6 text-xs px-1"
          >
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}