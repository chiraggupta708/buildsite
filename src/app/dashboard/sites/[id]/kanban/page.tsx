import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { KanbanBoard } from "./kanban-board";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;
  const { id: siteId } = await params;

  const site = await prisma.site.findFirst({
    where: { id: siteId, client: { userId } },
    include: {
      phases: { orderBy: { order: "asc" }, select: { id: true, name: true } },
      labourAssignments: {
        where: { status: "active" },
        include: { labour: { select: { id: true, name: true } } },
      },
    },
  });

  if (!site) notFound();

  const tasks = await prisma.task.findMany({
    where: { siteId, userId },
    orderBy: { order: "asc" },
    include: {
      phase: { select: { id: true, name: true } },
      labour: { select: { id: true, name: true } },
    },
  });

  const labours = site.labourAssignments.map((a) => a.labour);

  return (
    <KanbanBoard
      siteId={siteId}
      initialTasks={tasks.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      phases={site.phases}
      labours={labours.map((l) => ({
        ...l,
      }))}
    />
  );
}