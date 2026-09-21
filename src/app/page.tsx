"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Calendar, 
  ShieldCheck,
  BookOpen,
  Sparkles,
  Layers,
  Feather
} from "lucide-react";
import { CommonsSealVector, CommonsLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { CitizenStatus } from "@/components/brand/citizen-status";
import { AuthGuard } from "@/components/auth/auth-guard";
import { 
  DailyDiaryBookSvg, 
  GoalsCompassSvg, 
  CitizenPassportSvg, 
  TagsIndexPlateSvg 
} from "@/components/brand/magazine-illustrations";

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
  const [todayDate, setTodayDate] = useState("Daily Edition");

  useEffect(() => {
    setTodayDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <AuthGuard requireGuest={true}>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        
        {/* 1. TOP BROADSHEET COLOPHON HEADER */}
        <header className="border-b border-border/80 bg-muted/30 px-6 py-3">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
            <div className="flex items-center gap-3">
              <CommonsLogo variant="horizontal" size="sm" href="/" subtitle="DIGITAL SANCTUARY" showFolio />
            </div>
            
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-[#3368A0]" />
                {todayDate}
              </span>
              <span className="text-border">|</span>
              <Link href="/my-diaries" className="hover:text-foreground text-[#3368A0] dark:text-[#66A3BF] font-semibold transition-colors flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>My Diaries</span>
              </Link>
              <span className="text-border hidden sm:inline">|</span>
              <Link href="/goals" className="hover:text-foreground text-muted-foreground transition-colors hidden sm:inline">
                Goals
              </Link>
              <span className="text-border hidden md:inline">|</span>
              <CitizenStatus />
            </div>
          </div>
        </header>

        {/* 2. HERO PUBLICATION MASTHEAD */}
        <section className="max-w-6xl w-full mx-auto px-6 pt-10 pb-4 text-center flex flex-col items-center">
          <Link href="/" className="inline-block group focus:outline-none mb-3">
            <CommonsSealVector 
              size={84} 
              className="transition-transform duration-700 group-hover:scale-105 group-hover:rotate-6 drop-shadow-md" 
            />
          </Link>
          
          <span className="kicker block text-[#3368A0] dark:text-[#66A3BF] mb-2 font-mono text-xs uppercase tracking-widest">
            A Distraction-Free Digital Sanctuary
          </span>
          
          <h1 className="masthead-title text-4xl sm:text-6xl md:text-7xl tracking-tight text-foreground font-serif font-bold">
            THE COMMONS
          </h1>
          
          <p className="font-serif italic text-base sm:text-xl text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
            Quiet personal journaling and mindful records, shaped with broadsheet typography and sovereign security.
          </p>

          {/* Folio Line */}
          <div className="folio-bar w-full py-2.5 my-5 flex items-center justify-between text-muted-foreground text-xs font-mono border-t-2 border-b border-border">
            <span>VOL. I — NO. 01</span>
            <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">Littera Scripta Manet</span>
            <span>AUTUMN 2026 EDITION</span>
          </div>
        </section>

        {/* 3. HERO BROADSIDE SPREAD (LEAD FEATURE) */}
        <section className="max-w-6xl w-full mx-auto px-6 pb-12">
          <div className="border-t-2 border-b-2 border-border py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border">
            
            {/* Left 7 Cols: Lead Feature Story */}
            <div className="lg:col-span-7 lg:pr-6 space-y-5">
              <div className="space-y-2">
                <span className="kicker text-[#8C3A27] dark:text-[#E59375] font-mono text-xs uppercase font-bold tracking-wider block">
                  § 01 • THE DAILY PRACTICE
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.12]">
                  Reclaiming the Dignity of the Written Word.
                </h2>
                <p className="text-sm text-foreground/90 leading-relaxed font-serif">
                  A sanctuary free from algorithms, notification bells, and telemetry. Write your daily thoughts on aged parchment textures with rich typography and private cryptographic storage.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link href="/my-diaries" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-11 bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif text-sm tracking-wide gap-2 rounded-none px-6 shadow-xs cursor-pointer transition-all"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Open My Diaries</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>

                <Link href="/login" className="w-full sm:w-auto">
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="w-full sm:w-auto h-11 border-border hover:bg-muted font-mono text-xs rounded-none px-5 cursor-pointer gap-2"
                  >
                    <GoogleIcon className="h-4 w-4" />
                    <span>Citizen Sign In</span>
                  </Button>
                </Link>
              </div>

              {/* Broadsheet Footnote Highlights */}
              <div className="pt-3 grid grid-cols-3 gap-2 text-[11px] font-mono text-muted-foreground border-t border-border/80">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#3368A0] shrink-0" />
                  <span>Postgres RLS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#C48C28] shrink-0" />
                  <span>Autosaved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#6B8E23] shrink-0" />
                  <span>Zero Ads</span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Tactile Book Illustration Vignette */}
            <div className="lg:col-span-5 lg:pl-6 pt-6 lg:pt-0 flex flex-col items-center justify-center">
              <div className="text-center space-y-3">
                <span className="font-mono text-[10px] uppercase text-[#8C3A27] dark:text-[#E59375] font-semibold tracking-widest block">
                  PRIMARY SANCTUARY TOME
                </span>

                <Link href="/my-diaries" className="block focus:outline-none" title="Open My Diaries">
                  <DailyDiaryBookSvg className="w-full max-w-[210px] mx-auto" />
                </Link>

                <p className="font-serif italic text-xs text-muted-foreground pt-1">
                  Aged parchment texture, walnut ink & mindful daily prompts.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 4. THREE MAGAZINE BROADSIDE COLUMNS */}
        <section className="max-w-6xl w-full mx-auto px-6 pb-12">
          <div className="flex items-center justify-between border-b-2 border-border pb-2 mb-6">
            <span className="kicker text-[#3368A0] dark:text-[#66A3BF] font-mono text-xs uppercase font-bold tracking-wider">
              § 02 • THE THREE FOUNDATIONAL SPACES
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              OVERVIEW
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
            
            {/* Column 1: Citizen Passport */}
            <div className="space-y-4 md:pr-6 pt-4 md:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#3368A0] dark:text-[#66A3BF] font-bold uppercase tracking-wider">
                  [01] IDENTITY
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">SOVEREIGN</span>
              </div>

              <div className="flex justify-center py-1">
                <Link href="/citizen-passport" className="block focus:outline-none" title="Citizen Passport">
                  <CitizenPassportSvg className="w-full max-w-[170px]" />
                </Link>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Citizen Passport
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cryptographic user isolation with Postgres Row-Level Security. Complete ownership of your data with zero tracking.
                </p>
              </div>

              <Link href="/citizen-passport" className="block pt-1">
                <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                  <span>Explore Passport</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>

            {/* Column 2: Goals & Roadmap */}
            <div className="space-y-4 md:px-6 pt-6 md:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#3368A0] dark:text-[#66A3BF] font-bold uppercase tracking-wider">
                  [02] PURPOSE
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">ROADMAP</span>
              </div>

              <div className="flex justify-center py-1">
                <Link href="/goals" className="block focus:outline-none" title="Goals & Roadmap">
                  <GoalsCompassSvg className="w-full max-w-[170px]" />
                </Link>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Goals & Roadmap
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Set meaningful milestones, cultivate daily habits, and review your personal journey through structured roadmaps.
                </p>
              </div>

              <Link href="/goals" className="block pt-1">
                <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                  <span>Explore Goals</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>

            {/* Column 3: Tag Taxonomy & Archive */}
            <div className="space-y-4 md:pl-6 pt-6 md:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8B5CF6] dark:text-[#A78BFA] font-bold uppercase tracking-wider">
                  [03] STRUCTURE
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">INDEX</span>
              </div>

              <div className="flex justify-center py-1">
                <Link href="/tag-management" className="block focus:outline-none" title="Tag Taxonomy">
                  <TagsIndexPlateSvg className="w-full max-w-[170px]" />
                </Link>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Tag Taxonomy
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Organize entries with tailored color tags and taxonomy filters, making every past reflection effortless to locate.
                </p>
              </div>

              <Link href="/tag-management" className="block pt-1">
                <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#8B5CF6] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                  <span>Explore Tags</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>

          </div>
        </section>

        {/* 5. EDITORIAL PULL QUOTE BULLETIN */}
        <section className="max-w-6xl w-full mx-auto px-6 pb-14">
          <div className="border-t-2 border-b-2 border-[#3368A0] py-8 px-6 text-center bg-muted/20">
            <p className="font-serif italic text-lg sm:text-2xl text-foreground/90 max-w-2xl mx-auto leading-snug">
              &ldquo;We write not to impress the ephemeral crowd, but to anchor our own soul in the quiet stream of time.&rdquo;
            </p>
            <span className="block mt-3 font-mono text-[11px] uppercase tracking-widest text-[#3368A0] dark:text-[#66A3BF]">
              — The Commons Editorial Broadside
            </span>
          </div>
        </section>

        {/* 6. BROADSHEET FOOTER */}
        <footer className="border-t-2 border-border mt-auto bg-muted/30 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-3">
              <CommonsSealVector size={20} markOnly />
              <span className="font-bold text-foreground font-serif text-sm">THE COMMONS</span>
              <span>•</span>
              <span>PUBLIC BROADSHEET & DIGITAL SANCTUARY</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/my-diaries" className="hover:text-foreground">My Diaries</Link>
              <span>•</span>
              <Link href="/goals" className="hover:text-foreground">Goals</Link>
              <span>•</span>
              <Link href="/citizen-passport" className="hover:text-foreground">Passport</Link>
              <span>•</span>
              <Link href="/tag-management" className="hover:text-foreground">Tags</Link>
              <span>•</span>
              <Link href="/settings" className="hover:text-foreground">Settings</Link>
            </div>
          </div>
        </footer>

      </div>
    </AuthGuard>
  );
}



