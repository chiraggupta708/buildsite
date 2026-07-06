"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  return (
    <Button variant="ghost" size="icon" onClick={() => window.history.back()} aria-label="Go back">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}