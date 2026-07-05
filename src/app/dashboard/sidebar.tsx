"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";

type Site = {
  id: string;
  name: string;
  client: { name: string };
  status: string;
};

function CollapsibleNavSection({
  title,
  icon: Icon,
  isActive,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
        }`}
      >
        <div className="ml-2 space-y-1 border-l-2 border-muted pl-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [recentSites, setRecentSites] = useState<Site[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("buildsite_sidebar_open");
    if (stored !== null) setOpen(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("buildsite_sidebar_open", String(open));
  }, [open]);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentSites(data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const isDashboard = pathname === "/dashboard";
  const isClients =
    pathname.startsWith("/dashboard/clients") ||
    pathname.startsWith("/dashboard/sites");
  const isLabour = pathname.startsWith("/dashboard/labour");

  const close = () => setOpen(false);

  return (
    <>
      {/* Hamburger - visible when sidebar is closed or on mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-3 top-3 z-50 rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r bg-card transition-all duration-300 ${
          open
            ? "w-64 fixed inset-y-0 left-0 z-40 md:static md:z-auto"
            : "w-0 overflow-hidden md:w-16 fixed inset-y-0 left-0 z-40 md:static md:z-auto md:overflow-visible"
        }`}
      >
        {/* Toggle button - desktop only */}
        <div className="flex items-center justify-between p-4">
          <div className={`${!open && "md:hidden"}`}>
            {open && (
              <Link
                href="/dashboard"
                className="text-xl font-bold tracking-tight"
              >
                BuildSite
              </Link>
            )}
            {open && userName && (
              <p className="mt-1 text-xs text-muted-foreground">{userName}</p>
            )}
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="hidden md:flex rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            {open ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className={`${!open && "md:hidden"}`}>
          <Separator />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {/* Dashboard - single link, always visible */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isDashboard
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
              {open && <span>Dashboard</span>}
            </Link>

            {/* Clients & Sites */}
            <CollapsibleNavSection
              title="Clients & Sites"
              icon={Building2}
              isActive={isClients}
              defaultOpen={isClients}
            >
              {open && (
                <>
                  <Link
                    href="/dashboard/clients"
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      pathname === "/dashboard/clients" ||
                      pathname.startsWith("/dashboard/clients/")
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    All Clients
                  </Link>
                  <Link
                    href="/dashboard/clients?filter=active"
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      pathname === "/dashboard/clients?filter=active"
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Active Sites
                  </Link>
                </>
              )}
            </CollapsibleNavSection>

            {/* Labour */}
            <CollapsibleNavSection
              title="Labour"
              icon={HardHat}
              isActive={isLabour}
              defaultOpen={isLabour}
            >
              {open && (
                <Link
                  href="/dashboard/labour"
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                    pathname === "/dashboard/labour" ||
                    pathname.startsWith("/dashboard/labour/")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  All Labours
                </Link>
              )}
            </CollapsibleNavSection>
          </nav>

          {/* Recent Sites */}
          {recentSites.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  Recent Sites
                </div>
              </div>
              <div className="px-3 pb-2 space-y-0.5">
                {recentSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      pathname === `/dashboard/sites/${site.id}`
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        site.status === "active"
                          ? "bg-emerald-500"
                          : "bg-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{site.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[60px]">
                      {site.client?.name}
                    </span>
                  </Link>
                ))}
              </div>
              <Separator />
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-auto p-3 ${!open && "md:hidden"}`}>
          <Separator className="mb-2" />
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground text-sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {open && "Sign out"}
          </Button>
        </div>
      </aside>
    </>
  );
}