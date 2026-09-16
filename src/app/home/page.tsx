"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Sparkles, 
  Calendar, 
  PenLine, 
  Clock, 
  Heart, 
  ChevronRight, 
  Bookmark, 
  Sun, 
  Flame, 
  Plus, 
  Layers,
  ArrowUpRight,
  Check,
  Feather,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      {/* Editorial Header / Folio */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md px-6 py-3 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif text-xl font-bold tracking-tight text-foreground hover:text-[#3368A0] transition-colors">
              The Commons
            </Link>
            <span className="text-muted-foreground/60 text-xs hidden sm:inline">|</span>
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">WORKSPACE EDITION</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-muted/40 border-border text-muted-foreground font-mono text-[11px]">
              <Calendar className="h-3 w-3 text-[#3368A0]" />
              <span>{currentDate}</span>
            </Badge>

            <Link href="/dev/design-system">
              <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground">
                <Palette className="h-3 w-3 mr-1" />
                Design System
              </Button>
            </Link>

            <Button 
              size="sm" 
              onClick={handleSave}
              className="bg-[#3368A0] hover:bg-[#285380] text-white shadow-xs gap-1.5 font-serif text-xs rounded-none px-4"
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Entry Saved</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Record Entry</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Magazine Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        
        {/* Editorial Section Header */}
        <section className="pb-4 border-b-2 border-border flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
              DAILY CHRONICLE § DISPATCH LOG
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              Daily Ledger & Reflections
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl font-serif italic">
              Record what inspired you today, note lessons learned, and store your thoughts in the permanent record.
            </p>
          </div>

          {/* Quick Streak Counter (Ruled border, no boxy card) */}
          <div className="flex items-center gap-3 p-3 border border-border/80 bg-muted/20 self-start md:self-auto font-mono text-xs">
            <div className="h-8 w-8 bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Reflection Streak</div>
              <div className="font-bold text-foreground">5 Days Recorded</div>
            </div>
          </div>
        </section>

        {/* Two-Column Editorial Broadside Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Main Writing Area (8 Cols - Editorial Form Layout) */}
          <div className="lg:col-span-8 space-y-6 lg:pr-8 lg:border-r border-border/80">
            
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="kicker">TODAY&apos;S MANUSCRIPT ENTRY</span>
              <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-[#C8DFDB]">
                ENTRY #142
              </Badge>
            </div>

            {/* Input Form with Editorial Typography */}
            <div className="space-y-5">
              
              <div className="space-y-1.5">
                <label htmlFor="home-daily-title" className="kicker text-muted-foreground flex items-center justify-between">
                  <span>ENTRY TITLE & FOCUS</span>
                  <span className="font-normal text-[#3368A0] flex items-center gap-1 normal-case font-serif italic">
                    <Sun className="h-3 w-3 text-amber-500" />
                    Today&apos;s Focus
                  </span>
                </label>
                <Input
                  id="home-daily-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Reflections on Architecture & Stillness"
                  className="font-serif text-lg font-bold h-12 border-border/80 rounded-none bg-muted/10 focus-visible:ring-[#3368A0]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="home-daily-desc" className="kicker text-muted-foreground">
                  NARRATIVE & BREAKTHROUGHS
                </label>
                <textarea
                  id="home-daily-desc"
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Record your thoughts, decisions made, lessons learned, or moments of gratitude..."
                  className="w-full rounded-none border border-border/80 bg-muted/10 p-4 font-sans text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#3368A0] resize-y"
                />
              </div>

              {/* Topic Pills */}
              <div className="flex items-center gap-2 pt-1">
                <span className="kicker text-[10px] text-muted-foreground">TOPICS:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-muted/50 border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                    🌱 Gratitude
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-muted/50 border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                    💡 Breakthroughs
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-muted/50 border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                    🎯 Focus
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#66A3BF]" />
                <span>Last updated yesterday at 10:45 PM</span>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/daily-diary">
                  <Button variant="outline" size="sm" className="rounded-none border-border font-serif text-xs">
                    <Feather className="h-3 w-3 mr-1.5" />
                    Open Analog Parchment Mode
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  className="bg-[#3368A0] hover:bg-[#285380] text-white rounded-none font-serif text-xs gap-1.5"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Save to Archive
                </Button>
              </div>
            </div>

          </div>

          {/* Right Column: Mood Check & Monograph Summary (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Quick Mood Check (Ruled container) */}
            <div className="border border-border/80 p-5 bg-muted/20 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="kicker">MOOD OBSERVATION</span>
                <Heart className="h-3.5 w-3.5 text-rose-500" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm">How are you feeling right now?</h4>
                <p className="text-xs text-muted-foreground">
                  Tag your emotional climate before writing your entry.
                </p>
              </div>

              {/* Mood Selection Matrix */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                {[
                  { emoji: "✨", label: "Inspired" },
                  { emoji: "🌿", label: "Calm" },
                  { emoji: "⚡", label: "Energetic" },
                  { emoji: "💭", label: "Pensive" },
                ].map((mood, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2 p-2 border border-border/70 hover:border-[#3368A0] hover:bg-background transition-colors text-left cursor-pointer"
                  >
                    <span>{mood.emoji}</span>
                    <span className="text-[11px] text-muted-foreground hover:text-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>7-Day Average:</span>
                <span className="font-bold text-[#3368A0] dark:text-[#66A3BF]">Calm & Focused</span>
              </div>
            </div>

            {/* Quick Stats Ruled Section */}
            <div className="border border-border/80 p-5 bg-muted/20 flex items-center justify-between">
              <div>
                <span className="kicker text-[10px]">LIFETIME ARCHIVE</span>
                <div className="font-serif text-3xl font-bold text-foreground">142 Entries</div>
              </div>
              <div className="h-10 w-10 border border-border flex items-center justify-center font-bold text-[#3368A0]">
                <Layers className="h-5 w-5" />
              </div>
            </div>

          </aside>

        </section>

        {/* Recent Archive Entries Section (Magazine Column List, No Cards) */}
        <section className="space-y-4 pt-6 border-t-2 border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="kicker">CHRONOLOGICAL ARCHIVE</span>
              <h3 className="font-serif text-2xl font-bold tracking-tight">Recent Dispatches & Notes</h3>
            </div>
            <Link href="/daily-diary" className="font-serif text-xs text-[#3368A0] dark:text-[#66A3BF] hover:underline flex items-center gap-1">
              <span>Explore full journal</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {[
              {
                date: "Yesterday • Sep 16, 2026",
                title: "Reflections on Architecture & Modularity",
                preview: "Designed the new modular schemas and cleaned up table relationships for the upcoming publication launch...",
                mood: "⚡ Energetic",
                time: "8 min read",
              },
              {
                date: "Sep 14, 2026",
                title: "Finding Stillness in the Afternoon",
                preview: "Took an afternoon walk by the lakeside. Noticed the crisp transition into early autumn air...",
                mood: "🌿 Calm",
                time: "4 min read",
              },
              {
                date: "Sep 13, 2026",
                title: "Weekly Planning & Habit Audit",
                preview: "Reviewed sleep consistency and scheduled deep work blocks for the next cycle ahead...",
                mood: "✨ Inspired",
                time: "6 min read",
              },
            ].map((entry, idx) => (
              <div 
                key={idx} 
                className="space-y-2.5 p-4 border-l-2 border-border/80 hover:border-[#3368A0] transition-colors group cursor-pointer bg-muted/10"
              >
                <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  <span>{entry.date}</span>
                  <span>{entry.mood}</span>
                </div>

                <h4 className="font-serif font-bold text-base group-hover:text-[#3368A0] transition-colors line-clamp-1">
                  {entry.title}
                </h4>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                  {entry.preview}
                </p>

                <div className="pt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground border-t border-border/40">
                  <span>{entry.time}</span>
                  <span className="text-[#3368A0] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Read Dispatch <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
