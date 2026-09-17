"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  RefreshCw,
  Calendar,
  Lock,
  AlertCircle
} from "lucide-react";
import { CommonsSealVector } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useGoogleSignInMutation } from "@/hooks/queries/use-auth";
import { useAuthStore } from "@/stores/auth-store";

/* ==========================================================================
   OFFICIAL GOOGLE SVG VECTOR
   ========================================================================== */
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.7c-.2-.7-.4-1.7-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const authError = useAuthStore((state) => state.authError);
  const setAuthError = useAuthStore((state) => state.setAuthError);
  const { mutate: signInWithGoogle, isPending: isMutating } = useGoogleSignInMutation();

  const [urlError] = useState<string | null>(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_exchange_failed") {
      return "Authentication verification failed or session expired. Please attempt sign-in again.";
    }
    if (errorParam) {
      return `Authentication error: ${errorParam}`;
    }
    return null;
  });

  const activeErrorMessage = authError || urlError;

  const handleGoogleSignIn = () => {
    const redirectTarget = searchParams.get("redirect") || searchParams.get("next") || "/home";
    signInWithGoogle({ redirectTo: redirectTarget });
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      
      {/* Top Colophon / Micro Masthead */}
      <header className="border-b border-border/80 bg-muted/30 px-6 py-2.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-1.5 font-semibold text-[#3368A0] dark:text-[#66A3BF] hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>THE COMMONS BROADSHEET</span>
            </Link>
            <span>•</span>
            <span>CITIZEN ACCESS DESK</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#3368A0]" />
              {currentDate}
            </span>
          </div>
        </div>
      </header>

      {/* Main Centered Editorial Broadside Container */}
      <main className="max-w-2xl w-full mx-auto px-6 py-12 sm:py-16 flex-1 flex flex-col justify-center">
        
        {/* Editorial Broadsheet Masthead */}
        <div className="text-center space-y-3 pb-8">
          <Link href="/" className="inline-block group focus:outline-none mb-1">
            <CommonsSealVector 
              size={84} 
              className="mx-auto transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6 drop-shadow-sm" 
            />
          </Link>
          
          <span className="kicker block text-[#3368A0] dark:text-[#66A3BF]">
            ENTRY PROTOCOL § CITIZEN CLEARANCE
          </span>
          
          <h1 className="masthead-title text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground">
            THE COMMONS
          </h1>
          
          <p className="font-serif italic text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Tactile digital sanctuary for reflection, community, and craft.
          </p>

          {/* Folio Bar */}
          <div className="folio-bar w-full py-2 my-4 flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>VOL. I — NO. 01</span>
            <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">Littera Scripta Manet</span>
            <span>AUTUMN / 2026</span>
          </div>
        </div>

        {/* PRIMARY ACTION: DIRECT GOOGLE LOGIN PORTAL */}
        <div className="border-t-2 border-b-2 border-[#3368A0] py-8 sm:py-10 space-y-6">
          
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Enter Your Sovereign Ledger
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Authenticate with your Google account to access your personal daily diaries, monograph drafts, and encrypted broadsheet archives.
            </p>
          </div>

          {/* Error Notice Display */}
          {activeErrorMessage && (
            <div className="max-w-md mx-auto p-3.5 border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider block">DISPATCH NOTICE</span>
                <span>{activeErrorMessage}</span>
              </div>
            </div>
          )}

          {/* Big, Unmistakable Google Login Button */}
          <div className="max-w-md mx-auto space-y-4 pt-2">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isMutating}
              className="w-full h-14 bg-card hover:bg-muted text-foreground border-2 border-[#3368A0] dark:border-[#66A3BF] rounded-none font-serif text-base font-semibold tracking-wide gap-3.5 cursor-pointer shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isMutating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin text-[#3368A0]" />
                  <span>Entering Citizen Ledger...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="h-6 w-6 shrink-0" />
                  <span className="text-[#1E2D3D] dark:text-[#F2EFE7]">
                    Continue with Google
                  </span>
                </>
              )}
            </Button>

            {/* Micro Colophon Guarantee Notes */}
            <div className="pt-2 flex items-center justify-center gap-6 text-[11px] font-mono text-muted-foreground uppercase">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
                PostgreSQL RLS
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
                Zero Tracking
              </span>
            </div>
          </div>

        </div>

        {/* Editorial Pull Quote / Footnote */}
        <div className="pt-8 text-center space-y-2">
          <p className="font-serif italic text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            &ldquo;An unexamined day is a loose page blown by the wind; recorded, it becomes a volume.&rdquo;
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground">
            <Link href="/" className="hover:text-foreground hover:underline">
              ← Return to Broadsheet
            </Link>
            <span>•</span>
            <Link href="/dev/design-system" className="hover:text-foreground hover:underline">
              Design Specs
            </Link>
          </div>
        </div>

      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-border/80 bg-muted/20 py-5 px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <CommonsSealVector size={16} markOnly />
            <span className="font-serif font-bold text-foreground">The Commons</span>
            <span>•</span>
            <span>CITIZEN REGISTRY</span>
          </div>
          <span>CERTIFIED BROADSHEET PROTOCOL 4.2</span>
        </div>
      </footer>

    </div>
  );
}

import { AuthGuard } from "@/components/auth/auth-guard";

export default function LoginPage() {
  return (
    <AuthGuard requireGuest={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-[#3368A0]" />
            <span>LOADING CITIZEN ACCESS DESK...</span>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </AuthGuard>
  );
}

