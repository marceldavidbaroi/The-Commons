"use client";

import React, { useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudSun,
  CloudRain,
  Moon,
  Sparkles,
  Feather,
  ArrowLeft,
  Check,
  PenTool,
  Search,
  List,
  BarChart3,
  BookMarked,
  Heart,
  Flame,
  Quote,
  X,
  Plus,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommonsSealVector } from "@/components/brand/logo";
import { useDiaryStore } from "@/stores/diary-store";
import { DiaryEntry, DiaryTheme, ENERGY_LEVELS, MOOD_LIST } from "@/types/diary";

const WEATHER_LIST = [
  { id: "sunny", label: "Sunny", icon: Sun, inkNote: "Warm & Clear" },
  { id: "cloudy", label: "Overcast", icon: CloudSun, inkNote: "Misty & Mild" },
  { id: "rainy", label: "Rainy", icon: CloudRain, inkNote: "Soft Rains" },
  { id: "night", label: "Clear Night", icon: Moon, inkNote: "Starlit Sky" },
];

function PencilHeart({ filled, theme }: { filled: boolean; theme: DiaryTheme }) {
  if (theme === "modern") {
    return (
      <Heart
        className={`w-5 h-5 transition-all ${
          filled
            ? "text-rose-500 fill-rose-500 scale-110"
            : "text-slate-400 hover:text-rose-400"
        }`}
      />
    );
  }

  if (theme === "classic") {
    return (
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {filled ? (
          <path
            d="M16 27 C15.5 26.5 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 26.5 16 27 Z"
            fill="#D4AF37"
            stroke="#AA8520"
            strokeWidth="1.5"
          />
        ) : (
          <path
            d="M16 27 C15.5 26.5 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 26.5 16 27 Z"
            stroke="#D4AF37"
            strokeWidth="1.5"
            className="opacity-70 hover:opacity-100"
          />
        )}
      </svg>
    );
  }

  // Vintage Old Book Theme
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {filled ? (
        <>
          <path
            d="M16 27.5 C15.5 27 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 27 16 27.5 Z"
            fill="#B23A2B"
            opacity="0.85"
          />
          <path
            d="M9 10 L23 10 M8 13 L24 13 M9 16 L23 16 M11 19 L21 19"
            stroke="#731C13"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="1.5 1.5"
            opacity="0.8"
          />
          <path
            d="M16 27.5 C15.5 27 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 27 16 27.5 Z"
            stroke="#5A140C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M16 27.2 C15.5 26.8 4.6 19.5 4.3 11 C4.1 6.3 7.4 4.2 11.3 4.2 C13.6 4.2 15.1 5.4 16 6.4 C16.9 5.4 18.4 4.2 20.7 4.2 C24.6 4.2 27.9 6.3 27.7 11 C27.4 19.5 16.5 26.8 16 27.2 Z"
          stroke="#5C4A3A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dark:stroke-[#94A8BA]"
        />
      )}
    </svg>
  );
}

type ViewMode = "entry" | "index" | "summary";

export default function SingleDiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const targetId = resolvedParams.id;

  const diaries = useDiaryStore((s) => s.diaries);
  const entries = useDiaryStore((s) => s.entries);
  const getDiaryById = useDiaryStore((s) => s.getDiaryById);
  const getEntryById = useDiaryStore((s) => s.getEntryById);
  const updateEntryStore = useDiaryStore((s) => s.updateEntry);
  const createEntryStore = useDiaryStore((s) => s.createEntry);
  const toggleHeartStore = useDiaryStore((s) => s.toggleHeart);
  const searchQuery = useDiaryStore((s) => s.searchQuery);
  const setSearchQuery = useDiaryStore((s) => s.setSearchQuery);

  const [activeView, setActiveView] = useState<ViewMode>("entry");
  const [isSaved, setIsSaved] = useState(false);
  const [filterMood, setFilterMood] = useState<string>("all");

  // Locate current entry and its parent diary
  const currentEntry = useMemo(() => {
    return getEntryById(targetId) || entries[0];
  }, [targetId, getEntryById, entries]);

  const currentDiary = useMemo(() => {
    if (currentEntry) {
      const found = getDiaryById(currentEntry.diaryId);
      if (found) return found;
    }
    // Check if targetId is directly a diaryId
    const directDiary = getDiaryById(targetId);
    if (directDiary) return directDiary;
    return diaries[0];
  }, [currentEntry, targetId, getDiaryById, diaries]);

  // Entries filtered to this specific diary
  const diaryEntries = useMemo(() => {
    if (!currentDiary) return entries;
    return entries.filter((e) => e.diaryId === currentDiary.id);
  }, [entries, currentDiary]);

  const currentDiaryIndex = useMemo(() => {
    if (!currentEntry) return 0;
    const idx = diaryEntries.findIndex((e) => e.id === currentEntry.id);
    return idx >= 0 ? idx : 0;
  }, [diaryEntries, currentEntry]);

  const prevEntry = currentDiaryIndex < diaryEntries.length - 1 ? diaryEntries[currentDiaryIndex + 1] : null;
  const nextEntry = currentDiaryIndex > 0 ? diaryEntries[currentDiaryIndex - 1] : null;

  const theme: DiaryTheme = currentDiary?.theme || "vintage";

  const updateEntry = (fields: Partial<DiaryEntry>) => {
    if (!currentEntry) return;
    updateEntryStore(currentEntry.id, fields);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  const handleNewPage = () => {
    const newEntry = createEntryStore(currentDiary?.id);
    router.push(`/daily-diary/${newEntry.id}`);
    setActiveView("entry");
  };

  const calculateDuration = (start: string, end: string) => {
    try {
      const [sH, sM] = start.split(":").map(Number);
      const [eH, eM] = end.split(":").map(Number);
      let diff = eH * 60 + eM - (sH * 60 + sM);
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h} hrs ${m > 0 ? `${m} mins` : ""}`.trim();
    } catch {
      return "8 hrs";
    }
  };

  // Filter entries for the Index Page
  const filteredEntries = useMemo(() => {
    return diaryEntries.filter((e) => {
      const matchesSearch =
        !searchQuery.trim() ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dateStr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dayOfWeek?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `#${e.pageNumber}`.includes(searchQuery);

      const matchesMood = filterMood === "all" || e.mood?.includes(filterMood);
      return matchesSearch && matchesMood;
    });
  }, [diaryEntries, searchQuery, filterMood]);

  // Aggregate Stats for Summary Page
  const summaryStats = useMemo(() => {
    const totalPages = diaryEntries.length;
    const heartedCount = diaryEntries.filter((e) => e.isHearted).length;

    const totalEnergy = diaryEntries.reduce((acc, e) => acc + (e.energyLevel || 3), 0);
    const avgEnergy = totalPages > 0 ? (totalEnergy / totalPages).toFixed(1) : "0";

    const moodCounts: Record<string, number> = {};
    diaryEntries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    const energyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    diaryEntries.forEach((e) => {
      energyCounts[e.energyLevel] = (energyCounts[e.energyLevel] || 0) + 1;
    });

    const allGratitudes: { text: string; pageNumber: number; dateStr: string; entryId: string }[] = [];
    diaryEntries.forEach((e) => {
      e.gratitude.forEach((g) => {
        if (g.trim()) {
          allGratitudes.push({ text: g, pageNumber: e.pageNumber, dateStr: e.dateStr, entryId: e.id });
        }
      });
    });

    return {
      totalPages,
      heartedCount,
      avgEnergy,
      moodCounts,
      energyCounts,
      allGratitudes,
    };
  }, [diaryEntries]);

  if (!currentEntry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <Feather className="h-8 w-8 text-[#8C3A27] mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">Opening the Codex...</h2>
          <Link href="/my-diaries">
            <Button variant="outline" className="font-serif text-sm mt-2">
              Return to All Diaries
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================================
     THEME-SPECIFIC CLASS UTILITIES
     ========================================================================= */
  const themePageBg =
    theme === "vintage"
      ? "bg-[#DED6C4] dark:bg-[#0A0F17] text-[#2C241E] dark:text-[#E2E8F0]"
      : theme === "classic"
      ? "bg-[#EAE5D9] dark:bg-[#0D141F] text-[#152B47] dark:text-[#E2ECF7]"
      : "bg-[#F1F5F9] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]";

  const themeHeaderBg =
    theme === "vintage"
      ? "bg-[#DED6C4]/95 dark:bg-[#0A0F17]/95 border-[#C8BEA8]/40 dark:border-[#223348]/40"
      : theme === "classic"
      ? "bg-[#EAE5D9]/95 dark:bg-[#0D141F]/95 border-[#D0C5B0]/50 dark:border-[#1E3048]/50"
      : "bg-[#F1F5F9]/95 dark:bg-[#090D16]/95 border-slate-200 dark:border-slate-800";

  const themeActiveTab =
    theme === "vintage"
      ? "bg-[#8C3A27] text-[#FAF6EE]"
      : theme === "classic"
      ? "bg-[#1E3A5F] text-[#FAF7EE] shadow-xs"
      : "bg-[#0F172A] dark:bg-[#38BDF8] text-white dark:text-[#090D16] shadow-xs";

  const themeSaveBtn =
    theme === "vintage"
      ? "bg-[#8C3A27] hover:bg-[#732E1E] text-[#FAF7F0]"
      : theme === "classic"
      ? "bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF7EE] border border-[#D4AF37]/30"
      : "bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] text-white dark:text-[#0F172A]";

  return (
    <div className={`min-h-screen ${themePageBg} flex flex-col transition-colors duration-200`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR HEADER */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-40 ${themeHeaderBg} px-3 sm:px-6 py-2 border-b backdrop-blur-xs`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          
          {/* Left: Back & Seal + Diary Name */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/my-diaries">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full border border-current/20 cursor-pointer"
                title="Return to All Diaries"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>

            <Link href="/my-diaries" className="flex items-center gap-2 hover:opacity-85 transition-opacity" title="Return to My Diaries">
              <CommonsSealVector size={22} markOnly className="shrink-0 hover:rotate-6 transition-transform" />
              <span className="text-xs font-serif font-bold tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
                {currentDiary?.name}
              </span>
            </Link>
          </div>

          {/* Right: Actions Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            
            {/* View Switcher (Journal • Index • Summary) */}
            <div className="inline-flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-full border border-current/15 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView("entry")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "entry" ? themeActiveTab : "opacity-70 hover:opacity-100"
                }`}
                title="Open Journal Page"
              >
                <BookMarked className="h-3 w-3" />
                <span>Journal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("index")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "index" ? themeActiveTab : "opacity-70 hover:opacity-100"
                }`}
                title="Table of Contents Index"
              >
                <List className="h-3 w-3" />
                <span>Index</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/10">
                  {diaryEntries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("summary")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "summary" ? themeActiveTab : "opacity-70 hover:opacity-100"
                }`}
                title="Summary Digest"
              >
                <BarChart3 className="h-3 w-3" />
                <span>Summary</span>
              </button>
            </div>

            {/* Prev / Next Page Turn */}
            {activeView === "entry" && (
              <div className="flex items-center bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded-full border border-current/15 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (prevEntry) router.push(`/daily-diary/${prevEntry.id}`);
                  }}
                  disabled={!prevEntry}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="Turn back page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                
                <span className="text-[11px] font-serif italic px-1.5 opacity-90">
                  p. {currentEntry.pageNumber}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (nextEntry) router.push(`/daily-diary/${nextEntry.id}`);
                  }}
                  disabled={!nextEntry}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="Turn forward page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Return to All Books Library */}
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0"
                title="Return to Books Library"
              >
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">All Books</span>
              </Button>
            </Link>

            {/* Fresh Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewPage}
              className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0"
              title="Turn to Fresh Blank Page"
            >
              <Plus className="h-3 w-3 text-[#8C3A27] dark:text-[#E59375]" />
              <span className="hidden md:inline">Fresh Page</span>
            </Button>

            {/* Seal / Inked Save */}
            <Button
              size="sm"
              onClick={handleSave}
              className={`h-6.5 px-2.5 rounded-full font-serif font-semibold text-xs shadow-xs gap-1 shrink-0 cursor-pointer ${themeSaveBtn}`}
              title="Save & Inscribe"
            >
              {isSaved ? (
                <>
                  <Check className="h-3 w-3 text-amber-200" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <PenTool className="h-3 w-3" />
                  <span>Seal</span>
                </>
              )}
            </Button>

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN JOURNAL CANVAS (ADAPTS TO 3 THEMES) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        
        {activeView === "entry" && (
          
          /* =========================================================================
             THEME 1: OLD BOOK (AGED PARCHMENT, WALNUT INK, TORN DECKLED EDGES)
             ========================================================================= */
          theme === "vintage" ? (
            <div className="w-full relative torn-sheet-shadow">
              <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
                
                {/* Vintage Left Margin Line */}
                <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  
                  {/* Top Folio Bar */}
                  <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-1.5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { if (prevEntry) router.push(`/daily-diary/${prevEntry.id}`); }}
                      disabled={!prevEntry}
                      className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] font-handwriting text-xs sm:text-sm flex items-center gap-0.5 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Prev</span>
                    </button>

                    <div className="font-handwriting text-sm sm:text-base md:text-lg font-bold text-[#2A1D13] dark:text-[#FAF4EB] tracking-wide text-center flex-1 truncate px-1">
                      {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} ({calculateDuration(currentEntry.startTime, currentEntry.endTime)})
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHeartStore(currentEntry.id)}
                        className="cursor-pointer p-0.5"
                      >
                        <PencilHeart filled={!!currentEntry.isHearted} theme="vintage" />
                      </button>
                      
                      <span className="font-handwriting text-sm text-[#7A6855] dark:text-[#8FA5B8] min-w-6">
                        #{currentEntry.pageNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (nextEntry) router.push(`/daily-diary/${nextEntry.id}`);
                          else handleNewPage();
                        }}
                        className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] font-handwriting text-sm flex items-center gap-1 cursor-pointer"
                      >
                        <span>{nextEntry ? "Next" : "New +"}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={currentEntry.title}
                      onChange={(e) => updateEntry({ title: e.target.value })}
                      placeholder="Title of your reflection..."
                      className="w-full bg-transparent font-handwriting text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#FAF5ED] border-b-2 border-[#C9BC9F] dark:border-[#2C4158] focus:border-[#8C3A27] focus:outline-none py-0.5 placeholder:text-[#8C7A68]/50"
                    />
                  </div>

                  {/* Ruled Description Textarea */}
                  <div>
                    <textarea
                      rows={7}
                      value={currentEntry.description}
                      onChange={(e) => updateEntry({ description: e.target.value })}
                      placeholder="Inscribe your thoughts, sketches of mind, and quiet recollections in walnut ink..."
                      className="w-full bg-transparent ruled-lines-bg font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none resize-none selection:bg-[#E8C89A] placeholder:text-[#8C7A68]/40"
                    />
                  </div>

                  {/* 3 Gratitudes */}
                  <div className="space-y-1.5 pt-1">
                    {currentEntry.gratitude.map((item, idx) => (
                      <div key={idx} className="flex items-baseline gap-2">
                        <span className="font-handwriting text-lg font-bold text-[#8C3A27] dark:text-[#E59375]">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={item}
                          placeholder={`Gratitude #${idx + 1}...`}
                          onChange={(e) => {
                            const newGrat = [...currentEntry.gratitude] as [string, string, string];
                            newGrat[idx] = e.target.value;
                            updateEntry({ gratitude: newGrat });
                          }}
                          className="flex-1 bg-transparent border-b border-[#D5C9AC] dark:border-[#2C4158] font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none focus:border-[#8C3A27] py-0.5 placeholder:text-[#8C7A68]/40"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Energy & Mood Selectors */}
                  <div className="pt-2 border-t border-[#D8CCB0]/70 dark:border-[#223348]/70 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8]">Energy</span>
                        <span className="font-handwriting text-base font-bold text-[#8C3A27] dark:text-amber-300">
                          {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {ENERGY_LEVELS.map((e) => (
                          <button
                            key={e.level}
                            type="button"
                            onClick={() => updateEntry({ energyLevel: e.level })}
                            className={`py-1 px-1 text-center torn-paper cursor-pointer ${
                              currentEntry.energyLevel === e.level
                                ? "bg-[#8C3A27] text-[#FAF6EE] font-bold"
                                : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#544332] dark:text-[#B4C5D6]"
                            }`}
                          >
                            <span className="font-handwriting text-base font-bold block">{e.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      <div className="space-y-1">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">Mood</span>
                        <div className="grid grid-cols-3 gap-1">
                          {MOOD_LIST.map((m, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateEntry({ mood: `${m.emoji} ${m.label}` })}
                              className={`flex items-center justify-center gap-1 px-1.5 py-1 torn-paper cursor-pointer ${
                                currentEntry.mood === `${m.emoji} ${m.label}`
                                  ? "bg-[#8C3A27] text-[#FAF7F0] font-bold"
                                  : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#4A392A] dark:text-[#B8CADB]"
                              }`}
                            >
                              <span className="text-xs">{m.emoji}</span>
                              <span className="font-handwriting text-sm">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">Weather</span>
                        <div className="grid grid-cols-4 gap-1">
                          {WEATHER_LIST.map((w) => {
                            const Icon = w.icon;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => updateEntry({ weather: w.id })}
                                className={`p-1 torn-paper flex flex-col items-center justify-center cursor-pointer ${
                                  currentEntry.weather === w.id
                                    ? "bg-[#8C3A27] text-[#FAF7F0] font-bold"
                                    : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#6B5A4B] dark:text-[#8FA5B8]"
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                <span className="font-handwriting text-[11px] mt-0.5">{w.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Folio Bottom */}
                  <div className="pt-4 mt-4 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between text-[#7A6855] dark:text-[#8FA5B8]">
                    <div className="font-handwriting text-xs italic flex items-center gap-1">
                      <Feather className="h-3 w-3 text-[#8C3A27]" />
                      <span>Inked in walnut cursive</span>
                    </div>
                    <div className="font-handwriting font-bold text-sm tracking-widest text-[#3E2E21] dark:text-[#F1E8DC]">
                      — Page {currentEntry.pageNumber} —
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="font-handwriting text-base text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{isSaved ? "Saved" : "Seal Page"}</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ) : 

          /* =========================================================================
             THEME 2: CLASSIC NOTEBOOK (MID-CENTURY CLOTH, IVORY PAPER, FOUNTAIN INK)
             ========================================================================= */
          theme === "classic" ? (
            <div className="w-full relative shadow-xl rounded-lg overflow-hidden border border-[#D0C5B0] dark:border-[#1E3048]">
              {/* Gold Corner Accents */}
              <div className="bg-[#FBF9F2] dark:bg-[#121A26] p-5 sm:p-8 md:p-10 relative">
                
                {/* Top Ribbon Bookmark */}
                <div className="absolute top-0 right-10 w-6 h-8 bg-gradient-to-b from-[#D4AF37] to-[#AA8520] rounded-b shadow-sm pointer-events-none" />

                <div className="space-y-5 relative z-10">
                  
                  {/* Top Folio Bar */}
                  <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { if (prevEntry) router.push(`/daily-diary/${prevEntry.id}`); }}
                      disabled={!prevEntry}
                      className="px-2 py-0.5 rounded bg-[#EDE7D6] dark:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37] font-serif text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Prev</span>
                    </button>

                    <div className="font-serif text-sm sm:text-base font-bold text-[#1E3A5F] dark:text-[#E2ECF7] tracking-wide text-center flex-1 truncate px-1">
                      {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} ({calculateDuration(currentEntry.startTime, currentEntry.endTime)})
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHeartStore(currentEntry.id)}
                        className="cursor-pointer p-0.5"
                      >
                        <PencilHeart filled={!!currentEntry.isHearted} theme="classic" />
                      </button>
                      
                      <span className="font-mono text-xs font-bold text-[#AA8520]">
                        #{currentEntry.pageNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (nextEntry) router.push(`/daily-diary/${nextEntry.id}`);
                          else handleNewPage();
                        }}
                        className="px-2 py-0.5 rounded bg-[#EDE7D6] dark:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37] font-serif text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>{nextEntry ? "Next" : "New +"}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={currentEntry.title}
                      onChange={(e) => updateEntry({ title: e.target.value })}
                      placeholder="Title of your entry..."
                      className="w-full bg-transparent font-serif text-xl sm:text-2xl font-bold text-[#152B47] dark:text-[#F1F6FC] border-b border-[#D4AF37]/50 focus:border-[#1E3A5F] focus:outline-none py-1 placeholder:text-[#1E3A5F]/40"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <textarea
                      rows={7}
                      value={currentEntry.description}
                      onChange={(e) => updateEntry({ description: e.target.value })}
                      placeholder="Record your daily inquiries, field notes, and reflections with fountain pen clarity..."
                      className="w-full bg-transparent font-serif text-base sm:text-lg text-[#152B47] dark:text-[#E2ECF7] leading-relaxed focus:outline-none resize-none placeholder:text-[#1E3A5F]/30"
                    />
                  </div>

                  {/* 3 Gratitudes */}
                  <div className="space-y-2 pt-1 border-t border-[#D0C5B0]/50">
                    <span className="font-mono text-[10px] uppercase text-[#AA8520] font-bold tracking-wider block">
                      Gratitude Inscriptions
                    </span>
                    {currentEntry.gratitude.map((item, idx) => (
                      <div key={idx} className="flex items-baseline gap-2">
                        <span className="font-serif text-sm font-bold text-[#D4AF37]">
                          §{idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={item}
                          placeholder={`Daily blessing #${idx + 1}...`}
                          onChange={(e) => {
                            const newGrat = [...currentEntry.gratitude] as [string, string, string];
                            newGrat[idx] = e.target.value;
                            updateEntry({ gratitude: newGrat });
                          }}
                          className="flex-1 bg-transparent border-b border-[#D0C5B0]/40 font-serif text-base text-[#152B47] dark:text-[#E2ECF7] focus:outline-none focus:border-[#1E3A5F] py-0.5 placeholder:text-muted-foreground/40"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Selectors */}
                  <div className="pt-2 border-t border-[#D0C5B0]/50 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-xs font-bold text-[#AA8520] uppercase">Vitality</span>
                        <span className="font-serif text-xs font-bold text-[#1E3A5F] dark:text-[#E2ECF7]">
                          {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {ENERGY_LEVELS.map((e) => (
                          <button
                            key={e.level}
                            type="button"
                            onClick={() => updateEntry({ energyLevel: e.level })}
                            className={`py-1.5 px-1 text-center rounded border font-serif text-xs cursor-pointer ${
                              currentEntry.energyLevel === e.level
                                ? "bg-[#1E3A5F] text-[#FAF7EE] border-[#D4AF37] font-bold"
                                : "bg-[#EDE7D6]/60 dark:bg-[#162232] border-[#D0C5B0]/60 text-[#152B47] dark:text-[#CBD5E1]"
                            }`}
                          >
                            <span>{e.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-bold text-[#AA8520] uppercase block">Disposition</span>
                        <div className="grid grid-cols-3 gap-1">
                          {MOOD_LIST.map((m, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateEntry({ mood: `${m.emoji} ${m.label}` })}
                              className={`flex items-center justify-center gap-1 px-1 py-1 rounded border text-xs font-serif cursor-pointer ${
                                currentEntry.mood === `${m.emoji} ${m.label}`
                                  ? "bg-[#1E3A5F] text-[#FAF7EE] border-[#D4AF37] font-bold"
                                  : "bg-[#EDE7D6]/60 dark:bg-[#162232] border-[#D0C5B0]/60 text-[#152B47] dark:text-[#CBD5E1]"
                              }`}
                            >
                              <span>{m.emoji}</span>
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="font-mono text-xs font-bold text-[#AA8520] uppercase block">Atmosphere</span>
                        <div className="grid grid-cols-4 gap-1">
                          {WEATHER_LIST.map((w) => {
                            const Icon = w.icon;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => updateEntry({ weather: w.id })}
                                className={`p-1 rounded border flex flex-col items-center justify-center cursor-pointer ${
                                  currentEntry.weather === w.id
                                    ? "bg-[#1E3A5F] text-[#FAF7EE] border-[#D4AF37] font-bold"
                                    : "bg-[#EDE7D6]/60 dark:bg-[#162232] border-[#D0C5B0]/60 text-[#152B47] dark:text-[#CBD5E1]"
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                <span className="text-[10px] font-mono mt-0.5">{w.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Folio Bottom */}
                  <div className="pt-4 mt-4 border-t border-[#D4AF37]/40 flex items-center justify-between text-[#8A7B66] dark:text-[#94A8BA] text-xs font-serif">
                    <span>Smythson Ivory Linen Paper</span>
                    <span className="font-mono font-bold tracking-wider">— Page {currentEntry.pageNumber} —</span>
                    <button onClick={handleSave} className="text-[#1E3A5F] dark:text-[#D4AF37] hover:underline font-bold cursor-pointer">
                      {isSaved ? "Saved" : "Commit Entry"}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ) : 

          /* =========================================================================
             THEME 3: MODERN BOOK (MATTE MINIMALIST STUDIO, SANS, AMBIENT GLOW)
             ========================================================================= */
          (
            <div className="w-full relative bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 md:p-10 select-text">
              <div className="space-y-5">
                
                {/* Top Folio Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { if (prevEntry) router.push(`/daily-diary/${prevEntry.id}`); }}
                    disabled={!prevEntry}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span>Prev</span>
                  </button>

                  <div className="font-sans text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-center flex-1 truncate px-1">
                    {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} ({calculateDuration(currentEntry.startTime, currentEntry.endTime)})
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHeartStore(currentEntry.id)}
                      className="cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <PencilHeart filled={!!currentEntry.isHearted} theme="modern" />
                    </button>
                    
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      p. {currentEntry.pageNumber}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (nextEntry) router.push(`/daily-diary/${nextEntry.id}`);
                        else handleNewPage();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{nextEntry ? "Next" : "New +"}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={currentEntry.title}
                    onChange={(e) => updateEntry({ title: e.target.value })}
                    placeholder="Focus Title or Morning Intent..."
                    className="w-full bg-transparent font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-none py-1 placeholder:text-slate-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <textarea
                    rows={7}
                    value={currentEntry.description}
                    onChange={(e) => updateEntry({ description: e.target.value })}
                    placeholder="Type your notes, sprint logs, and mindful reflections..."
                    className="w-full bg-transparent font-sans text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed focus:outline-none resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* 3 Gratitudes */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-mono text-[11px] uppercase text-sky-500 font-semibold tracking-wider block">
                    Key Gratitudes
                  </span>
                  {currentEntry.gratitude.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item}
                        placeholder={`Gratitude #${idx + 1}...`}
                        onChange={(e) => {
                          const newGrat = [...currentEntry.gratitude] as [string, string, string];
                          newGrat[idx] = e.target.value;
                          updateEntry({ gratitude: newGrat });
                        }}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-sans text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
                      />
                    </div>
                  ))}
                </div>

                {/* Selectors */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-500 uppercase">Energy Level</span>
                      <span className="text-xs font-bold text-sky-500">
                        {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ENERGY_LEVELS.map((e) => (
                        <button
                          key={e.level}
                          type="button"
                          onClick={() => updateEntry({ energyLevel: e.level })}
                          className={`py-1.5 px-1 text-center rounded-lg font-sans text-xs transition-colors cursor-pointer ${
                            currentEntry.energyLevel === e.level
                              ? "bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-900 font-bold shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          <span>{e.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-500 uppercase block">Mood</span>
                      <div className="grid grid-cols-3 gap-1">
                        {MOOD_LIST.map((m, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateEntry({ mood: `${m.emoji} ${m.label}` })}
                            className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-sans transition-colors cursor-pointer ${
                              currentEntry.mood === `${m.emoji} ${m.label}`
                                ? "bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-900 font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            <span>{m.emoji}</span>
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-500 uppercase block">Weather</span>
                      <div className="grid grid-cols-4 gap-1">
                        {WEATHER_LIST.map((w) => {
                          const Icon = w.icon;
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => updateEntry({ weather: w.id })}
                              className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                currentEntry.weather === w.id
                                  ? "bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-900 font-bold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              <span className="text-[10px] font-mono mt-0.5">{w.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Folio Bottom */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
                  <span>Modern Minimalist Canvas</span>
                  <span className="font-mono font-bold">— Page {currentEntry.pageNumber} —</span>
                  <button onClick={handleSave} className="text-sky-500 hover:underline font-bold cursor-pointer">
                    {isSaved ? "Saved" : "Save Entry"}
                  </button>
                </div>

              </div>
            </div>
          )

        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TABLE OF CONTENTS INDEX */}
        {/* ========================================================================= */}
        {activeView === "index" && (
          <div className="w-full relative bg-card border border-border rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-[#3368A0]" />
                <h2 className="font-serif text-xl font-bold text-foreground">
                  {currentDiary?.name} — Table of Contents
                </h2>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {diaryEntries.length} Pages Inscribed
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-border/60">
              {diaryEntries.map((entry) => {
                const isCurrent = entry.id === currentEntry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      router.push(`/daily-diary/${entry.id}`);
                      setActiveView("entry");
                    }}
                    className={`py-3 px-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isCurrent ? "bg-muted/60" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="font-bold text-[#3368A0]">p. {entry.pageNumber}</span>
                        <span className="text-foreground font-semibold">{entry.dayOfWeek}, {entry.dateStr}</span>
                        {entry.isHearted && <Heart className="h-3 w-3 text-red-500 fill-current" />}
                        {isCurrent && <span className="text-[10px] text-amber-500 font-bold uppercase">(Active)</span>}
                      </div>
                      <p className="font-serif text-sm font-bold text-foreground line-clamp-1">
                        {entry.title || "Untitled Reflection"}
                      </p>
                    </div>

                    <span className="text-xs font-serif text-[#3368A0] hover:underline">
                      Turn to page ▸
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView("entry")}
                className="text-xs font-serif text-[#3368A0] hover:underline cursor-pointer"
              >
                Return to Open Page
              </button>
              <Button size="sm" onClick={handleNewPage} className="h-7 text-xs font-serif gap-1">
                <Plus className="h-3 w-3" />
                <span>New Page</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: SUMMARY DIGEST */}
        {/* ========================================================================= */}
        {activeView === "summary" && (
          <div className="w-full relative bg-card border border-border rounded-xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#3368A0]" />
                <h2 className="font-serif text-xl font-bold text-foreground">
                  {currentDiary?.name} — Vitality Digest
                </h2>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Theme: {theme.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg text-center border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground block">Pages Inscribed</span>
                <span className="text-2xl font-serif font-bold text-foreground">{summaryStats.totalPages}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg text-center border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground block">Beloved Pages</span>
                <span className="text-2xl font-serif font-bold text-red-500">{summaryStats.heartedCount}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg text-center border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground block">Avg Vitality</span>
                <span className="text-2xl font-serif font-bold text-foreground">{summaryStats.avgEnergy}/5</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg text-center border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground block">Gratitudes</span>
                <span className="text-2xl font-serif font-bold text-[#3368A0]">{summaryStats.allGratitudes.length}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView("entry")}
                className="text-xs font-serif text-[#3368A0] hover:underline cursor-pointer"
              >
                Return to Open Page
              </button>
              <Button size="sm" onClick={handleNewPage} className="h-7 text-xs font-serif gap-1">
                <Plus className="h-3 w-3" />
                <span>New Page</span>
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
