"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { TaskCard } from "./task-card";
import { AddTaskDialog } from "./add-task-dialog";
import type { TaskWithRelations, Phase, Labour } from "./types";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

function DroppableColumn({
  column,
  tasks,
  phases,
  labours,
  siteId,
}: {
  column: (typeof COLUMNS)[number];
  tasks: TaskWithRelations[];
  phases: Phase[];
  labours: Labour[];
  siteId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border min-h-[400px] w-full transition-colors ${
        isOver ? "bg-accent/50 border-primary" : "bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3 flex-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              phases={phases}
              labours={labours}
            />
          ))}
        </SortableContext>
        <AddTaskDialog
          siteId={siteId}
          phases={phases}
          labours={labours}
          defaultStatus={column.id}
        />
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  phases,
  labours,
}: {
  task: TaskWithRelations;
  phases: Phase[];
  labours: Labour[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} phases={phases} labours={labours} />
    </div>
  );
}

export function KanbanBoard({
  siteId,
  initialTasks,
  phases,
  labours,
}: {
  siteId: string;
  initialTasks: TaskWithRelations[];
  phases: Phase[];
  labours: Labour[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const getColumnTasks = useCallback(
    (columnId: string) =>
      tasks
        .filter((t) => t.status === columnId)
        .sort((a, b) => a.order - b.order),
    [tasks]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // If dragged over a column container (not a task)
    const overColumn = COLUMNS.find((c) => c.id === over.id);
    if (overColumn && activeTask.status !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? { ...t, status: overColumn.id }
            : t
        )
      );
      return;
    }

    // If dragged over a task in a different column
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? { ...t, status: overTask.status }
            : t
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let newStatus = activeTask.status;
    let newOrder = activeTask.order;

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      newStatus = overTask.status;
      const siblingsInColumn = tasks
        .filter((t) => t.status === newStatus && t.id !== active.id)
        .sort((a, b) => a.order - b.order);

      const overIndex = siblingsInColumn.findIndex(
        (t) => t.id === overTask.id
      );

      if (overIndex >= 0) {
        const before = siblingsInColumn[overIndex];
        const after = siblingsInColumn[overIndex + 1];
        if (after) {
          newOrder = (before.order + after.order) / 2;
        } else {
          newOrder = before.order + 1000;
        }
      }
    } else {
      // Dropped on a column (droppable container, not a task)
      const columnId = over.id as string;
      if (COLUMNS.some((c) => c.id === columnId)) {
        newStatus = columnId;
        const maxOrder = Math.max(
          0,
          ...tasks
            .filter((t) => t.status === columnId && t.id !== active.id)
            .map((t) => t.order)
        );
        newOrder = maxOrder + 1000;
      }
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, status: newStatus, order: newOrder }
          : t
      )
    );

    // Persist
    const res = await fetch(`/api/tasks/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, order: newOrder }),
    });

    if (!res.ok) {
      toast.error("Failed to update task position");
      router.refresh();
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop tasks between columns
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              tasks={getColumnTasks(column.id)}
              phases={phases}
              labours={labours}
              siteId={siteId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="opacity-90">
              <TaskCard
                task={activeTask}
                phases={phases}
                labours={labours}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}