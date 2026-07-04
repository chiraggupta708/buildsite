import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PhaseEstimateView } from "./phase-estimate-view";

export default async function PhaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const { id } = await params;
  const phase = await prisma.phase.findFirst({
    where: { id, site: { client: { userId } } },
    select: { id: true },
  });

  if (!phase) notFound();

  return <PhaseEstimateView phaseId={phase.id} />;
}