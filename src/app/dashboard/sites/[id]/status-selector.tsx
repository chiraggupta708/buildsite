"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Status = "active" | "on-hold" | "completed";

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-500" },
  "on-hold": { label: "On Hold", color: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-slate-400" },
};

const ALL_STATUSES: Status[] = ["active", "on-hold", "completed"];

export function StatusSelector({ siteId, initialStatus }: { siteId: string; initialStatus: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const config = STATUS_CONFIG[status as Status] || { label: status, color: "bg-muted" };

  async function handleChange(newStatus: string) {
    if (newStatus === status) { setOpen(false); return; }
    setSaving(true);
    setStatus(newStatus);
    setOpen(false);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setStatus(initialStatus);
        toast.error("Failed to update status");
      } else {
        toast.success(`Site marked as ${newStatus}`);
        router.refresh();
      }
    } catch {
      setStatus(initialStatus);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !saving && setOpen(!open)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
      >
        <span className={`h-2 w-2 rounded-full ${config.color}`} />
        {config.label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleChange(s)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                <span className={`h-2 w-2 rounded-full ${c.color}`} />
                {c.label}
                {status === s && <Check className="h-3 w-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}