"use client";

import { type ReactNode } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
  return (
    <div className={cn("space-y-2", className)}>
      <Accordion
        defaultValue={defaultOpen ? ["content"] : undefined}
      >
        <AccordionItem value="content" className="border-0">
          <AccordionTrigger className="flex items-center justify-between gap-2 py-0 hover:no-underline">
            <div className="flex items-center gap-2 text-xl font-semibold">
              {icon}
              <h2>{title}</h2>
            </div>
            {action && (
              <div onClick={(e) => e.stopPropagation()}>{action}</div>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-1">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}