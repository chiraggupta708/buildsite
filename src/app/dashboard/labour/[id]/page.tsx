import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Phone, DollarSign, CalendarDays } from "lucide-react";
import Link from "next/link";
import { RecordLabourPaymentDialog } from "./record-payment-dialog";

export default async function LabourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const userId = session.user.id;

  const { id } = await params;
  const labour = await prisma.labour.findFirst({
    where: { id, userId },
    include: {
      assignments: {
        include: { site: { include: { client: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: { site: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!labour) notFound();

  const totalPaid = labour.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="page-shell">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/labour">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{labour.name}</h1>
          <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
            <Badge variant="secondary">{labour.trade}</Badge>
            {labour.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {labour.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold">Assigned Sites</h2>

      {labour.assignments.length === 0 ? (
        <Card>
          <CardContent className="empty-state text-muted-foreground">
            Not assigned to any sites yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {labour.assignments.map((a) => (
            <Link key={a.id} href={`/dashboard/sites/${a.site.id}`}>
              <Card className="interactive-card cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{a.site.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Client: {a.site.client.name}</p>
                    {a.startDate && (
                      <p>Since {new Date(a.startDate).toLocaleDateString()}</p>
                    )}
                    <Badge variant="outline" className="mt-1">{a.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Payment History Section */}
      <div className="section-header">
        <h2 className="text-xl font-semibold">Payment History</h2>
        <RecordLabourPaymentDialog
          labourId={labour.id}
          labourName={labour.name}
          assignments={labour.assignments}
        />
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Total Paid:{" "}
            <span className="text-lg font-bold text-foreground">
              ₹{totalPaid.toFixed(2)}
            </span>
          </p>
        </CardContent>
      </Card>

      {labour.payments.length === 0 ? (
        <Card>
          <CardContent className="empty-state text-muted-foreground">
            No payments recorded yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {labour.payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      ₹{payment.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {payment.site.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(payment.date).toLocaleDateString()}
                    </p>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
