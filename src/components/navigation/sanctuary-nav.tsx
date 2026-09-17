"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { CommonsLogo } from "@/components/brand/logo";
import { CitizenStatus } from "@/components/brand/citizen-status";
import { useAuthStore } from "@/stores/auth-store";

interface SanctuaryNavProps {
  subtitle?: string;
}

/**
 * Editorial Broadside top colophon header.
 * Minimalist masthead with official seal, live date, and citizen clearance status.
 */
export function SanctuaryNav({
  subtitle = "DIGITAL SANCTUARY",
}: SanctuaryNavProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="border-b border-border/80 bg-muted/30 px-4 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
        <div className="flex items-center gap-3">
          <CommonsLogo
            variant="horizontal"
            size="sm"
            href={isAuthenticated ? "/home" : "/"}
            subtitle={subtitle}
            showFolio
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-[#3368A0]" />
            {todayDate}
          </span>
          <span className="text-border">|</span>
          <CitizenStatus />
        </div>
      </div>
    </header>
  );
}
