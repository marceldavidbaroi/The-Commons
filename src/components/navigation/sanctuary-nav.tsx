"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar, 
  Compass, 
  BookOpen, 
  Target, 
  CheckSquare,
  Tag as TagIcon, 
  Settings, 
  Menu, 
  X,
  User
} from "lucide-react";
import { CommonsLogo } from "@/components/brand/logo";
import { CitizenStatus } from "@/components/brand/citizen-status";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface SanctuaryNavProps {
  subtitle?: string;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "Desk", href: "/home", icon: Compass },
  { label: "Diaries", href: "/my-diaries", icon: BookOpen, matchPrefix: true },
  { label: "Goals", href: "/goals", icon: Target, matchPrefix: true },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, matchPrefix: true },
  { label: "Tags", href: "/tag-management", icon: TagIcon, matchPrefix: true },
];

/**
 * Editorial Broadside top colophon header.
 * Redesigned to be ultra-compact, responsive, and high-utility with quick navigation.
 */
export function SanctuaryNav({
  subtitle,
  className,
}: SanctuaryNavProps) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const todayDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isItemActive = (item: NavItem) => {
    if (item.href === "/home" && (pathname === "/home" || pathname === "/")) {
      return true;
    }
    if (item.matchPrefix) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border/80 bg-background/95 text-foreground transition-all", className)}>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand Mark & Context */}
        <div className="flex items-center gap-3 shrink-0">
          <CommonsLogo
            variant="horizontal"
            size="xs"
            href={isAuthenticated ? "/home" : "/"}
            showFolio={false}
            className="gap-2"
          />

          {subtitle && (
            <div className="hidden xl:flex items-center gap-2 pl-2.5 border-l border-border/70 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span className="truncate max-w-[160px]">{subtitle}</span>
            </div>
          )}
        </div>

        {/* Center: Primary Navigation Switcher (Desktop / Tablet) */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs font-mono">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer font-medium",
                    active
                      ? "bg-card text-primary font-semibold shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Date, Theme, Settings, & Citizen Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Subtle Date (Hidden on mobile & medium screens) */}
          <span className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-muted-foreground uppercase mr-1">
            <Calendar className="h-3 w-3 text-primary/70" />
            <span>{todayDate}</span>
          </span>

          {/* Theme Palette Switcher */}
          <ThemeSelector compact />

          {/* Direct Settings Link */}
          {isAuthenticated && (
            <Link
              href="/settings"
              className={cn(
                "p-1.5 rounded-md border text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer shadow-xs",
                pathname === "/settings"
                  ? "border-primary bg-card text-primary ring-1 ring-primary/40"
                  : "border-border bg-card/80 hover:border-primary/50"
              )}
              title="Sanctuary Settings & Preferences"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Citizen Status Pill */}
          <CitizenStatus compact={false} showEmail={false} />

          {/* Mobile Menu Toggle Button */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer ml-1"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Dropdown Tray */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-all",
                    active
                      ? "bg-primary/10 border-primary text-primary font-semibold"
                      : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1.5 hover:text-foreground p-1"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </Link>

            <Link
              href="/citizen-passport"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1.5 hover:text-foreground p-1"
            >
              <User className="h-3.5 w-3.5" />
              <span>Passport</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
