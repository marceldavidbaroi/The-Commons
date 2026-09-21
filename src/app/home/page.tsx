"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Calendar,
  Clock, 
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { CommonsSealVector } from "@/components/brand/logo";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { 
  DailyDiaryBookSvg, 
  GoalsCompassSvg, 
  CitizenPassportSvg, 
  TagsIndexPlateSvg, 
  SettingsDialSvg 
} from "@/components/brand/magazine-illustrations";

export default function HomePage() {
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">

        {/* Top Editorial Colophon Header */}
        <SanctuaryNav subtitle="CITIZEN BROADSIDE" />

        {/* Broadsheet Masthead */}
        <header className="max-w-6xl w-full mx-auto px-6 pt-8 pb-3 text-center flex flex-col items-center">
          <Link href="/home" className="inline-block group focus:outline-none mb-2">
            <CommonsSealVector 
              size={68} 
              className="transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6 drop-shadow-sm" 
            />
          </Link>
          
          <span className="kicker block text-[#3368A0] dark:text-[#66A3BF] mb-1 font-mono text-xs uppercase tracking-widest">
            AUTHENTICATED CITIZEN DESK & ARCHIVE
          </span>

          <h1 className="masthead-title text-4xl sm:text-6xl md:text-7xl tracking-tight text-foreground font-serif font-bold">
            THE COMMONS
          </h1>
          
          <p className="font-serif italic text-sm sm:text-base text-muted-foreground mt-1 max-w-lg mx-auto">
            A quiet broadside for daily journaling, deliberate goals, and personal records.
          </p>

          {/* Broadside Folio Bar */}
          <div className="folio-bar w-full py-2 my-4 flex items-center justify-between text-muted-foreground text-xs font-mono border-t-2 border-b border-border">
            <span>VOL. I — NO. 01</span>
            <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">Littera Scripta Manet</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-[#3368A0]" />
              {todayDate}
            </span>
          </div>
        </header>

        {/* Broadsheet Magazine Main Desk */}
        <main className="max-w-6xl w-full mx-auto px-6 pb-16 flex-1 space-y-12">
          
          {/* SECTION 1: LEAD SPREAD (Daily Journal + Quick Identity) */}
          <section className="border-t-2 border-b-2 border-border py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border">
            
            {/* Left 7 Cols: Lead Story / Daily Diary */}
            <div className="lg:col-span-7 lg:pr-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="kicker text-[#8C3A27] dark:text-[#E59375] font-mono text-xs uppercase font-bold tracking-wider">
                  § 01 • PRIMARY TOME
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#8C3A27]" />
                  DAILY RITUAL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-1">
                <div className="sm:col-span-5 flex justify-center">
                  <Link href="/my-diaries" className="block focus:outline-none" title="Open My Diaries">
                    <DailyDiaryBookSvg className="w-full max-w-[190px]" />
                  </Link>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                    The Daily Journal
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A timeless tactile parchment canvas for capturing your daily thoughts, gratitude, and reflections in calm focus.
                  </p>
                  
                  <div className="pt-2 flex items-center gap-3">
                    <Link href="/my-diaries">
                      <button className="px-5 py-2.5 bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif text-xs tracking-wide flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                        <span>Write Today&apos;s Leaf</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/80 pt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#C48C28]" />
                  AUTOSAVE ENABLED
                </span>
                <span>SOVEREIGN POSTGRES RLS</span>
              </div>
            </div>

            {/* Right 5 Cols: Citizen Passport Story */}
            <div className="lg:col-span-5 lg:pl-6 pt-6 lg:pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <span className="kicker text-[#3368A0] dark:text-[#66A3BF] font-mono text-xs uppercase font-bold tracking-wider">
                  § 02 • SANCTUARY CREDENTIALS
                </span>
                <span className="text-[11px] font-mono text-[#6B8E23] dark:text-[#A3C95A] font-semibold">
                  STATUS: VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center pt-1">
                <div className="sm:col-span-5 flex justify-center">
                  <Link href="/citizen-passport" className="block focus:outline-none" title="Open Passport">
                    <CitizenPassportSvg className="w-full max-w-[170px]" />
                  </Link>
                </div>

                <div className="sm:col-span-7 space-y-2">
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Citizen Passport
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your cryptographic citizen identity, journal statistics, and security clearance credentials.
                  </p>
                  <div className="pt-1">
                    <Link href="/citizen-passport">
                      <button className="px-4 py-2 bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-xs tracking-wide flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                        <span>Inspect Passport</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/80 pt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#3368A0]" />
                  PRIVATE CLEARANCE
                </span>
                <span>LEVEL 1</span>
              </div>
            </div>

          </section>

          {/* SECTION 2: BROADSIDE DEPARTMENTS GAZETTE (3-Column Layout) */}
          <section className="space-y-6">
            
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF] font-mono text-xs uppercase font-bold tracking-wider">
                EDITORIAL GAZETTE & WORKSPACES
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                DEPT. DIRECTORY
              </span>
            </div>

            {/* 3 Magazine Broadside Columns with vertical hairline dividers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
              
              {/* Column 1: Goals & Roadmap */}
              <div className="space-y-4 md:pr-6 pt-4 md:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#3368A0] dark:text-[#66A3BF] font-bold uppercase tracking-wider">
                    § 03 • OBJECTIVES
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">ROADMAP</span>
                </div>

                <div className="flex justify-center py-2">
                  <Link href="/goals" className="block focus:outline-none" title="Open Goals">
                    <GoalsCompassSvg className="w-full max-w-[180px]" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Goals & Objectives
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Set personal milestones, track active targets, and align your daily habits with clarity.
                  </p>
                </div>

                <Link href="/goals" className="block pt-2">
                  <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                    <span>Open Goals Ledger</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>

              {/* Column 2: Tag Management & Taxonomy */}
              <div className="space-y-4 md:px-6 pt-6 md:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#8B5CF6] dark:text-[#A78BFA] font-bold uppercase tracking-wider">
                    § 04 • TAXONOMY
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">INDEX</span>
                </div>

                <div className="flex justify-center py-2">
                  <Link href="/tag-management" className="block focus:outline-none" title="Manage Tags">
                    <TagsIndexPlateSvg className="w-full max-w-[180px]" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Tag Taxonomy
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Organize your leaves, monographs, and archives with custom label tags and color indicators.
                  </p>
                </div>

                <Link href="/tag-management" className="block pt-2">
                  <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#8B5CF6] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                    <span>Manage Taxonomy</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>

              {/* Column 3: System Settings */}
              <div className="space-y-4 md:pl-6 pt-6 md:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#66A3BF] dark:text-[#C8DFDB] font-bold uppercase tracking-wider">
                    § 05 • PREFERENCES
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">SYSTEM</span>
                </div>

                <div className="flex justify-center py-2">
                  <Link href="/settings" className="block focus:outline-none" title="System Settings">
                    <SettingsDialSvg className="w-full max-w-[180px]" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    System Settings
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tune typography size, reading density, dark mode appearance, and security configurations.
                  </p>
                </div>

                <Link href="/settings" className="block pt-2">
                  <button className="w-full py-2 px-3 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide flex items-center justify-between transition-colors cursor-pointer">
                    <span>Adjust Preferences</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>

            </div>

          </section>

          {/* SECTION 3: BROADSIDE PULL QUOTE BULLETIN */}
          <section className="border-t border-b border-border py-6 px-4 sm:px-8 text-center bg-muted/20">
            <p className="font-serif italic text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed">
              &ldquo;The habit of writing every day creates an unshakeable anchor for the restless mind.&rdquo;
            </p>
            <span className="block mt-2 font-mono text-[10px] uppercase tracking-widest text-[#3368A0] dark:text-[#66A3BF]">
              — THE COMMONS EDITORIAL LEDGER
            </span>
          </section>

        </main>

        {/* Broadsheet Footer Colophon */}
        <footer className="border-t-2 border-border mt-auto bg-muted/30 py-6 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <CommonsSealVector size={18} markOnly />
              <span className="font-bold text-foreground font-serif text-xs">THE COMMONS</span>
              <span>•</span>
              <span>BROADSHEET & CITIZEN SANCTUARY</span>
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



