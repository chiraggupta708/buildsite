import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, ExternalLink } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";

export default async function ClientsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <div>Unauthorized</div>;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: { _count: { select: { sites: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your clients and their construction sites</p>
        </div>
        <ClientFormDialog />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first client to get started</p>
            <ClientFormDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {client.email && (
                      <p className="text-muted-foreground">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-muted-foreground">{client.phone}</p>
                    )}
                    <Badge variant="secondary">
                      {client._count.sites} site{client._count.sites !== 1 ? "s" : ""}
                    </Badge>
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
