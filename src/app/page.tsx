import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Feather, 
  Calendar, 
  Clock, 
  ShieldCheck,
  Sliders
} from "lucide-react";
import { CommonsSealVector, CommonsLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "The Commons — A Tactile Digital Sanctuary & Editorial Broadside",
  description: "An authentic magazine broadsheet for daily journaling, reflective inquiry, and encrypted record-keeping.",
};

/* ==========================================================================
   OFFICIAL GOOGLE SVG VECTOR
   ========================================================================== */
function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
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

export default function LandingPage() {
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      
      {/* 1. TOP COLOPHON & MICRO MASTHEAD */}
      <header className="border-b border-border/80 bg-muted/30 px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
          <div className="flex items-center gap-3">
            <CommonsLogo variant="horizontal" size="sm" href="/" subtitle="DIGITAL SANCTUARY" showFolio />
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#3368A0]" />
              {todayDate}
            </span>
            <span className="text-border">|</span>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3368A0] text-white hover:bg-[#285380] font-serif text-xs transition-colors shadow-xs"
            >
              <GoogleIcon className="h-3 w-3" />
              <span>Enter Sanctuary</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO PUBLICATION MASTHEAD */}
      <section className="max-w-6xl w-full mx-auto px-6 pt-10 pb-6 text-center flex flex-col items-center">
        <Link href="/" className="inline-block group focus:outline-none mb-3">
          <CommonsSealVector 
            size={92} 
            className="transition-transform duration-700 group-hover:scale-105 group-hover:rotate-6 drop-shadow-md" 
          />
        </Link>
        
        <span className="kicker block text-[#3368A0] dark:text-[#66A3BF] mb-1">
          AN EDITORIAL BROADSIDE & DIGITAL SANCTUARY § EST. 2026
        </span>
        
        <h1 className="masthead-title text-5xl sm:text-7xl md:text-8xl tracking-tight text-foreground">
          THE COMMONS
        </h1>
        
        <p className="font-serif italic text-base sm:text-xl text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
          A timeless haven for reflection, private journaling, and cryptographic record-keeping.
        </p>

        {/* Folio Line */}
        <div className="folio-bar w-full py-2.5 my-6 flex items-center justify-between text-muted-foreground text-xs font-mono">
          <span>VOL. I — NO. 01</span>
          <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">Littera Scripta Manet</span>
          <span>AUTUMN / 2026 EDITION</span>
        </div>
      </section>

      {/* 3. HERO PROCLAMATION & CALL TO ACTION */}
      <section className="max-w-6xl w-full mx-auto px-6 pb-16">
        <div className="border-t-2 border-b-2 border-[#3368A0] py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
              § 01 • THE EDITORIAL DOCTRINE
            </span>
            
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.08]">
              Reclaiming the Dignity of the Written Word.
            </h2>
            
            <p className="drop-cap text-base text-foreground/90 leading-relaxed font-serif">
              In an age of frenzied feeds, intrusive telemetry, and disposable notifications, The Commons offers an enduring digital retreat. Here, your daily journal entries, philosophical monographs, and archived records are shaped with high-craft editorial broadsheet typography and secured by strict PostgreSQL Row-Level Security.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-12 bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-sm tracking-wide gap-3 rounded-none px-6 shadow-md cursor-pointer transition-all"
                >
                  <GoogleIcon className="h-4 w-4" />
                  <span>Enter with Google Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link href="/dev/design-system" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto h-12 border-border hover:bg-muted font-mono text-xs rounded-none px-5 cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5 mr-2 text-[#3368A0] dark:text-[#66A3BF]" />
                  <span>Inspect Design Codex</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Tactile Book Preview Illustration */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-muted/20 border border-border/80">
            <div className="text-center space-y-3">
              <span className="font-mono text-[10px] uppercase text-[#8C3A27] dark:text-[#E59375] font-semibold tracking-widest block">
                PRIMARY SANCTUARY TOME
              </span>
              
              <Link href="/login" className="group block focus:outline-none" title="Enter Daily Diary">
                <svg
                  viewBox="0 0 320 240"
                  className="w-full max-w-[240px] mx-auto drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-1 cursor-pointer"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="landCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8C3A27" />
                      <stop offset="50%" stopColor="#732E1E" />
                      <stop offset="100%" stopColor="#4A1C12" />
                    </linearGradient>
                    <linearGradient id="landSpineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#5E2214" />
                      <stop offset="100%" stopColor="#8C3A27" />
                    </linearGradient>
                  </defs>

                  <rect x="25" y="15" width="270" height="210" rx="10" fill="url(#landCoverGrad)" stroke="#4A1C12" strokeWidth="2" />
                  <rect x="25" y="15" width="26" height="210" rx="3" fill="url(#landSpineGrad)" />
                  <line x1="51" y1="15" x2="51" y2="225" stroke="#3A140B" strokeWidth="2" />
                  <line x1="30" y1="40" x2="46" y2="40" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
                  <line x1="30" y1="200" x2="46" y2="200" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
                  <rect x="62" y="26" width="222" height="188" rx="6" fill="none" stroke="#C48C28" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.8" />
                  <rect x="85" y="55" width="176" height="130" rx="4" fill="#F4EAD4" stroke="#8C3A27" strokeWidth="1.5" />
                  <text x="173" y="95" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="18" fontWeight="bold" letterSpacing="0.05em">
                    DAILY DIARY
                  </text>
                  <text x="173" y="115" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="9" letterSpacing="0.15em">
                    VOL. I — NO. 142
                  </text>
                  <circle cx="173" cy="148" r="18" fill="#8C3A27" />
                  <circle cx="173" cy="148" r="15" fill="none" stroke="#FAF4EB" strokeWidth="1" strokeDasharray="2 2" />
                  <text x="173" y="152" textAnchor="middle" fill="#FAF4EB" fontFamily="serif" fontSize="11" fontWeight="bold">
                    C
                  </text>
                </svg>
              </Link>

              <p className="font-serif italic text-xs text-muted-foreground pt-1">
                The Daily Diary: aged tea-stained parchment, walnut ink, and mindful rhythm tracking.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. THREE PILLARS OF CRAFT & SECURITY */}
      <section className="max-w-6xl w-full mx-auto px-6 pb-16">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
              § 02 • THE THREE FOUNDATIONAL PILLARS
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              CORE TENETS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1 */}
            <div className="border-t-2 border-[#3368A0] pt-4 space-y-3">
              <div className="flex items-center gap-2 text-[#3368A0] dark:text-[#66A3BF]">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">[01] SOVEREIGNTY</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                Cryptographic User Isolation
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every diary reflection and vault item is bound exclusively to your user identity with Postgres Row-Level Security. We enforce zero telemetry and zero corporate data harvesting.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="border-t-2 border-[#8C3A27] pt-4 space-y-3">
              <div className="flex items-center gap-2 text-[#8C3A27] dark:text-[#E59375]">
                <Feather className="h-5 w-5" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">[02] TACTILITY</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                Broadside & Ink Aesthetics
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Refusing generic floating SaaS cards. Structured with hairline rules, mastheads, drop-caps, and warm Scandinavian linen tones designed for deep reading and calm thought.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="border-t-2 border-[#6B8E23] pt-4 space-y-3">
              <div className="flex items-center gap-2 text-[#6B8E23] dark:text-[#A3C95A]">
                <Clock className="h-5 w-5" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">[03] FOCUS</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                Unbroken Reflection
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A single-page, fluid interface free from dopamine traps, algorithmic recommendations, or endless scrolling feeds. Your thoughts remain your sanctuary.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. EDITORIAL PULL QUOTE */}
      <section className="max-w-4xl w-full mx-auto px-6 pb-16 text-center">
        <div className="pull-quote py-6 px-8 bg-muted/20 border-l-4 border-[#3368A0] text-left sm:text-center">
          <p className="font-serif italic text-lg sm:text-2xl text-foreground/90 leading-snug">
            &ldquo;We write not to impress the ephemeral crowd, but to anchor our own soul in the quiet stream of time.&rdquo;
          </p>
          <span className="block mt-3 font-mono text-[11px] uppercase tracking-widest text-[#3368A0] dark:text-[#66A3BF]">
            — The Commons Editorial Manifesto § Vol. I
          </span>
        </div>
      </section>

      {/* 6. CALL TO ACTION REGISTRY SEAL */}
      <section className="max-w-6xl w-full mx-auto px-6 pb-20">
        <div className="border-2 border-[#3368A0] dark:border-[#66A3BF] p-8 sm:p-12 text-center bg-card flex flex-col items-center space-y-6">
          <CommonsSealVector size={96} className="hover:scale-105 transition-transform duration-300" />
          
          <div className="space-y-2 max-w-lg">
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              Affix Your Seal & Enter The Commons
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-serif">
              Join the sanctuary today. Access your personal diary, citizen ledger, and archives with a single click.
            </p>
          </div>

          <Link href="/login">
            <Button
              size="lg"
              className="h-13 bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-sm tracking-wide gap-3 rounded-none px-8 shadow-md cursor-pointer transition-all"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-muted-foreground uppercase pt-2">
            <span>TLS 1.3 ENCRYPTED</span>
            <span>•</span>
            <span>POSTGRESQL RLS</span>
            <span>•</span>
            <span>ZERO ADS</span>
          </div>
        </div>
      </section>

      {/* 7. EDITORIAL FOOTER */}
      <footer className="border-t-2 border-border mt-auto bg-muted/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <CommonsSealVector size={20} markOnly />
            <span className="font-bold text-foreground font-serif text-sm">THE COMMONS</span>
            <span>•</span>
            <span>PUBLIC BROADSHEET & LANDING DESK</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Citizen Login</Link>
            <span>•</span>
            <Link href="/dev/design-system" className="hover:text-foreground">Design Codex</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
