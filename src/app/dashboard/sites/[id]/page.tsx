import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  HardHat,
  LayoutDashboard,
  Bell,
  Columns3,
  Layers,
  ShoppingCart,
  Eye,
  Plus,
  UserPlus,
  Pencil,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { DeleteSiteButton } from "./delete-site-button";
import { StatusSelector } from "./status-selector";
import { AssignLabourDialog } from "./assign-labour-dialog";
import { MaterialsSection } from "./materials-section";
import { LowStockAlerts } from "./low-stock-alerts";
import { CollapsibleSection } from "@/components/layout/collapsible-section";
import { RecordLabourPaymentDialog } from "./record-labour-payment-dialog";

function getPaymentStatusBadge(
  estimateTotal: number | null,
  paidTotal: number
) {
  if (!estimateTotal || estimateTotal === 0) {
    return <Badge variant="outline">No estimate</Badge>;
  }
  const pct = Math.round((paidTotal / estimateTotal) * 100);
  if (pct >= 100) {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-700">
        Fully Paid
      </Badge>
    );
  }
  if (pct >= 60) {
    return (
      <Badge className="bg-amber-500 text-white hover:bg-amber-600">
        {pct}% Paid
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600">
      Pending
    </Badge>
  );
}

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
        include: { labour: true },
        where: { status: "active" },
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
    },
  });

  if (!site) notFound();

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
              <span>Started {new Date(site.startDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <Link href={`/dashboard/sites/${site.id}/dashboard`}>
          <Button variant="outline" size="sm">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <Link href={`/dashboard/sites/${site.id}/reminders`}>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Reminders
          </Button>
        </Link>
        <Link href={`/dashboard/sites/${site.id}/kanban`}>
          <Button variant="outline" size="sm">
            <Columns3 className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </Link>
        <DeleteSiteButton siteId={site.id} siteName={site.name} />
      </div>

      {/* Low Stock Alerts */}
      <LowStockAlerts siteId={site.id} userId={userId} />

      {/* ==================== PHASES & ESTIMATES ==================== */}
      <CollapsibleSection
        title="Phases & Estimates"
        icon={<Layers className="h-5 w-5" />}
        action={
          <Link href={`/dashboard/sites/${site.id}/phases`}>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Add Phase
            </Button>
          </Link>
        }
      >
        {site.phases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No phases yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add phases to break down this site
              </p>
              <Link href={`/dashboard/sites/${site.id}/phases`}>
                <Button>Go to Phases</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Phase Name</TableHead>
                  <TableHead className="text-right">Estimated (₹)</TableHead>
                  <TableHead className="text-right">Paid (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {site.phases.map((phase) => {
                  const estimateTotal =
                    phase.estimate?.lineItems?.reduce(
                      (s, li) => s + li.total,
                      0
                    ) ?? null;
                  const paidTotal = phase.payments.reduce(
                    (s, p) => s + p.amount,
                    0
                  );
                  return (
                    <TableRow key={phase.id}>
                      <TableCell>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {phase.order}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {phase.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {estimateTotal !== null
                          ? `₹${estimateTotal.toFixed(2)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {paidTotal > 0
                          ? `₹${paidTotal.toFixed(2)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(estimateTotal, paidTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/phases/${phase.id}`}
                        >
                          <Button variant="outline" size="xs">
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleSection>

      {/* ==================== ASSIGNED LABOURS ==================== */}
      <CollapsibleSection
        title="Assigned Labours"
        icon={<HardHat className="h-5 w-5" />}
        action={<AssignLabourDialog siteId={site.id} />}
      >
        {site.labourAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HardHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No labours assigned</p>
              <p className="text-sm text-muted-foreground mb-4">
                Assign labourers to this site
              </p>
              <AssignLabourDialog siteId={site.id} />
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {site.labourAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👤</span>
                      <CardTitle className="text-base">
                        {assignment.labour.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <Badge variant="outline">
                        {assignment.labour.trade}
                      </Badge>
                      {assignment.startDate && (
                        <p className="text-muted-foreground mt-2">
                          Since{" "}
                          {new Date(
                            assignment.startDate
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      <Link
                        href={`/dashboard/labour/${assignment.labour.id}`}
                      >
                        <Button variant="outline" size="xs">
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                      </Link>
                      <RecordLabourPaymentDialog
                        labourId={assignment.labour.id}
                        labourName={assignment.labour.name}
                        siteId={site.id}
                        siteName={site.name}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* ==================== MATERIALS ==================== */}
      <CollapsibleSection
        title="Materials"
        icon={<ShoppingCart className="h-5 w-5" />}
      >
        <MaterialsSection siteId={site.id} />
      </CollapsibleSection>
    </div>
  );
}