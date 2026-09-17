"use client";

import React from "react";
import Link from "next/link";
import { User, LogOut, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { useUserSession, useSignOutMutation } from "@/hooks/queries/use-auth";
import { useAuthStore } from "@/stores/auth-store";

interface CitizenStatusProps {
  compact?: boolean;
}

/**
 * Editorial Broadside Citizen Clearance status indicator.
 * Displays current authenticated user or clear passport action.
 */
export function CitizenStatus({ compact = false }: CitizenStatusProps) {
  const { data: user, isLoading } = useUserSession();
  const authUser = useAuthStore((state) => state.user);
  const { mutate: signOut, isPending: isSigningOut } = useSignOutMutation();

  const currentUser = authUser || user;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin text-[#3368A0]" />
        <span>VERIFYING CITIZEN CLEARANCE...</span>
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
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <Link
            href="/citizen-passport"
            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
            title="Open Citizen Passport"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{displayName}</span>
          </Link>
          <button
            onClick={() => signOut()}
            disabled={isSigningOut}
            title="Sign out of Citizen Ledger"
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <Link
          href="/citizen-passport"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 hover:bg-[#3368A0]/10 border border-border/80 hover:border-[#3368A0]/60 text-foreground transition-all cursor-pointer group"
          title="Open Citizen Passport & Clearance"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF] group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider group-hover:text-[#3368A0] transition-colors">{displayName}</span>
          <span className="text-muted-foreground font-normal hidden sm:inline">({currentUser.email})</span>
        </Link>
        <button
          onClick={() => signOut()}
          disabled={isSigningOut}
          title="Sign out of Citizen Sanctuary"
          className="inline-flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30 transition-all cursor-pointer uppercase tracking-wider"
        >
          {isSigningOut ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <LogOut className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3368A0] text-white hover:bg-[#285380] font-serif text-xs transition-all shadow-xs cursor-pointer"
    >
      <User className="h-3 w-3" />
      <span>Enter Sanctuary</span>
      <ArrowRight className="h-2.5 w-2.5" />
    </Link>
  );
}
