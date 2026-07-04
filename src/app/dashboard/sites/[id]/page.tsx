import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HardHat, LayoutDashboard, Bell, Columns3 } from "lucide-react";
import Link from "next/link";
import { DeleteSiteButton } from "./delete-site-button";
import { AssignLabourDialog } from "./assign-labour-dialog";
import { MaterialsSection } from "./materials-section";
import { LowStockAlerts } from "./low-stock-alerts";
import { Separator } from "@/components/ui/separator";

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
    },
  });

  if (!site) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/clients/${site.clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
            <Badge variant={site.status === "active" ? "default" : "secondary"}>
              {site.status}
            </Badge>
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

      {/* Labours Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Assigned Labours</h2>
          <AssignLabourDialog siteId={site.id} />
        </div>

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {site.labourAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <CardTitle className="text-base">{assignment.labour.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <Badge variant="outline">{assignment.labour.trade}</Badge>
                    {assignment.startDate && (
                      <p className="text-muted-foreground mt-2">
                        Since {new Date(assignment.startDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Phases Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Phases &amp; Estimates</h2>
          </div>
          <Link href={`/dashboard/sites/${site.id}/phases`}>
            <Button variant="outline">Manage Phases</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Add and manage construction phases with line-item estimates
            </p>
            <Link href={`/dashboard/sites/${site.id}/phases`}>
              <Button>Go to Phases</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Materials Section */}
      <MaterialsSection siteId={site.id} />
    </div>
  );
}