"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

type Reminder = {
  id: string;
  title: string;
  message: string | null;
  dueDate: string;
  done: boolean;
  siteId: string;
};

export function ReminderList({
  upcoming,
  completed,
}: {
  upcoming: Reminder[];
  completed: Reminder[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markDone(id: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    if (res.ok) {
      toast.success("Reminder completed");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to update reminder");
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`Delete reminder "${title}"?`)) return;
    const res = await fetch(`/api/reminders/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Reminder deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete reminder");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function isOverdue(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  function ReminderCard({ reminder }: { reminder: Reminder }) {
    const showMessage = expanded.has(reminder.id);

    return (
      <Card
        className={
          !reminder.done && isOverdue(reminder.dueDate) ? "border-destructive/50" : ""
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {reminder.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              ) : isOverdue(reminder.dueDate) ? (
                <Bell className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <CardTitle
                  className={`text-base ${
                    reminder.done ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {reminder.title}
                </CardTitle>
                {reminder.message && (
                  <>
                    <button
                      onClick={() => toggleExpand(reminder.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                    >
                      {showMessage ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> Show details
                        </>
                      )}
                    </button>
                    {showMessage && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {reminder.message}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!reminder.done && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => markDone(reminder.id)}
                  title="Mark as complete"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(reminder.id, reminder.title)}
                title="Delete reminder"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                reminder.done
                  ? "outline"
                  : isOverdue(reminder.dueDate)
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {reminder.done ? "Done" : isOverdue(reminder.dueDate) ? "Overdue" : "Upcoming"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(reminder.dueDate)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="page-shell">
      {/* Upcoming */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Upcoming Reminders</h2>
          {upcoming.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {upcoming.length}
            </Badge>
          )}
        </div>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="empty-state">
              <BellOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No upcoming reminders</p>
              <p className="text-sm text-muted-foreground">
                Add reminders to stay on track
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Completed</h2>
            <Badge variant="outline" className="ml-auto">
              {completed.length}
            </Badge>
          </div>
          <div className="grid gap-3">
            {completed.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}