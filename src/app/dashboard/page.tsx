import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  IndianRupee,
  Building2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Timer,
  TrendingUp,
} from "lucide-react";

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" {
  switch (status.toLowerCase()) {
    case "active":
      return "default";
    case "onhold":
    case "on_hold":
    case "on hold":
      return "secondary";
    case "completed":
    case "complete":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "Active";
    case "onhold":
    case "on_hold":
    case "on hold":
      return "On Hold";
    case "completed":
    case "complete":
      return "Completed";
    default:
      return status;
  }
}

function getProgressColor(pct: number): string {
  if (pct > 90) return "bg-destructive";
  if (pct > 70) return "bg-amber-500";
  return "bg-primary";
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="page-shell">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome to BuildSite</p>
        </div>
      </div>
    );
  }

  // Fetch all sites with their related data
  const sites = await prisma.site.findMany({
    where: { client: { userId } },
    include: {
      client: { select: { name: true } },
      phases: {
        include: {
          estimate: {
            include: { lineItems: true },
          },
          payments: true,
        },
        orderBy: { order: "asc" },
      },
      labourAssignments: {
        include: {
          labour: { select: { name: true } },
        },
      },
      materialPurchases: true,
      labourPayments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Compute per-site derived data
  let totalInvested = 0;
  let totalPendingPayments = 0;
  let thisMonthSpend = 0;
  let activeSiteCount = 0;

  const siteData = sites.map((site) => {
    if (site.status === "active") activeSiteCount++;

    // Budget: sum of phase estimate line item totals
    const budget = site.phases.reduce(
      (sum, phase) =>
        sum +
        (phase.estimate?.lineItems.reduce((s, li) => s + li.total, 0) || 0),
      0
    );

    // Spent: phase payments + material purchases + labour payments
    const phasePayments = site.phases.reduce(
      (sum, phase) => sum + phase.payments.reduce((s, p) => s + p.amount, 0),
      0
    );
    const materialSpent = site.materialPurchases.reduce(
      (sum, p) => sum + p.total,
      0
    );
    const labourSpent = site.labourPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const spent = phasePayments + materialSpent + labourSpent;

    // Overdue amount: phases where estimated > paid
    let overdueAmount = 0;
    for (const phase of site.phases) {
      if (phase.estimate) {
        const estimated = phase.estimate.lineItems.reduce(
          (s, li) => s + li.total,
          0
        );
        const paid = phase.payments.reduce((s, p) => s + p.amount, 0);
        const due = estimated - paid;
        if (due > 0) overdueAmount += due;
      }
    }

    // This-month spend
    const thisMonthLabour = site.labourPayments
      .filter((p) => p.date >= startOfMonth)
      .reduce((s, p) => s + p.amount, 0);
    const thisMonthMaterial = site.materialPurchases
      .filter((p) => p.purchaseDate >= startOfMonth)
      .reduce((s, p) => s + p.total, 0);

    const spentPercent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    // Accumulate totals
    totalInvested += spent;
    totalPendingPayments += overdueAmount;
    thisMonthSpend += thisMonthLabour + thisMonthMaterial;

    return {
      id: site.id,
      name: site.name,
      status: site.status,
      startDate: site.startDate,
      createdAt: site.createdAt,
      clientName: site.client.name,
      budget,
      spent,
      spentPercent: Math.min(spentPercent, 100),
      overdueAmount,
    };
  });

  // Overdue labour assignments (ended but still marked active)
  const overdueLabourAssignments = await prisma.labourAssignment.findMany({
    where: {
      site: { client: { userId } },
      status: "active",
      endDate: { not: null, lt: now },
    },
    include: {
      labour: { select: { name: true } },
      site: { select: { name: true, id: true } },
    },
    orderBy: { endDate: "asc" },
    take: 10,
  });

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Executive overview of your construction business
        </p>
      </div>

      {/* Stat Chips — horizontally scrollable */}
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
        <Card className="shrink-0 w-[160px] snap-start">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Active Sites
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{activeSiteCount}</div>
          </CardContent>
        </Card>

        <Card className="shrink-0 w-[160px] snap-start">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" />
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{formatINR(totalInvested)}</div>
          </CardContent>
        </Card>

        <Card
          className={`shrink-0 w-[160px] snap-start ${
            totalPendingPayments > 0 ? "border-destructive/50" : ""
          }`}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div
              className={`text-2xl font-bold ${
                totalPendingPayments > 0 ? "text-destructive" : ""
              }`}
            >
              {formatINR(totalPendingPayments)}
            </div>
          </CardContent>
        </Card>

        <Card className="shrink-0 w-[160px] snap-start">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">
              {formatINR(thisMonthSpend)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Labour + Materials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Site Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Sites</h2>
        <div className="space-y-3">
          {siteData.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sites yet. Create your first site to get started.
              </CardContent>
            </Card>
          ) : (
            siteData.map((site) => (
              <Link
                key={site.id}
                href={`/dashboard/sites/${site.id}`}
                className="block"
              >
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.99]">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold truncate">
                          {site.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{site.clientName}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span className="shrink-0">
                            {site.startDate
                              ? `Started ${timeAgo(site.startDate)}`
                              : `Created ${timeAgo(site.createdAt)}`}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant={getStatusVariant(site.status)}
                        className="shrink-0 text-[10px] px-2 py-0.5 capitalize"
                      >
                        {getStatusLabel(site.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(site.spentPercent)}`}
                          style={{ width: `${site.spentPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Budget: {formatINR(site.budget)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatINR(site.spent)} spent
                        </span>
                      </div>
                    </div>
                    {/* Overdue indicator */}
                    {site.overdueAmount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          {formatINR(site.overdueAmount)} overdue across phases
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Overdue Labour Payments */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-5 w-5 text-destructive shrink-0" />
          <h2 className="text-xl font-semibold">Overdue Labour Payments</h2>
          {overdueLabourAssignments.length > 0 && (
            <Badge variant="destructive">
              {overdueLabourAssignments.length}
            </Badge>
          )}
        </div>
        {overdueLabourAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              All labour payments are up to date
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {overdueLabourAssignments.map((assignment) => {
              const daysOverdue = Math.floor(
                (now.getTime() - assignment.endDate!.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={assignment.id}
                  href={`/dashboard/sites/${assignment.site.id}`}
                  className="block"
                >
                  <Card className="transition-colors hover:bg-accent/40 cursor-pointer border-destructive/30">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {assignment.labour.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {assignment.site.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-2 py-0"
                          >
                            {daysOverdue}d overdue
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}