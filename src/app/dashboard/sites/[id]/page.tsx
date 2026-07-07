import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/layout/back-button";
import { StatusSelector } from "./status-selector";
import { DeleteSiteButton } from "./delete-site-button";
import { SiteDetailClient } from "./site-detail-client";

export default async function SiteDetailPage({
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
    include: {
      client: true,
      labourAssignments: {
        include: {
          labour: {
            include: {
              payments: {
                where: { siteId: id },
                select: { amount: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      phases: {
        include: {
          estimate: {
            include: {
              lineItems: true,
            },
          },
          payments: true,
        },
        orderBy: { order: "asc" },
      },
      materialPurchases: {
        include: {
          usage: { select: { quantityUsed: true } },
        },
        orderBy: { purchaseDate: "desc" },
      },
    },
  });

  if (!site) notFound();

  // Serialize data for client component
  const labourAssignments = site.labourAssignments.map((la) => ({
    id: la.id,
    labourId: la.labourId,
    labour: {
      id: la.labour.id,
      name: la.labour.name,
      trade: la.labour.trade,
      phone: la.labour.phone,
    },
    status: la.status,
    startDate: la.startDate?.toISOString() ?? null,
    endDate: la.endDate?.toISOString() ?? null,
    payments: (la.labour as { payments?: { amount: number }[] }).payments?.map((p) => ({ amount: p.amount })) ?? [],
  }));

  const phases = site.phases.map((phase) => {
    const estimateTotal =
      phase.estimate?.lineItems?.reduce((s, li) => s + li.total, 0) ?? null;
    return {
      id: phase.id,
      name: phase.name,
      order: phase.order,
      estimateTotal,
      payments: phase.payments.map((p) => ({ amount: p.amount })),
    };
  });

  const materialPurchases = site.materialPurchases.map((mp) => ({
    id: mp.id,
    itemName: mp.itemName,
    uom: mp.uom,
    quantity: mp.quantity,
    total: mp.total,
    purchaseDate: mp.purchaseDate.toISOString(),
    supplier: mp.supplier,
    lowStockThreshold: mp.lowStockThreshold,
    usage: mp.usage.map((u) => ({ quantityUsed: u.quantityUsed })),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
            <StatusSelector siteId={site.id} initialStatus={site.status} />
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>Client: {site.client.name}</span>
            {site.address && <span>{site.address}</span>}
            {site.startDate && (
              <span>
                Started {new Date(site.startDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <DeleteSiteButton siteId={site.id} siteName={site.name} />
      </div>

      {/* Tabbed content */}
      <SiteDetailClient
        siteId={site.id}
        siteName={site.name}
        siteStatus={site.status}
        clientName={site.client.name}
        clientAddress={site.address}
        startDate={site.startDate?.toISOString() ?? null}
        labourAssignments={labourAssignments}
        phases={phases}
        materialPurchases={materialPurchases}
      />
    </div>
  );
}