import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  IndianRupee,
  Building2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  HardHat,
  Package,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to BuildSite</p>
        </div>
      </div>
    );
  }

  // Parallel queries for summary
  const [
    labourAgg,
    materialAgg,
    activeSiteCount,
    recentSites,
    phasesWithData,
    matPurchases,
  ] = await Promise.all([
    prisma.labourPayment.aggregate({
      where: { site: { client: { userId } } },
      _sum: { amount: true },
    }),
    prisma.materialPurchase.aggregate({
      where: { site: { client: { userId } } },
      _sum: { total: true },
    }),
    prisma.site.count({
      where: { client: { userId }, status: "active" },
    }),
    prisma.site.findMany({
      where: { client: { userId } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.phase.findMany({
      where: { site: { client: { userId } } },
      include: {
        site: { include: { client: { select: { name: true } } } },
        estimate: { include: { lineItems: true } },
        payments: true,
      },
      orderBy: { order: "asc" },
    }),
    prisma.materialPurchase.findMany({
      where: {
        site: { client: { userId } },
        lowStockThreshold: { not: null },
      },
      include: {
        site: { select: { id: true, name: true } },
        usage: { select: { quantityUsed: true } },
      },
      orderBy: { quantity: "asc" },
    }),
  ]);

  const totalInvestment =
    (labourAgg._sum?.amount || 0) + (materialAgg._sum?.total || 0);

  // Total client payments across all phases
  const totalClientPayments = phasesWithData.reduce(
    (sum, p) => sum + p.payments.reduce((s, pay) => s + pay.amount, 0),
    0
  );

  // Overdue phases: where paid < estimated
  const overduePhases = phasesWithData
    .filter((p) => p.estimate)
    .map((p) => {
      const estimated = p.estimate!.lineItems.reduce(
        (s, li) => s + li.total,
        0
      );
      const paid = p.payments.reduce((s, pay) => s + pay.amount, 0);
      return { ...p, estimated, paid, due: estimated - paid };
    })
    .filter((p) => p.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  // Low stock items
  const lowStockItems = matPurchases
    .map((p) => {
      const consumed = p.usage.reduce((s, u) => s + u.quantityUsed, 0);
      const remaining = p.quantity - consumed;
      return {
        ...p,
        remaining,
        isLow:
          p.lowStockThreshold != null && remaining <= p.lowStockThreshold,
      };
    })
    .filter((p) => p.isLow)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Executive overview of your construction business
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investment
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalInvestment.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Labour + Materials
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Client Payments
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalClientPayments.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Received across all phases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sites
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSiteCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Phases
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                overduePhases.length > 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overduePhases.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Payments due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <h2 className="text-xl font-semibold">Overdue Payments</h2>
          {overduePhases.length > 0 && (
            <Badge variant="destructive">{overduePhases.length}</Badge>
          )}
        </div>
        {overduePhases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              All payments are up to date
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Client</TableHead>
                  <TableHead className="whitespace-nowrap">Site</TableHead>
                  <TableHead className="whitespace-nowrap">Phase</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Est. (₹)</TableHead>
                  <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Paid (₹)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Due (₹)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePhases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {p.site.client.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{p.site.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      ₹{p.estimated.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap hidden sm:table-cell">
                      ₹{p.paid.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive whitespace-nowrap">
                      ₹{p.due.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/sites/${p.site.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-destructive shrink-0" />
          <h2 className="text-xl font-semibold">Low Stock Alerts</h2>
          {lowStockItems.length > 0 && (
            <Badge variant="destructive">{lowStockItems.length}</Badge>
          )}
        </div>
        {lowStockItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No items running low on stock
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Site</TableHead>
                  <TableHead className="whitespace-nowrap">Item</TableHead>
                  <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Threshold</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Remaining</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="bg-destructive/5"
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {item.site.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{item.itemName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap hidden sm:table-cell">
                      {item.lowStockThreshold}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive whitespace-nowrap">
                      {item.remaining}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/sites/${item.siteId}`}>
                        <Button variant="ghost" size="icon-sm">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Recent Sites</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentSites.map((site) => (
            <Link key={site.id} href={`/dashboard/sites/${site.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                    <Badge
                      variant={
                        site.status === "active" ? "default" : "secondary"
                      }
                    >
                      {site.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {site.client.name}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created{" "}
                    {new Date(site.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}