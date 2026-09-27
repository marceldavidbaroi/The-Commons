"use client";

import React from "react";
import Link from "next/link";
import { User, LogOut, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { useUserSession, useSignOutMutation } from "@/hooks/queries/use-auth";
import { useAuthStore } from "@/stores/auth-store";

interface CitizenStatusProps {
  compact?: boolean;
  showEmail?: boolean;
}

/**
 * Editorial Broadside Citizen Clearance status indicator.
 * Displays current authenticated user or clear passport action.
 */
export function CitizenStatus({ compact = false, showEmail = false }: CitizenStatusProps) {
  const { data: user, isLoading } = useUserSession();
  const authUser = useAuthStore((state) => state.user);
  const { mutate: signOut, isPending: isSigningOut } = useSignOutMutation();

  const currentUser = authUser || user;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span className="hidden sm:inline">VERIFYING...</span>
      </div>
    );
  }

  if (currentUser) {
    const displayName =
      currentUser.user_metadata?.full_name ||
      currentUser.email?.split("@")[0] ||
      "Citizen";

    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Link
            href="/citizen-passport"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted text-foreground transition-colors cursor-pointer"
            title={`Citizen Passport (${currentUser.email})`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium truncate max-w-[120px]">{displayName}</span>
          </Link>
          <button
            onClick={() => signOut()}
            disabled={isSigningOut}
            title="Sign out of Citizen Ledger"
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            {isSigningOut ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <LogOut className="h-3 w-3" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <Link
          href="/citizen-passport"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card/80 hover:bg-card border border-border hover:border-primary/50 text-foreground transition-all cursor-pointer group shadow-xs"
          title={`Citizen Passport & Clearance (${currentUser.email})`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider group-hover:text-primary transition-colors truncate max-w-[140px] sm:max-w-[180px]">
            {displayName}
          </span>
          {showEmail && (
            <span className="text-muted-foreground font-normal hidden lg:inline text-[10px]">
              ({currentUser.email})
            </span>
          )}
        </Link>
        <button
          onClick={() => signOut()}
          disabled={isSigningOut}
          title="Sign out of Citizen Sanctuary"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/60 hover:border-destructive/30 transition-all cursor-pointer uppercase tracking-wider"
        >
          {isSigningOut ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <LogOut className="h-3 w-3" />
          )}
          <span className="hidden md:inline text-[10px]">Exit</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-serif text-xs transition-all shadow-xs cursor-pointer"
    >
      <User className="h-3 w-3" />
      <span>Enter</span>
      <ArrowRight className="h-2.5 w-2.5" />
    </Link>
  );
}
