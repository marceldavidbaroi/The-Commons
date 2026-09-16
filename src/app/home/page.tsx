import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Feather, 
  Calendar, 
  Clock, 
  PenLine, 
  Flame, 
  FolderArchive, 
  MessageSquare,
  FileText,
  UserCheck
} from "lucide-react";
import { CommonsSealVector, CommonsLogo } from "@/components/brand/logo";

export const metadata = {
  title: "The Commons — Citizen Broadside & Feature Directory",
  description: "An editorial broadside and tactile digital sanctuary for reflection, community, and craft.",
};

/* ==========================================================================
   CUSTOM EDITORIAL SVG ICONS (PROFILE & SETTINGS)
   ========================================================================== */

function CitizenProfileSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.25" strokeDasharray="1.5 1.5" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.25" />
      <path 
        d="M6.8 17.5 C7.5 14.5 9.5 13.5 12 13.5 C14.5 13.5 16.5 14.5 17.2 17.5" 
        stroke="currentColor" 
        strokeWidth="1.25" 
        strokeLinecap="round" 
      />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}

function SettingsCogSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1.5" />
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.25" />
      <line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.9" y1="4.9" x2="6.8" y2="6.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="17.2" y1="17.2" x2="19.1" y2="19.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="4.9" y1="19.1" x2="6.8" y2="17.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="17.2" y1="6.8" x2="19.1" y2="4.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

interface FeatureDepartment {
  id: string;
  deptNumber: string;
  title: string;
  subtitle: string;
  href: string;
  buttonText: string;
  icon: React.ReactNode;
  themeTag: string;
  themeColorClass: string;
}

const featureDepartments: FeatureDepartment[] = [
  {
    id: "daily-diary",
    deptNumber: "01",
    title: "The Daily Diary",
    subtitle: "Aged parchment, walnut ink & intimate prompts.",
    href: "/daily-diary",
    buttonText: "Open Diary",
    icon: <Feather className="h-4 w-4" />,
    themeTag: "Parchment & Ink",
    themeColorClass: "border-[#8C3A27] text-[#8C3A27] dark:text-[#E59375]",
  },
  {
    id: "workspace-ledger",
    deptNumber: "02",
    title: "Workspace Ledger",
    subtitle: "Fast editorial scratchpad & daily recording.",
    href: "/home",
    buttonText: "Open Ledger",
    icon: <PenLine className="h-4 w-4" />,
    themeTag: "Broadside Ledger",
    themeColorClass: "border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF]",
  },
  {
    id: "citizen-profile",
    deptNumber: "03",
    title: "Citizen Profile",
    subtitle: "Passport, credentials & personalized preferences.",
    href: "/login",
    buttonText: "Sign In / Passport",
    icon: <CitizenProfileSvg className="h-4 w-4" />,
    themeTag: "Passport",
    themeColorClass: "border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF]",
  },
  {
    id: "settings",
    deptNumber: "04",
    title: "System Settings",
    subtitle: "Typography, theme mode & database configuration.",
    href: "/dev/design-system",
    buttonText: "Configure",
    icon: <SettingsCogSvg className="h-4 w-4" />,
    themeTag: "Settings Dial",
    themeColorClass: "border-[#66A3BF] text-[#66A3BF] dark:text-[#C8DFDB]",
  },
  {
    id: "monographs",
    deptNumber: "05",
    title: "Essays & Articles",
    subtitle: "Longform editorial reading & broadside dispatches.",
    href: "/home",
    buttonText: "Read Articles",
    icon: <FileText className="h-4 w-4" />,
    themeTag: "Broadside",
    themeColorClass: "border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF]",
  },
  {
    id: "agora",
    deptNumber: "06",
    title: "The Agora",
    subtitle: "Citizen proposals & community dialogues.",
    href: "/home",
    buttonText: "Enter Agora",
    icon: <MessageSquare className="h-4 w-4" />,
    themeTag: "Forum",
    themeColorClass: "border-[#6B8E23] text-[#6B8E23] dark:text-[#A3C95A]",
  },
  {
    id: "rhythms",
    deptNumber: "07",
    title: "Rhythms & Streaks",
    subtitle: "Consistency logs & mindful habit tracking.",
    href: "/daily-diary",
    buttonText: "View Rhythms",
    icon: <Flame className="h-4 w-4" />,
    themeTag: "Vitality",
    themeColorClass: "border-[#C48C28] text-[#C48C28] dark:text-[#FBD38D]",
  },
  {
    id: "vault",
    deptNumber: "08",
    title: "Personal Vault",
    subtitle: "Encrypted items, documents & asset catalog.",
    href: "/home",
    buttonText: "Open Vault",
    icon: <FolderArchive className="h-4 w-4" />,
    themeTag: "Encrypted",
    themeColorClass: "border-[#3368A0] text-[#3368A0] dark:text-[#66A3BF]",
  },
];

export default function HomePage() {
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      
      {/* Top Colophon / Micro Masthead */}
      <header className="border-b border-border/80 bg-muted/30 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
          <div className="flex items-center gap-3">
            <CommonsLogo variant="horizontal" size="sm" href="/" subtitle="AUTHENTICATED CITIZEN LEDGER" showFolio />
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#3368A0]" />
              {todayDate}
            </span>
            <span className="text-border">|</span>
            <Link 
              href="/login" 
              className="text-[#3368A0] dark:text-[#66A3BF] font-semibold hover:underline flex items-center gap-1"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>CITIZEN PASSPORT</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Publication Masthead */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-6 pb-2 text-center flex flex-col items-center">
        <CommonsSealVector 
          size={72} 
          className="mb-3 drop-shadow-sm" 
        />
        <h1 className="masthead-title text-4xl sm:text-6xl md:text-7xl tracking-tight text-foreground">
          THE COMMONS
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-muted-foreground mt-1 max-w-lg mx-auto">
          Tactile digital sanctuary for reflection, community, and craft.
        </p>

        {/* Folio Line */}
        <div className="folio-bar w-full py-2 my-4 flex items-center justify-between text-muted-foreground text-xs font-mono">
          <span>VOL. I — NO. 01</span>
          <span className="font-serif italic text-[#3368A0] dark:text-[#66A3BF]">Littera Scripta Manet</span>
          <span>AUTUMN / 2026</span>
        </div>
      </div>

      {/* Main Magazine Layout */}
      <main className="max-w-6xl w-full mx-auto px-6 pb-16 flex-1 space-y-10">
        
        {/* Top Hero Section: Daily Diary + Citizen Profile Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Daily Diary Centerpiece (7 Cols) */}
          <div className="lg:col-span-7 border-t-2 border-[#8C3A27] pt-4 flex flex-col justify-between space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#8C3A27] dark:text-[#E59375]">FEATURED • DAILY DIARY</span>
              <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                DAILY RITUAL
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Daily Diary Tactile Book SVG in authentic Parchment & Wax colors */}
              <div className="w-full sm:w-1/2 flex justify-center">
                <Link href="/daily-diary" className="group block focus:outline-none" title="Open Daily Diary">
                  <svg
                    viewBox="0 0 320 240"
                    className="w-full max-w-[210px] drop-shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-1 cursor-pointer"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="homeCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8C3A27" />
                        <stop offset="50%" stopColor="#732E1E" />
                        <stop offset="100%" stopColor="#4A1C12" />
                      </linearGradient>
                      <linearGradient id="homeSpineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#5E2214" />
                        <stop offset="100%" stopColor="#8C3A27" />
                      </linearGradient>
                    </defs>

                    {/* Book Cover Body */}
                    <rect x="25" y="15" width="270" height="210" rx="10" fill="url(#homeCoverGrad)" stroke="#4A1C12" strokeWidth="2" />
                    
                    {/* Spine & Ribbons */}
                    <rect x="25" y="15" width="26" height="210" rx="3" fill="url(#homeSpineGrad)" />
                    <line x1="51" y1="15" x2="51" y2="225" stroke="#3A140B" strokeWidth="2" />
                    <line x1="30" y1="40" x2="46" y2="40" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
                    <line x1="30" y1="200" x2="46" y2="200" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />

                    {/* Embossed Border Foil */}
                    <rect x="62" y="26" width="222" height="188" rx="6" fill="none" stroke="#C48C28" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.8" />

                    {/* Center Embossed Cartouche */}
                    <rect x="85" y="55" width="176" height="130" rx="4" fill="#F4EAD4" stroke="#8C3A27" strokeWidth="1.5" />
                    
                    {/* Manuscript Title inside Cartouche */}
                    <text x="173" y="95" textAnchor="middle" fill="#2C241E" fontFamily="serif" fontSize="18" fontWeight="bold" letterSpacing="0.05em">
                      DAILY DIARY
                    </text>
                    <text x="173" y="115" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="9" letterSpacing="0.15em">
                      VOL. I — NO. 142
                    </text>

                    {/* Wax Stamp Seal on Cover */}
                    <circle cx="173" cy="148" r="18" fill="#8C3A27" />
                    <circle cx="173" cy="148" r="15" fill="none" stroke="#FAF4EB" strokeWidth="1" strokeDasharray="2 2" />
                    <text x="173" y="152" textAnchor="middle" fill="#FAF4EB" fontFamily="serif" fontSize="11" fontWeight="bold">
                      C
                    </text>
                  </svg>
                </Link>
              </div>

              {/* Text & Direct Action */}
              <div className="w-full sm:w-1/2 space-y-3">
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  The Daily Journal & Manuscript
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A tranquil single-page tactile canvas. Crafted with antique parchment textures, walnut ink typography, gratitude prompts, and mood rhythm tracking.
                </p>
                <div className="pt-1">
                  <Link href="/daily-diary">
                    <button className="px-5 py-2.5 bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif text-xs tracking-wide flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Feather className="h-3.5 w-3.5" />
                      <span>Open Journal Sheet</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>ACTIVE ENTRY: NO. 142</span>
              <span>PARCHMENT & INK SUB-SYSTEM</span>
            </div>

          </div>

          {/* Citizen Profile & Identity Card (5 Cols) */}
          <div className="lg:col-span-5 border-t-2 border-[#3368A0] pt-4 flex flex-col justify-between space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">CITIZEN • IDENTITY LEDGER</span>
              <span className="text-[11px] font-mono text-muted-foreground">STATUS: ACTIVE</span>
            </div>

            <div className="space-y-4 py-1">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-[#3368A0] bg-muted/40 flex items-center justify-center text-[#3368A0] shrink-0">
                  <CitizenProfileSvg className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-foreground">
                    Citizen Reader & Scribe
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: CC-8924-COMMONS • LEVEL 1 CLEARANCE
                  </p>
                </div>
              </div>

              {/* Passport Highlights */}
              <div className="p-3 bg-muted/30 border border-border text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>RESIDENCE:</span>
                  <span className="text-foreground">Sanctuary Broadside</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>DISPATCH STREAK:</span>
                  <span className="text-[#8C3A27] dark:text-[#E59375] font-semibold">5 Days Active</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>ENCRYPTED VAULT:</span>
                  <span className="text-foreground">142 Entries Inscribed</span>
                </div>
              </div>
            </div>

            {/* Profile Quick Action Buttons */}
            <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
              <Link href="/login" className="block">
                <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-background hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif transition-colors cursor-pointer">
                  <CitizenProfileSvg className="h-3.5 w-3.5" />
                  <span>Citizen Passport</span>
                </button>
              </Link>

              <Link href="/dev/design-system" className="block">
                <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-background hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif transition-colors cursor-pointer">
                  <SettingsCogSvg className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </button>
              </Link>
            </div>

          </div>

        </div>

        {/* FEATURE DEPARTMENTS DIRECTORY */}
        <section className="pt-6 border-t-2 border-border space-y-4">
          
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
              ALL DEPARTMENTS & FEATURES
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              8 Spaces
            </span>
          </div>

          {/* Direct Feature Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {featureDepartments.map((dept) => (
              <div 
                key={dept.id}
                className="border-t border-border/80 pt-3 pb-4 flex flex-col justify-between space-y-3 group hover:border-[#3368A0] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{dept.deptNumber}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${dept.themeColorClass}`}>
                    {dept.themeTag}
                  </span>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-base text-foreground group-hover:text-[#3368A0] transition-colors">
                    {dept.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {dept.subtitle}
                  </p>
                </div>

                <Link href={dept.href} className="block pt-1">
                  <button className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-[#3368A0] hover:text-white border border-border text-foreground text-xs font-serif tracking-wide transition-all group-hover:border-[#3368A0] cursor-pointer">
                    <span className="flex items-center gap-2 font-medium">
                      {dept.icon}
                      <span>{dept.buttonText}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>
              </div>
            ))}
          </div>

        </section>

      </main>

      {/* Editorial Colophon / Footer */}
      <footer className="border-t-2 border-border mt-auto bg-muted/30 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div>
            <span className="font-bold text-foreground">THE COMMONS</span> — Editorial Broadside & Digital Sanctuary.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/daily-diary" className="hover:text-foreground">Daily Diary</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-foreground">Citizen Passport</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
