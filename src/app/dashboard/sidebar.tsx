"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Building2,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Clock,
} from "lucide-react";

type Site = {
  id: string;
  name: string;
  client: { name: string };
  status: string;
};

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("buildsite_sidebar_open");
    return stored === null ? true : stored === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recentSites, setRecentSites] = useState<Site[]>([]);


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

  const closeMobile = () => setMobileOpen(false);

  // Desktop sidebar content (shared between inline and mobile sheet)
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 min-h-[52px] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {(open || mobileOpen) && (
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className="text-xl font-bold tracking-tight shrink-0 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              BuildSite
            </Link>
          )}
          {(open || mobileOpen) && userName && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground truncate">
              {userName}
            </span>
          )}
        </div>
        {/* Desktop toggle - hidden in sheet */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="hidden md:flex shrink-0"
          aria-label="Toggle sidebar"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        {/* Dashboard */}
        {open || mobileOpen ? (
          <Link
            href="/dashboard"
            prefetch={true}
            onClick={closeMobile}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isDashboard
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            <span>Dashboard</span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            prefetch={true}
            className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isDashboard
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          </Link>
        )}

        {/* Clients & Sites */}
        {(open || mobileOpen) ? (
          <Accordion
            multiple
            defaultValue={isClients ? ["clients"] : undefined}
          >
            <AccordionItem value="clients" className="border-none">
              <AccordionTrigger
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:no-underline ${
                  isClients
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
                }`}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Clients & Sites</span>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="ml-2 space-y-1 border-l-2 border-muted pl-3">
                  <Link
                    href="/dashboard/clients"
                    prefetch={true}
                    onClick={closeMobile}
                    className={`block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                      pathname === "/dashboard/clients" ||
                      pathname.startsWith("/dashboard/clients/")
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
                    }`}
                  >
                    All Clients
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <Link
            href="/dashboard/clients"
            prefetch={true}
            className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isClients
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
            }`}
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
          </Link>
        )}

        {/* Labour */}
        {(open || mobileOpen) ? (
          <Accordion
            multiple
            defaultValue={isLabour ? ["labour"] : undefined}
          >
            <AccordionItem value="labour" className="border-none">
              <AccordionTrigger
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:no-underline ${
                  isLabour
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
                }`}
              >
                <HardHat className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Labour</span>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="ml-2 space-y-1 border-l-2 border-muted pl-3">
                  <Link
                    href="/dashboard/labour"
                    prefetch={true}
                    onClick={closeMobile}
                    className={`block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                      pathname === "/dashboard/labour" ||
                      pathname.startsWith("/dashboard/labour/")
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
                    }`}
                  >
                    All Labours
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <Link
            href="/dashboard/labour"
            prefetch={true}
            className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isLabour
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
            }`}
          >
            <HardHat className="h-4 w-4 flex-shrink-0" />
          </Link>
        )}
      </nav>

      {/* Recent Sites */}
      {(open || mobileOpen) && recentSites.length > 0 && (
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
                onClick={closeMobile}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-200 ${
                  pathname === `/dashboard/sites/${site.id}`
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:translate-x-0.5"
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
          onClick={() => {
            closeMobile();
            signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {(open || mobileOpen) && "Sign out"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <div className="fixed top-3 left-3 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex shrink-0 items-center justify-center rounded-xl size-10 border bg-card/90 shadow-sm backdrop-blur hover:bg-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r bg-sidebar/80 shadow-[12px_0_40px_-32px_rgb(15_23_42/0.55)] backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0 ${
          open ? "w-64" : "w-16"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}