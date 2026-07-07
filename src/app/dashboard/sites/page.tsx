import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, ArrowUpRight } from "lucide-react";

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "active": return "default" as const;
    case "on-hold": return "secondary" as const;
    case "completed": return "outline" as const;
    default: return "secondary" as const;
  }
}

export default async function SitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sites = await prisma.site.findMany({
    where: { client: { userId } },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Sites</h1>
          <p className="text-sm text-muted-foreground">{sites.length} sites</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No sites yet</p>
          </CardContent>
        </Card>
      ) : (
        sites.map((site) => (
          <Link key={site.id} href={`/dashboard/sites/${site.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{site.name}</h3>
                      <Badge variant={getStatusVariant(site.status)} className="shrink-0 text-[10px] px-1.5 py-0">
                        {site.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{site.client.name}</p>
                    {site.address && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {site.address}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
