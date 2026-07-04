import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AddReminderDialog } from "./add-reminder-dialog";
import { ReminderList } from "./reminder-list";

export default async function RemindersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const { id } = await params;
  const site = await prisma.site.findFirst({
    where: { id, client: { userId } },
    select: { id: true, name: true },
  });

  if (!site) notFound();

  const allReminders = await prisma.reminder.findMany({
    where: { siteId: site.id, site: { client: { userId } } },
    orderBy: { dueDate: "asc" },
  });

  // Serialize dates to strings for client components
  const serialized = allReminders.map((r) => ({
    ...r,
    dueDate: r.dueDate.toISOString(),
  }));

  const now = new Date();
  const upcoming = serialized.filter((r) => !r.done && new Date(r.dueDate) >= now);
  const completed = serialized.filter((r) => r.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${site.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
          <p className="text-sm text-muted-foreground">Reminders</p>
        </div>
        <div className="ml-auto">
          <AddReminderDialog siteId={site.id} />
        </div>
      </div>

      <ReminderList upcoming={upcoming} completed={completed} />
    </div>
  );
}