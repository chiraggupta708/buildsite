"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { QuickAddSheet } from "./quick-add-sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/sites", label: "Sites", icon: "🏢" },
  { href: "/dashboard/labour", label: "Labour", icon: "👷" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur-xl pb-safe">
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {/* Left items (Dashboard, Sites) */}
        {navItems.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 min-w-[64px]",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="absolute bottom-0.5 h-1 w-6 rounded-full bg-primary" />
            )}
          </Link>
        ))}

        {/* FAB - center */}
        <div className="relative flex shrink-0 items-center justify-center">
          <QuickAddSheet />
        </div>

        {/* Right items (Labour, Settings) */}
        {navItems.slice(2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 min-w-[64px] relative",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="absolute bottom-0.5 h-1 w-6 rounded-full bg-primary" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}