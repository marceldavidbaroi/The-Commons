"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CommonsLogo, CommonsSealVector } from "@/components/brand/logo";
import {
  Check,
  CheckCircle2,
  Copy,
  Layers,
  Palette,
  Type,
  Sparkles,
  Search,
  ArrowRight,
  Sliders,
  Sun,
  Moon,
  ExternalLink,
  BookOpen,
  Atom,
  Smartphone,
  Tablet,
  Monitor,
  Stamp
} from "lucide-react";

interface ColorSwatch {
  name: string;
  role: string;
  hex: string;
  rgb: string;
  textClass: string;
  bgClass: string;
  description: string;
  usage: string[];
}

const baseColorTokens: ColorSwatch[] = [
  {
    name: "Ocean Slate",
    role: "Primary Brand",
    hex: "#3368A0",
    rgb: "rgb(51, 104, 160)",
    textClass: "text-white",
    bgClass: "bg-[#3368A0]",
    description: "Deep oceanic blue serving as the core anchor for key actions, brand identity, navigation, and primary interactive elements.",
    usage: ["Primary CTA Buttons", "Active Tabs", "Brand Identity", "Key Action Rings"],
  },
  {
    name: "Muted Cerulean",
    role: "Secondary Brand",
    hex: "#66A3BF",
    rgb: "rgb(102, 163, 191)",
    textClass: "text-white",
    bgClass: "bg-[#66A3BF]",
    description: "Soft azure accent offering breathing room, supporting secondary interactions, badges, and progress indicators.",
    usage: ["Secondary Badges", "Hover States", "Progress Indicators", "Supporting Accents"],
  },
  {
    name: "Seafoam Mist",
    role: "Accent Tint",
    hex: "#C8DFDB",
    rgb: "rgb(200, 223, 219)",
    textClass: "text-[#193836]",
    bgClass: "bg-[#C8DFDB]",
    description: "Serene, organic seafoam for subtle card backgrounds, badge fills, selection highlights, and soft borders.",
    usage: ["Selection Highlights", "Soft Badges", "Accent Backgrounds", "Subtle Dividers"],
  },
  {
    name: "Linen Warm White",
    role: "Surface / Canvas",
    hex: "#F2EFE7",
    rgb: "rgb(242, 239, 231)",
    textClass: "text-[#2D3748]",
    bgClass: "bg-[#F2EFE7]",
    description: "Calm, natural bone surface tone replacing stark white to establish a warm Scandinavian atmosphere.",
    usage: ["App Canvas", "Muted Surfaces", "Subtle Containers", "Sidebar Fill"],
  },
  {
    name: "Dark Brand Navy",
    role: "Dark Canvas",
    hex: "#1E2D3D",
    rgb: "rgb(30, 45, 61)",
    textClass: "text-white",
    bgClass: "bg-[#1E2D3D]",
    description: "Deep oceanic dark tone for dark mode backgrounds, high contrast elements, and solid dark surfaces.",
    usage: ["Dark Mode Background", "Solid Dark Fills", "Contrast Typography"],
  },
];

const diaryColorTokens: ColorSwatch[] = [
  {
    name: "Walnut Ink",
    role: "Primary Typography",
    hex: "#2C241E",
    rgb: "rgb(44, 36, 30)",
    textClass: "text-[#FAF4EB]",
    bgClass: "bg-[#2C241E]",
    description: "Warm, rich dark-brown organic walnut ink tone for timeless handwriting, headings, and folios.",
    usage: ["Handwritten Titles", "Journal Body Text", "Folio Inscriptions", "Primary Contrast"],
  },
  {
    name: "Antique Parchment",
    role: "Paper Canvas",
    hex: "#F4EAD4",
    rgb: "rgb(244, 234, 212)",
    textClass: "text-[#2C241E]",
    bgClass: "bg-[#F4EAD4]",
    description: "Warm, tea-stained aged manuscript parchment with subtle oxidation gradients and fiber texture.",
    usage: ["Journal Sheet Canvas", "Ledger Background", "Torn Scrap Chips", "Deckled Sheets"],
  },
  {
    name: "Terracotta Wax Seal",
    role: "Seal & Primary Action",
    hex: "#8C3A27",
    rgb: "rgb(140, 58, 39)",
    textClass: "text-white",
    bgClass: "bg-[#8C3A27]",
    description: "Aged terracotta red ink for embossed wax seals, active tab highlights, and heartfelt accents.",
    usage: ["Wax Seal Buttons", "Active Page Tabs", "Number Badges", "Pencil Heart Fill"],
  },
  {
    name: "Silk Ribbon Gold",
    role: "Bookmark & Milestone",
    hex: "#C48C28",
    rgb: "rgb(196, 140, 40)",
    textClass: "text-white",
    bgClass: "bg-[#C48C28]",
    description: "Gilded silk ribbon tone symbolizing bookmarked passages, streak habits, and special reflections.",
    usage: ["Silk Bookmark Ribbons", "Vitality Highlights", "Habit Flame Badges", "Amber Accents"],
  },
  {
    name: "Botanical Sage",
    role: "Nature & Mood Accent",
    hex: "#6B8E23",
    rgb: "rgb(107, 142, 35)",
    textClass: "text-white",
    bgClass: "bg-[#6B8E23]",
    description: "Organic dried-herb green evoking morning tea, garden reflections, and peaceful mindful states.",
    usage: ["Calm Mood Badges", "Nature Tags", "Gratitude Bullet Accents", "Mindful Seals"],
  },
  {
    name: "Iron-Gall Margin Red",
    role: "Notebook Margin Guide",
    hex: "#D97D7D",
    rgb: "rgb(217, 125, 125)",
    textClass: "text-white",
    bgClass: "bg-[#D97D7D]",
    description: "Faint, aged red ruling ink creating the classic vintage notebook vertical margin rule line.",
    usage: ["Left Margin Line (1px)", "Editorial Guides", "Subtle Annotation Dividers"],
  },
];

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

export default function DesignSystemPage() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [interactiveInput, setInteractiveInput] = useState("The Commons Design Tokens");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-[#0F1722]" : "bg-[#FAF8F5]"} text-foreground transition-colors duration-300 font-sans`}>
      
      {/* Top Application Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CommonsLogo variant="horizontal" size="sm" href="/" subtitle="DESIGN SYSTEM CODEX" showFolio />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="gap-2 text-xs border-border"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-[#3368A0]" />}
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </Button>
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>App Home</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8DFDB]/40 dark:bg-[#1C3837] text-[#193836] dark:text-[#C8DFDB] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Design System Codex</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Design System & Brand Identity
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Curated color palettes, official broadside seal logo, typography hierarchy, UI components, and the feature-scoped architecture.
            </p>
          </div>

          {/* Quick Hex Copy Chips */}
          <div className="flex flex-wrap gap-2 p-3 bg-muted/60 rounded-xl border border-border">
            {baseColorTokens.map((c) => (
              <div
                key={c.hex}
                onClick={() => copyToClipboard(c.hex)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs cursor-pointer hover:border-[#3368A0] transition-colors shadow-xs"
                title={`Click to copy ${c.hex}`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                <span className="font-mono text-[11px] font-medium">{c.hex}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tabs Explorer */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        <Tabs defaultValue="brand-logo" className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-xl border border-border inline-flex flex-wrap gap-1">
            <TabsTrigger value="brand-logo" className="gap-2 text-xs sm:text-sm text-[#3368A0] dark:text-[#66A3BF] font-semibold">
              <Stamp className="h-4 w-4" />
              <span>Brand Logo & Seal</span>
            </TabsTrigger>
            <TabsTrigger value="palette" className="gap-2 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span>Color Palette</span>
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-2 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              <span>Components</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2 text-xs sm:text-sm">
              <Type className="h-4 w-4" />
              <span>Typography</span>
            </TabsTrigger>
            <TabsTrigger value="diary" className="gap-2 text-xs sm:text-sm text-[#8C3A27] dark:text-[#E59375] font-semibold">
              <BookOpen className="h-4 w-4" />
              <span>Feature: Daily Diary</span>
            </TabsTrigger>
            <TabsTrigger value="feature-architecture" className="gap-2 text-xs sm:text-sm">
              <Atom className="h-4 w-4" />
              <span>Feature Architecture</span>
            </TabsTrigger>
            <TabsTrigger value="responsiveness" className="gap-2 text-xs sm:text-sm">
              <Smartphone className="h-4 w-4" />
              <span>Mobile Responsiveness</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2 text-xs sm:text-sm">
              <Sliders className="h-4 w-4" />
              <span>Sandbox</span>
            </TabsTrigger>
          </TabsList>

          {/* 0. BRAND LOGO & SEAL SHOWCASE */}
          <TabsContent value="brand-logo" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Main Embossed Seal Feature (5 cols) */}
              <div className="lg:col-span-5 p-8 bg-card border border-border flex flex-col items-center justify-center text-center space-y-5 relative">
                <div className="p-4 rounded-full bg-muted/40 border border-border/70">
                  <CommonsSealVector size={140} className="hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">The Commons Archival Seal</h3>
                  <p className="font-mono text-xs text-[#3368A0] dark:text-[#66A3BF] uppercase tracking-widest mt-1">
                    Littera Scripta Manet
                  </p>
                </div>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  The official seal represents the permanence of the written record. Featuring the scalloped broadside boundary, inner Latin motto, heraldic compass star, and terracotta wax center.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    SVG Vector • 100% Scalable
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase text-[#3368A0] dark:text-[#66A3BF]">
                    Favicon & Lockup
                  </Badge>
                </div>
              </div>

              {/* Logo Variants & Usage (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Horizontal Lockup */}
                <div className="p-6 bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="uppercase font-semibold text-foreground">1. Horizontal Masthead Lockup</span>
                    <span>&lt;CommonsLogo variant=&quot;horizontal&quot; /&gt;</span>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/80 flex items-center justify-between">
                    <CommonsLogo variant="horizontal" size="md" subtitle="MAGAZINE & EDITORIAL BROADSIDE" showFolio />
                  </div>
                </div>

                {/* Stacked Lockup */}
                <div className="p-6 bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="uppercase font-semibold text-foreground">2. Centered Stacked Lockup</span>
                    <span>&lt;CommonsLogo variant=&quot;stacked&quot; /&gt;</span>
                  </div>
                  <div className="p-6 bg-muted/30 border border-border/80 flex items-center justify-center">
                    <CommonsLogo variant="stacked" size="lg" subtitle="TACTILE DIGITAL SANCTUARY" showFolio />
                  </div>
                </div>

                {/* Minimalist Mark / Favicon */}
                <div className="p-6 bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="uppercase font-semibold text-foreground">3. Compact Compass Mark & Sizes</span>
                    <span>&lt;CommonsSealVector size=&#123;...&#125; markOnly /&gt;</span>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/80 flex items-center justify-around gap-4 flex-wrap">
                    <div className="flex flex-col items-center gap-1.5">
                      <CommonsSealVector size={20} markOnly />
                      <span className="font-mono text-[10px] text-muted-foreground">20px (xs)</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <CommonsSealVector size={28} markOnly />
                      <span className="font-mono text-[10px] text-muted-foreground">28px (sm)</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <CommonsSealVector size={40} markOnly />
                      <span className="font-mono text-[10px] text-muted-foreground">40px (md)</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <CommonsSealVector size={56} />
                      <span className="font-mono text-[10px] text-muted-foreground">56px (lg)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </TabsContent>

          {/* 1. COLOR PALETTE */}
          <TabsContent value="palette" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {baseColorTokens.map((token) => (
                <Card key={token.hex} className="overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className={`h-36 ${token.bgClass} p-5 flex flex-col justify-between relative`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md backdrop-blur-md bg-black/20 ${token.textClass}`}>
                        {token.role}
                      </span>
                      <button
                        onClick={() => copyToClipboard(token.hex)}
                        className={`p-1.5 rounded-md backdrop-blur-md bg-black/20 hover:bg-black/30 transition-colors ${token.textClass}`}
                        title="Copy hex code"
                      >
                        {copiedHex === token.hex ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>

                    <div>
                      <div className={`text-2xl font-bold font-mono tracking-tight ${token.textClass}`}>{token.hex}</div>
                      <div className={`text-xs opacity-80 font-mono ${token.textClass}`}>{token.rgb}</div>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-base text-foreground flex items-center justify-between">
                        {token.name}
                        {copiedHex === token.hex && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">Copied!</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {token.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Suggested Usage
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {token.usage.map((u) => (
                          <span key={u} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground/80 font-medium">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gradient Combinations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#3368A0]" />
                  <span>Harmonious Gradient Combinations</span>
                </CardTitle>
                <CardDescription>
                  Tailored blends for banners, highlights, and illustrations.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-28 rounded-xl p-4 flex flex-col justify-between text-white bg-gradient-to-br from-[#3368A0] to-[#66A3BF] shadow-sm">
                  <span className="text-xs font-semibold">Ocean Horizon</span>
                  <span className="text-xs font-mono opacity-80">#3368A0 → #66A3BF</span>
                </div>

                <div className="h-28 rounded-xl p-4 flex flex-col justify-between text-[#193836] bg-gradient-to-br from-[#66A3BF] to-[#C8DFDB] shadow-sm">
                  <span className="text-xs font-semibold">Coastal Mist</span>
                  <span className="text-xs font-mono opacity-80">#66A3BF → #C8DFDB</span>
                </div>

                <div className="h-28 rounded-xl p-4 flex flex-col justify-between text-[#1E293B] bg-gradient-to-br from-[#C8DFDB] to-[#F2EFE7] border border-border shadow-sm">
                  <span className="text-xs font-semibold">Linen Dune</span>
                  <span className="text-xs font-mono opacity-80">#C8DFDB → #F2EFE7</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. COMPONENTS */}
          <TabsContent value="components" className="space-y-8">
            {/* Buttons & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Button Variants & Action Hierarchy</CardTitle>
                <CardDescription>
                  Interactive states leveraging primary, secondary, and accent colors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="bg-[#3368A0] hover:bg-[#285380] text-white shadow-xs">
                    Primary Action
                  </Button>
                  <Button className="bg-[#66A3BF] hover:bg-[#538ca5] text-white shadow-xs">
                    Secondary Azure
                  </Button>
                  <Button className="bg-[#C8DFDB] hover:bg-[#b5d3cd] text-[#193836] font-semibold">
                    Soft Accent
                  </Button>
                  <Button variant="outline" className="border-[#66A3BF]/40 text-foreground">
                    Outlined
                  </Button>
                  <Button variant="ghost">
                    Ghost Button
                  </Button>
                  <Button className="bg-[#3368A0] hover:bg-[#285380] text-white gap-2">
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive">
                    Destructive
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Form Inputs & Custom SVG Icons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Form & Search Inputs</CardTitle>
                  <CardDescription>Minimalist inputs with focused brand border glow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-input" className="text-xs font-semibold">
                      Global Search
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search-input"
                        placeholder="Search resources, documents, members..."
                        className="pl-9 border-border focus-visible:ring-[#3368A0]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-input" className="text-xs font-semibold">
                      Project Identifier
                    </Label>
                    <Input
                      id="demo-input"
                      defaultValue="the-commons-production"
                      className="font-mono text-xs border-border focus-visible:ring-[#3368A0]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Custom SVG Icons Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Custom SVG Icons</CardTitle>
                  <CardDescription>Hand-crafted SVG icons for Profile, Settings & Badges</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center text-[#3368A0]">
                        <CitizenProfileSvg className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">CitizenProfileSvg</div>
                        <div className="text-[11px] text-muted-foreground">Cameo Medal Icon</div>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center text-[#66A3BF]">
                        <SettingsCogSvg className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">SettingsCogSvg</div>
                        <div className="text-[11px] text-muted-foreground">Astronomical Dial</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-[#3368A0] text-white">Active</Badge>
                    <Badge className="bg-[#66A3BF] text-white">Secondary</Badge>
                    <Badge className="bg-[#C8DFDB] text-[#193836]">Seafoam</Badge>
                    <Badge variant="outline" className="border-[#3368A0] text-[#3368A0]">Outlined</Badge>
                    <Badge variant="secondary">Neutral</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. TYPOGRAPHY */}
          <TabsContent value="typography" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Type Scale & Hierarchy</CardTitle>
                <CardDescription>
                  Modern typography set with clean letter tracking and high readability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 divide-y divide-border">
                <div className="pt-2 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-44">Display Large</span>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground flex-1">
                    The Commons
                  </h1>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-44">Heading 1 (Serif)</span>
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground flex-1">
                    Building Deliberate Digital Sanctuaries
                  </h2>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-44">Heading 2</span>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground flex-1">
                    Shared Governance & Reflection
                  </h3>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-44">Body Standard</span>
                  <p className="text-base text-muted-foreground leading-relaxed flex-1">
                    The Commons brings people together through thoughtful interfaces, analog tactile warmth, and reliable modern foundations.
                  </p>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-44">Handwriting (Diary)</span>
                  <p className="font-handwriting text-2xl text-[#8C3A27] dark:text-[#E59375] flex-1">
                    Caveat & Kalam handwriting typography for analog diary entries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. DAILY DIARY FEATURE SYSTEM */}
          <TabsContent value="diary" className="space-y-8">
            <Card className="border-[#C8BEA8]/70 dark:border-[#223348] bg-[#FAF6EE] dark:bg-[#131E2B]">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge className="bg-[#8C3A27] text-white">Daily Diary Sub-System</Badge>
                  <CardTitle className="text-2xl font-serif text-[#2C241E] dark:text-[#FAF4EB]">
                    Tactile Manuscript & Ink Tokens
                  </CardTitle>
                  <CardDescription className="text-[#6B5A4B] dark:text-[#94A8BA]">
                    A bespoke tactile sub-design system featuring aged parchment, walnut ink, wax seals, and handwriting typography.
                  </CardDescription>
                </div>

                <Link href="/daily-diary">
                  <Button className="bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif gap-2 rounded-lg">
                    <span>Open Daily Diary</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diaryColorTokens.map((token) => (
                    <div
                      key={token.hex}
                      className="rounded-xl border border-[#C8BEA8]/70 dark:border-[#223348] bg-card p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className={`h-20 rounded-lg ${token.bgClass} p-3 flex flex-col justify-between`}>
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded backdrop-blur-md bg-black/20 ${token.textClass}`}>
                            {token.role}
                          </span>
                          <button
                            onClick={() => copyToClipboard(token.hex)}
                            className={`p-1 rounded backdrop-blur-md bg-black/20 hover:bg-black/30 transition-colors ${token.textClass}`}
                          >
                            {copiedHex === token.hex ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <div className={`font-mono text-sm font-bold ${token.textClass}`}>{token.hex}</div>
                      </div>

                      <div>
                        <h4 className="font-serif font-bold text-sm text-foreground">{token.name}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{token.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. FEATURE ARCHITECTURE */}
          <TabsContent value="feature-architecture" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Atom className="h-5 w-5 text-[#3368A0]" />
                  <span>Modular Feature-Scoped Design Architecture</span>
                </CardTitle>
                <CardDescription>
                  How features define bespoke visual languages while integrating into the main application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <span className="text-xs font-mono font-bold text-[#3368A0]">01. Declare Tokens</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Define feature-specific color variables and font stacks in `globals.css` or the feature folder.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <span className="text-xs font-mono font-bold text-[#66A3BF]">02. Build Tactile UI</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Implement domain-specific textures, deckled edges, or ledgers tailored to the feature&apos;s purpose.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <span className="text-xs font-mono font-bold text-[#8C3A27]">03. Document & Showcase</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Register in `docs/features/` and add an interactive showcase tab to this page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. MOBILE RESPONSIVENESS & BREAKPOINTS */}
          <TabsContent value="responsiveness" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[#3368A0]" />
                  <span>Mobile Responsiveness & Viewport Guidelines</span>
                </CardTitle>
                <CardDescription>
                  Standards ensuring fluid legibility, safe margins, and touch-friendly hit areas across all device sizes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Breakpoints Table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#3368A0]">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile (&lt;640px)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Single-column stacked layouts, compact sheet padding (`p-4`), concise folios, touch hit areas (≥40px).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#66A3BF]">
                      <Tablet className="h-4 w-4" />
                      <span>Tablet (640px - 1024px)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      2-column feature grids, progressive padding (`p-7`), expanded folios, visible auxiliary tags.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#8C3A27] dark:text-[#E59375]">
                      <Monitor className="h-4 w-4" />
                      <span>Desktop (1024px+)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Asymmetrical broadside spreads (7/5 splits), 3-4 column feature grids, rich marginalia.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Core Rules List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Key Implementation Checklist</h4>
                  <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Fluid Typography:</strong> Use step scales (e.g. `text-3xl sm:text-5xl md:text-7xl`) so headings never overflow narrow mobile viewports.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Tactile Sheet Padding:</strong> Use responsive padding `p-4 sm:p-7 md:p-9 lg:p-11` on parchment sheets to maximize writing area on mobile.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Touch Target Size:</strong> Maintain a minimum 40px height on buttons and chips for effortless finger tapping.</span>
                    </li>
                  </ul>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* 7. PLAYGROUND */}
          <TabsContent value="playground" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interactive Token Sandbox</CardTitle>
                <CardDescription>Experiment in real-time with custom text and component states.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="sandbox-input" className="text-xs font-semibold">Preview Text</Label>
                  <Input
                    id="sandbox-input"
                    value={interactiveInput}
                    onChange={(e) => setInteractiveInput(e.target.value)}
                    placeholder="Type custom text..."
                    className="focus-visible:ring-[#3368A0]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-xl bg-card border-2 border-[#3368A0] space-y-3">
                    <Badge className="bg-[#3368A0] text-white">#3368A0 Primary</Badge>
                    <h3 className="text-xl font-bold text-foreground">{interactiveInput || "Sample Text"}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#3368A0] text-white">Action</Button>
                      <Button size="sm" variant="outline">Dismiss</Button>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#FAF6EE] dark:bg-[#131E2B] border border-[#C8BEA8] space-y-3">
                    <Badge className="bg-[#8C3A27] text-white">Daily Diary Sub-System</Badge>
                    <h3 className="font-serif text-xl font-bold text-[#2C241E] dark:text-[#FAF4EB]">{interactiveInput || "Sample Text"}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#8C3A27] text-white font-serif">Open Journal</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>

      {/* Standard Footer */}
      <footer className="border-t border-border mt-auto bg-muted/40 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div>The Commons Design System — v1.2</div>
          <Link href="/" className="hover:text-foreground">Return to App</Link>
        </div>
      </footer>

    </div>
  );
}
