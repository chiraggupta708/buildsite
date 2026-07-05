"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
  Calendar,
  ExternalLink,
} from "lucide-react";

type SiteWithCount = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  startDate: Date | null;
  clientId: string;
  _count: { labourAssignments: number };
};

type ClientWithSites = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  _count: { sites: number };
  sites: SiteWithCount[];
};

function SiteRow({ site }: { site: SiteWithCount }) {
  const statusVariant =
    site.status === "active"
      ? "default"
      : site.status === "completed"
        ? "secondary"
        : "outline";

  const statusClass =
    site.status === "on-hold" ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" : "";

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{site.name}</p>
          {site.address && (
            <p className="truncate text-xs text-muted-foreground">
              {site.address}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge variant={statusVariant as "default" | "secondary" | "outline"} className={statusClass}>
          {site.status}
        </Badge>

        {site.startDate && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Calendar className="h-3 w-3" />
            {new Date(site.startDate).toLocaleDateString()}
          </span>
        )}

        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Users className="h-3 w-3" />
          {site._count.labourAssignments}
        </span>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/dashboard/sites/${site.id}`}
            className="inline-flex h-6 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3 w-3" />
            View Site
          </Link>
          <Link
            href={`/dashboard/sites/${site.id}/dashboard`}
            className="inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClientsList({ clients }: { clients: ClientWithSites[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (clients.length === 0) {
    return null; // handled by parent
  }

  return (
    <div className="space-y-3">
      {clients.map((client) => {
        const isExpanded = expandedId === client.id;

        return (
          <Card
            key={client.id}
            className="overflow-hidden transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleExpand(client.id)}
              className="w-full text-left"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                        <Badge variant="secondary" className="text-[10px]">
                          {client._count.sites} site
                          {client._count.sites !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform" />
                  )}
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                <Separator className="mb-3" />
                {client.sites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <MapPin className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No sites yet</p>
                    <p className="text-xs">Add a site from the client detail page</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {client.sites.map((site) => (
                      <SiteRow key={site.id} site={site} />
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export { ClientsList };