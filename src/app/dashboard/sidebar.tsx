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
      {/* Mobile hamburger - positioned top-right beside the sidebar */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed z-50 rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden transition-all duration-300`}
        style={{
          top: "0.5rem",
          left: open ? "16.25rem" : "0.5rem", // 260px when sidebar open, 8px when closed
        }}
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
        className={`flex flex-col border-r bg-card transition-all duration-300 ease-in-out ${
          open
            ? "w-64 translate-x-0"
            : "w-0 overflow-hidden md:w-16 md:overflow-visible"
        } fixed inset-y-0 left-0 z-40 md:static md:z-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 min-h-[52px] shrink-0">
          <div className={`flex items-center gap-3 min-w-0 ${!open && "md:hidden"}`}>
            {open && (
              <Link
                href="/dashboard"
                className="text-xl font-bold tracking-tight shrink-0"
              >
                BuildSite
              </Link>
            )}
            {open && userName && (
              <span className="text-xs text-muted-foreground truncate">
                {userName}
              </span>
            )}
          </div>
          {/* Desktop toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="hidden md:flex rounded-md p-1.5 text-muted-foreground hover:bg-accent shrink-0"
            aria-label="Toggle sidebar"
          >
            {open ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className={`flex-1 flex flex-col min-h-0 ${!open && "md:hidden"}`}>
          <Separator />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              prefetch={true}
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
                    prefetch={true}
                    onClick={close}
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      pathname === "/dashboard/clients" ||
                      pathname.startsWith("/dashboard/clients/")
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    All Clients
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
                  prefetch={true}
                  onClick={close}
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
          {recentSites.length > 0 && open && (
            <>
              <div className="px-4 pt-2 pb-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  Recent Sites
                </div>
              </div>
              <div className="px-3 pb-2 space-y-0.5 max-h-[180px] overflow-y-auto">
                {recentSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    prefetch={true}
                    onClick={close}
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

          {/* Sign out */}
          <div className="px-3 pb-3 pt-2 shrink-0">
            <Separator className="mb-3" />
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground text-sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {open && "Sign out"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}