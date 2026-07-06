import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PhaseList } from "./phase-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PhasesPage({
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

  return (
    <div className="page-shell">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${site.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{site.name}</h1>
          <p className="text-sm text-muted-foreground">Phases &amp; Estimates</p>
        </div>
      </div>

      <PhaseList siteId={site.id} />
    </div>
  );
}