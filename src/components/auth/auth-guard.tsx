"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserSession } from "@/hooks/queries/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { CommonsSealVector } from "@/components/brand/logo";

interface AuthGuardProps {
  children: React.ReactNode;
  requireGuest?: boolean;
}

/**
 * Client-Side Auth Guard for Single Page Application (SPA).
 * Protects sanctuary feature routes without requiring server-side middleware.
 */
export function AuthGuard({ children, requireGuest = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useUserSession();
  const authUser = useAuthStore((state) => state.user);

  const activeUser = user !== undefined ? user : authUser;

  useEffect(() => {
    if (isLoading) return;

    if (!requireGuest && !activeUser) {
      // Unauthenticated visitor attempting to access protected route -> redirect to login
      const redirectUrl = pathname && pathname !== "/" ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
    } else if (requireGuest && activeUser) {
      // Authenticated citizen accessing guest-only routes (login/landing) -> redirect to sanctuary home
      router.replace("/home");
    }
  }, [activeUser, isLoading, requireGuest, router, pathname]);

  // Loading state with editorial sanctuary aesthetics
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <CommonsSealVector className="w-16 h-16 text-[#e6b450] animate-pulse" />
          <div className="absolute inset-0 border border-[#e6b450]/20 rounded-full animate-ping pointer-events-none" />
        </div>
        <p className="font-serif italic text-stone-400 text-sm tracking-widest uppercase">
          Verifying Citizen Credentials...
        </p>
      </div>
    );
  }

  // If unauthenticated and route requires auth, render nothing while redirecting
  if (!requireGuest && !activeUser) {
    return null;
  }

  // If authenticated and route requires guest, render nothing while redirecting
  if (requireGuest && activeUser) {
    return null;
  }

  return <>{children}</>;
}
