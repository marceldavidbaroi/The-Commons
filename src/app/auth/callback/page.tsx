"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { CommonsSealVector } from "@/components/brand/logo";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Securing sanctuary connection...");

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      const supabase = createClient();
      const targetDestination =
        searchParams.get("redirectUrl") ||
        searchParams.get("next") ||
        searchParams.get("redirect") ||
        "/home";
      const code = searchParams.get("code");

      try {
        let activeSession = null;

        if (code) {
          setStatusMessage("Exchanging verification token...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Check if session was already established or auto-exchanged
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              activeSession = sessionData.session;
            } else {
              throw error;
            }
          } else {
            activeSession = data.session;
          }
        } else {
          setStatusMessage("Restoring active citizen session...");
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          activeSession = data.session;

          if (!activeSession) {
            // Check if hash has auth parameters
            if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
              setStatusMessage("Validating identity payload...");
              await new Promise((res) => setTimeout(res, 500));
              const { data: hashData } = await supabase.auth.getSession();
              activeSession = hashData.session;
            }
          }
        }

        // Sync to Zustand store before routing
        if (activeSession) {
          useAuthStore.getState().setSession({
            accessToken: activeSession.access_token,
            expiresAt: activeSession.expires_at ?? null,
            user: activeSession.user,
          });
        }

        if (isMounted) {
          setStatusMessage("Sanctuary confirmed. Welcoming citizen...");
          router.replace(targetDestination);
        }
      } catch (err: any) {
        console.error("Auth callback verification error:", err);
        if (isMounted) {
          router.replace(`/login?error=${encodeURIComponent(err.message || "auth_exchange_failed")}`);
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <CommonsSealVector className="w-16 h-16 text-[#e6b450] animate-pulse" />
        <div className="absolute inset-0 border border-[#e6b450]/20 rounded-full animate-ping pointer-events-none" />
      </div>
      <p className="font-serif italic text-stone-300 text-sm tracking-widest uppercase">
        {statusMessage}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
          <CommonsSealVector className="w-12 h-12 text-[#e6b450] animate-pulse" />
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
