"use client";

import { useState, useCallback, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  action?: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
  action,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex items-center justify-between cursor-pointer select-none group"
        onClick={toggle}
      >
        <div className="flex items-center gap-2 text-xl font-semibold">
          {icon}
          <h2>{title}</h2>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open ? "" : "-rotate-90"
            )}
          />
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>{action}</div>
        )}
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pt-1">{children}</div>
      </div>
    </div>
  );
}