"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Plus, Building2, MapPin, Users, ShoppingCart } from "lucide-react";

const quickActions = [
  {
    href: "/dashboard/clients",
    label: "New Client",
    desc: "Add a client and their site",
    icon: Building2,
  },
  {
    href: "/dashboard/labour",
    label: "New Labour",
    desc: "Add a labourer to directory",
    icon: Users,
  },
  {
    href: "/dashboard/sites",
    label: "Record Purchase",
    desc: "Log a material purchase",
    icon: ShoppingCart,
  },
] as const;

export function QuickAddSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        onClick={() => setOpen(true)}
        className="relative -mt-5 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-200 border-4 border-background text-2xl"
        aria-label="Quick add"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Quick Actions</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pb-6">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3",
                  "hover:bg-accent transition-colors"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}