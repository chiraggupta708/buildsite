import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClientActions } from "./client-actions";
import { SiteFormDialog } from "./site-form-dialog";
import { DeleteClientButton } from "./delete-client-button";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId },
    include: {
      sites: {
        include: { _count: { select: { labourAssignments: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="page-shell">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{client.name}</h1>
            <ClientActions client={client} />
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            {client.email && <span>{client.email}</span>}
            {client.phone && <span>{client.phone}</span>}
            {client.address && <span>{client.address}</span>}
          </div>
        </div>
        <DeleteClientButton clientId={client.id} clientName={client.name} />
      </div>

      <div className="section-header">
        <h2 className="text-xl font-semibold">Sites</h2>
        <SiteFormDialog clientId={client.id} />
      </div>

      {client.sites.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <p className="text-lg font-medium">No sites yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add a construction site for this client</p>
            <SiteFormDialog clientId={client.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {client.sites.map((site) => (
            <Link key={site.id} href={`/dashboard/sites/${site.id}`}>
              <Card className="interactive-card cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {site.address && (
                      <p className="text-muted-foreground">{site.address}</p>
                    )}
                    <div className="flex gap-2">
                      <Badge variant={site.status === "active" ? "default" : "secondary"}>
                        {site.status}
                      </Badge>
                      {site.startDate && (
                        <span className="text-muted-foreground">
                          Started {new Date(site.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {site._count.labourAssignments} labourer{site._count.labourAssignments !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
