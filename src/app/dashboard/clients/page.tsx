import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientsList } from "./client-list";

export default async function ClientsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <div>Unauthorized</div>;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      _count: { select: { sites: true } },
      sites: {
        include: { _count: { select: { labourAssignments: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Clients</h1>
          <p className="text-muted-foreground">
            Manage your clients and their construction sites
          </p>
        </div>
        <ClientFormDialog />
      </div>

      {clients.length === 0 ? (
        <Card className="hover:-translate-y-1 hover:shadow-xl">
          <CardContent className="empty-state">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first client to get started</p>
            <ClientFormDialog />
          </CardContent>
        </Card>
      ) : (
        <ClientsList clients={clients} />
      )}
    </div>
  );
}
