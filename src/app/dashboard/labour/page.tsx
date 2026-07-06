import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat, Phone, DollarSign } from "lucide-react";
import { LabourFormDialog } from "./labour-form-dialog";
import { DeleteLabourButton } from "./delete-labour-button";
import Link from "next/link";

export default async function LabourPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <div>Unauthorized</div>;

  const labours = await prisma.labour.findMany({
    where: { userId },
    include: {
      _count: { select: { assignments: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Labours</h1>
          <p className="text-muted-foreground">Manage labourers and their trade assignments</p>
        </div>
        <LabourFormDialog />
      </div>

      {labours.length === 0 ? (
        <Card className="hover:-translate-y-1 hover:shadow-xl">
          <CardContent className="empty-state">
            <HardHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No labourers yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first labourer</p>
            <LabourFormDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {labours.map((labour) => {
            const totalPaid = labour.payments.reduce((sum, p) => sum + p.amount, 0);
            return (
              <Link key={labour.id} href={`/dashboard/labour/${labour.id}`}>
                <Card className="transition-all duration-200 hover:-translate-y-1 hover:bg-accent/40 hover:shadow-lg cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{labour.name}</CardTitle>
                      <DeleteLabourButton labour={labour} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <Badge variant="secondary">{labour.trade}</Badge>
                      {labour.phone && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {labour.phone}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {labour._count.assignments} site{labour._count.assignments !== 1 ? "s" : ""}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ₹{totalPaid.toFixed(2)} paid
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
