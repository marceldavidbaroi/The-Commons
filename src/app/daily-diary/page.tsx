"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommonsSealVector } from "@/components/brand/logo";

interface DiaryEntry {
  pageNumber: number;
  dateStr: string;
  dayOfWeek: string;
  yearStr: string;
  title: string;
  description: string;
  gratitude: [string, string, string];
  energyLevel: number;
  startTime: string;
  endTime: string;
  mood: string;
  weather: string;
  isHearted?: boolean;
}

const INITIAL_ENTRIES: DiaryEntry[] = [
  {
    pageNumber: 142,
    dateStr: "September 16",
    dayOfWeek: "Tuesday",
    yearStr: "Anno 2026",
    title: "A quiet morning with tea and great architectural clarity.",
    description:
      "Woke up before dawn to the soft patter of rain. Made a hot cup of loose-leaf black tea and spent an hour sketching schema flows by hand before opening the computer.\n\nEliminating unnecessary distractions made all the difference today. The modular tables and reactive state feel balanced and intuitive now.",
    gratitude: [
      "The quiet hush of the morning house before anyone else was awake.",
      "A breakthrough on our clean design language without cluttered cards.",
      "Warm cedar incense burning by the window.",
    ],
    energyLevel: 4,
    startTime: "08:30",
    endTime: "17:45",
    mood: "✨ Inspired",
    weather: "rainy",
    isHearted: true,
  },
  {
    pageNumber: 141,
    dateStr: "September 15",
    dayOfWeek: "Monday",
    yearStr: "Anno 2026",
    title: "Setting peaceful intentions for the week ahead.",
    description:
      "Monday arrived with crisp golden sunlight. Reviewed our core roadmap and decided to simplify our interface to feel like a timeless handwritten journal.\n\nNature walk at midday helped untangle several tricky state problems.",
    gratitude: [
      "Fresh crisp autumn air on the afternoon path.",
      "Clear team alignment during morning check-in.",
      "An uninterrupted two-hour deep work session.",
    ],
    energyLevel: 3,
    startTime: "09:00",
    endTime: "17:00",
    mood: "🌿 Calm",
    weather: "sunny",
    isHearted: false,
  },
  {
    pageNumber: 140,
    dateStr: "September 14",
    dayOfWeek: "Sunday",
    yearStr: "Anno 2026",
    title: "Sunday reflection: Rest, gardening, and old fountain pens.",
    description:
      "Spent the afternoon cleaning vintage fountain pens and reading under the oak tree. Taking time away from screens always restores perspective and creative stamina.",
    gratitude: [
      "Homegrown mint tea in the afternoon.",
      "A long letter received from an old friend.",
      "Gentle breeze through the open kitchen door.",
    ],
    energyLevel: 5,
    startTime: "10:15",
    endTime: "18:30",
    mood: "☕ Cozy",
    weather: "sunny",
    isHearted: true,
  },
  {
    pageNumber: 139,
    dateStr: "September 11",
    dayOfWeek: "Thursday",
    yearStr: "Anno 2026",
    title: "Deep focus sprint on fluid responsive typography.",
    description:
      "Tested various font pairings across device sizes. When typography feels right, the whole interface comes to life effortlessly without needing loud decorations.",
    gratitude: [
      "Smooth collaborative review with the engineering team.",
      "A delicious bowl of warm miso soup at lunch.",
      "Productive rhythm on design system tokens.",
    ],
    energyLevel: 4,
    startTime: "08:45",
    endTime: "17:15",
    mood: "🎯 Focused",
    weather: "cloudy",
    isHearted: false,
  },
  {
    pageNumber: 138,
    dateStr: "September 08",
    dayOfWeek: "Monday",
    yearStr: "Anno 2026",
    title: "Welcoming September: Autumn plans and fresh beginnings.",
    description:
      "First week of September brought cooler mornings and amber evening light. Outlined quarterly goals with a renewed sense of focus and calm dedication.",
    gratitude: [
      "Cool breeze announcing the change of seasons.",
      "A quiet desk space with natural daylight.",
      "Good coffee beans ground fresh at sunrise.",
    ],
    energyLevel: 3,
    startTime: "09:15",
    endTime: "16:45",
    mood: "🌊 In Flow",
    weather: "sunny",
    isHearted: false,
  },
];

const ENERGY_LEVELS = [
  { level: 1, label: "Drained" },
  { level: 2, label: "Low" },
  { level: 3, label: "Steady" },
  { level: 4, label: "High" },
  { level: 5, label: "Peak" },
];

const MOOD_LIST = [
  { emoji: "🌿", label: "Calm" },
  { emoji: "✨", label: "Inspired" },
  { emoji: "🎯", label: "Focused" },
  { emoji: "🌊", label: "In Flow" },
  { emoji: "☕", label: "Cozy" },
  { emoji: "⚡", label: "Energetic" },
];

const WEATHER_LIST = [
  { id: "sunny", label: "Sunny", icon: Sun, inkNote: "Warm & Clear" },
  { id: "cloudy", label: "Overcast", icon: CloudSun, inkNote: "Misty & Mild" },
  { id: "rainy", label: "Rainy", icon: CloudRain, inkNote: "Soft Rains" },
  { id: "night", label: "Clear Night", icon: Moon, inkNote: "Starlit Sky" },
];

function PencilHeart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="w-5 h-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {filled ? (
        <>
          <path
            d="M16 27.5 C15.5 27 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 27 16 27.5 Z"
            fill="#B23A2B"
            opacity="0.85"
          />
          <path
            d="M9 10 L23 10 M8 13 L24 13 M9 16 L23 16 M11 19 L21 19 M13 22 L19 22"
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
        <>
          <path
            d="M16 27.2 C15.5 26.8 4.6 19.5 4.3 11 C4.1 6.3 7.4 4.2 11.3 4.2 C13.6 4.2 15.1 5.4 16 6.4 C16.9 5.4 18.4 4.2 20.7 4.2 C24.6 4.2 27.9 6.3 27.7 11 C27.4 19.5 16.5 26.8 16 27.2 Z"
            stroke="#5C4A3A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-[#94A8BA]"
          />
          <path
            d="M16.2 26.5 C15.8 26.2 5.2 19 5 11.2 C4.8 7 7.8 4.8 11.4 4.8 C13.5 4.8 15 5.8 15.8 6.8 C16.6 5.8 18.1 4.8 20.2 4.8 C23.8 4.8 26.8 7 26.6 11.2 C26.4 19 15.8 26.2 15.4 26.5"
            stroke="#7A6855"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="2 1.5"
            className="opacity-60 dark:stroke-[#CBD5E1]"
          />
        </>
      )}
    </svg>
  );
}

type ViewMode = "entry" | "index" | "summary";

export default function DailyDiarySinglePage() {
  const [activeView, setActiveView] = useState<ViewMode>("entry");
  const [entryIndex, setEntryIndex] = useState(0);
  const [entries, setEntries] = useState<DiaryEntry[]>(INITIAL_ENTRIES);
  const [isSaved, setIsSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<string>("all");

  const currentEntry = entries[entryIndex] || entries[0];

  const updateEntry = (fields: Partial<DiaryEntry>) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[entryIndex] = { ...copy[entryIndex], ...fields };
      return copy;
    });
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1200);
  };

  const handlePrevPage = () => {
    if (entryIndex < entries.length - 1) {
      setEntryIndex(entryIndex + 1);
    }
  };

  const handleNextPage = () => {
    if (entryIndex > 0) {
      setEntryIndex(entryIndex - 1);
    }
  };

  const handleNewPage = () => {
    const newPageNum = (entries[0]?.pageNumber || 142) + 1;
    const today = new Date();
    const newEntry: DiaryEntry = {
      pageNumber: newPageNum,
      dateStr: today.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
      yearStr: `Anno ${today.getFullYear()}`,
      title: "",
      description: "",
      gratitude: ["", "", ""],
      energyLevel: 3,
      startTime: "09:00",
      endTime: "17:00",
      mood: "🌿 Calm",
      weather: "sunny",
      isHearted: false,
    };
    setEntries([newEntry, ...entries]);
    setEntryIndex(0);
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
    return entries.filter((e) => {
      const matchesSearch =
        !searchQuery.trim() ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dateStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dayOfWeek.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `#${e.pageNumber}`.includes(searchQuery);

      const matchesMood = filterMood === "all" || e.mood.includes(filterMood);
      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, filterMood]);

  // Aggregate Stats for Summary Page
  const summaryStats = useMemo(() => {
    const totalPages = entries.length;
    const heartedCount = entries.filter((e) => e.isHearted).length;
    
    // Average Energy
    const totalEnergy = entries.reduce((acc, e) => acc + (e.energyLevel || 3), 0);
    const avgEnergy = (totalEnergy / totalPages).toFixed(1);

    // Mood breakdown
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    // Energy breakdown
    const energyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    entries.forEach((e) => {
      energyCounts[e.energyLevel] = (energyCounts[e.energyLevel] || 0) + 1;
    });

    // All gratitudes
    const allGratitudes: { text: string; pageNumber: number; dateStr: string }[] = [];
    entries.forEach((e) => {
      e.gratitude.forEach((g) => {
        if (g.trim()) {
          allGratitudes.push({ text: g, pageNumber: e.pageNumber, dateStr: e.dateStr });
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
  }, [entries]);

  return (
    <div className="min-h-screen bg-[#DED6C4] dark:bg-[#0A0F17] text-[#2C241E] dark:text-[#E2E8F0] flex flex-col font-sans">
      
      {/* Top Dense Single-Line Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#DED6C4]/90 dark:bg-[#0A0F17]/90 px-3 sm:px-6 py-2 border-b border-[#C8BEA8]/30 dark:border-[#223348]/30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          
          {/* Left: Back & Tome Title */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#6B5A4B] dark:text-[#94A8BA] hover:bg-[#D4C8B3] dark:hover:bg-[#1A2636] rounded-full border border-[#C8BEA8]/50 dark:border-[#223348]"
                title="Return Home"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <CommonsSealVector size={24} markOnly className="shrink-0 hover:rotate-6 transition-transform" />
              <h1 className="text-xs sm:text-sm font-serif font-bold tracking-wide text-[#3E2E21] dark:text-[#E8EFF6] whitespace-nowrap">
                The Commons Journal
              </h1>
            </div>
          </div>

          {/* Right: All Navigation & Actions in a Dense Single Line */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            
            {/* View Switcher Button Group (Journal • Index • Summary) */}
            <div className="inline-flex items-center bg-[#EDE5D2] dark:bg-[#162434] p-0.5 rounded-full border border-[#C2B59C] dark:border-[#223348] shrink-0">
              <button
                type="button"
                onClick={() => setActiveView("entry")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "entry"
                    ? "bg-[#8C3A27] text-[#FAF6EE] shadow-xs font-semibold"
                    : "text-[#4A382A] dark:text-[#CBD5E1] hover:text-[#8C3A27] dark:hover:text-[#F3C465] hover:bg-[#E2D6BC]/60 dark:hover:bg-[#1F3044]/60"
                }`}
                title="Open Journal Writing Page"
              >
                <BookMarked className="h-3 w-3" />
                <span>Journal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("index")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "index"
                    ? "bg-[#8C3A27] text-[#FAF6EE] shadow-xs font-semibold"
                    : "text-[#4A382A] dark:text-[#CBD5E1] hover:text-[#8C3A27] dark:hover:text-[#F3C465] hover:bg-[#E2D6BC]/60 dark:hover:bg-[#1F3044]/60"
                }`}
                title="Open Date-wise Index & Table of Contents"
              >
                <List className="h-3 w-3" />
                <span>Index</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                  activeView === "index"
                    ? "bg-[#702919] text-[#FAF6EE]"
                    : "bg-[#D8CCB0] dark:bg-[#25394D] text-[#4A382A] dark:text-[#CBD5E1]"
                }`}>
                  {entries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("summary")}
                className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeView === "summary"
                    ? "bg-[#8C3A27] text-[#FAF6EE] shadow-xs font-semibold"
                    : "text-[#4A382A] dark:text-[#CBD5E1] hover:text-[#8C3A27] dark:hover:text-[#F3C465] hover:bg-[#E2D6BC]/60 dark:hover:bg-[#1F3044]/60"
                }`}
                title="Open Vitality & Chronicle Summary Digest"
              >
                <BarChart3 className="h-3 w-3" />
                <span>Summary</span>
              </button>
            </div>

            {/* Page navigation (when on Journal view) */}
            {activeView === "entry" && (
              <div className="flex items-center bg-[#DFD6C2] dark:bg-[#14202E] px-1 py-0.5 rounded-full border border-[#C2B59C] dark:border-[#223348] shrink-0">
                <button
                  onClick={handlePrevPage}
                  disabled={entryIndex >= entries.length - 1}
                  className="p-0.5 rounded-full text-[#524131] dark:text-[#94A8BA] hover:bg-[#D0C5AD] dark:hover:bg-[#1F3044] disabled:opacity-30 cursor-pointer"
                  title="Turn back page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                
                <span className="text-[11px] font-serif italic px-1.5 text-[#524131] dark:text-[#CBD5E1]">
                  p. {currentEntry.pageNumber}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={entryIndex <= 0}
                  className="p-0.5 rounded-full text-[#524131] dark:text-[#94A8BA] hover:bg-[#D0C5AD] dark:hover:bg-[#1F3044] disabled:opacity-30 cursor-pointer"
                  title="Turn forward page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Turn to Fresh Blank Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewPage}
              className="h-6.5 px-2 text-xs font-serif border-[#C2B59C] dark:border-[#223348] bg-[#FAF6EE] dark:bg-[#152232] text-[#4A382A] dark:text-[#E2E8F0] hover:bg-[#EBE2D0] dark:hover:bg-[#1C2C40] rounded-full flex items-center gap-1 shadow-2xs shrink-0"
              title="Turn to Fresh Blank Page"
            >
              <Feather className="h-3 w-3 text-[#8C3A27] dark:text-[#D97757]" />
              <span className="hidden md:inline">Fresh Page</span>
            </Button>

            {/* Ink Seal / Save */}
            <Button
              size="sm"
              onClick={handleSave}
              className="h-6.5 px-2.5 rounded-full bg-[#8C3A27] hover:bg-[#732E1E] text-[#FAF7F0] font-serif font-semibold text-xs shadow-xs gap-1 shrink-0"
              title="Save & Inscribe to Tome"
            >
              {isSaved ? (
                <>
                  <Check className="h-3 w-3 text-amber-200" />
                  <span>Inked!</span>
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

      {/* Main Single Parchment Sheet Work Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        
        {/* ========================================================================= */}
        {/* VIEW 1: SINGLE DAILY JOURNAL ENTRY PAGE (OLD PAPER WITH TORN EDGES) */}
        {/* ========================================================================= */}
        {activeView === "entry" && (
          <div className="w-full relative torn-sheet-shadow">
            <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
              
              {/* Vintage Left Margin Line (Faint Red Ink) */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />

              <div className="space-y-4 relative z-10">
                  
                  {/* Top Folio Bar: Prev Button • Date & Time • Heart & Page # • Next Button */}
                  <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-1.5 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={handlePrevPage}
                      disabled={entryIndex >= entries.length - 1}
                      className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] hover:text-[#8C3A27] dark:hover:text-[#F3C465] font-handwriting text-xs sm:text-sm flex items-center gap-0.5 sm:gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs shrink-0"
                      title="Turn to previous page"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>

                    <div className="font-handwriting text-xs sm:text-base md:text-lg font-bold text-[#2A1D13] dark:text-[#FAF4EB] tracking-wide text-center flex-1 truncate px-1">
                      {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} ({calculateDuration(currentEntry.startTime, currentEntry.endTime)})
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <button
                        type="button"
                        onClick={() => updateEntry({ isHearted: !currentEntry.isHearted })}
                        className="cursor-pointer p-0.5 rounded-sm hover:opacity-100 opacity-85"
                        title={currentEntry.isHearted ? "Beloved Entry (Pencil heart filled)" : "Favorite with pencil heart"}
                      >
                        <PencilHeart filled={!!currentEntry.isHearted} />
                      </button>
                      
                      <span className="font-handwriting text-sm text-[#7A6855] dark:text-[#8FA5B8] min-w-6">
                        #{currentEntry.pageNumber}
                      </span>

                      <button
                        type="button"
                        onClick={entryIndex > 0 ? handleNextPage : handleNewPage}
                        className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] hover:text-[#8C3A27] dark:hover:text-[#F3C465] font-handwriting text-sm flex items-center gap-1 cursor-pointer shadow-2xs"
                        title={entryIndex > 0 ? "Turn to next page" : "Turn to fresh new page"}
                      >
                        <span>{entryIndex > 0 ? "Next" : "New +"}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title (Handwritten ink, No label, No placeholder) */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={currentEntry.title}
                      onChange={(e) => updateEntry({ title: e.target.value })}
                      className="w-full bg-transparent font-handwriting text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#FAF5ED] border-b-2 border-[#C9BC9F] dark:border-[#2C4158] focus:border-[#8C3A27] dark:focus:border-amber-400 focus:outline-none py-0.5"
                    />
                  </div>

                  {/* Description / Journal Writing on Ruled Vintage Lines */}
                  <div>
                    <div className="relative rounded-lg p-0">
                      <textarea
                        rows={7}
                        value={currentEntry.description}
                        onChange={(e) => updateEntry({ description: e.target.value })}
                        className="w-full bg-transparent ruled-lines-bg font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none resize-none selection:bg-[#E8C89A] dark:selection:bg-[#344F6E]"
                      />
                    </div>
                  </div>

                  {/* 3 Handwritten Gratitude Bullets */}
                  <div className="space-y-1.5 pt-1">
                    {currentEntry.gratitude.map((item, idx) => (
                      <div key={idx} className="flex items-baseline gap-2">
                        <span className="font-handwriting text-lg font-bold text-[#8C3A27] dark:text-[#E59375]">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newGrat = [...currentEntry.gratitude] as [string, string, string];
                            newGrat[idx] = e.target.value;
                            updateEntry({ gratitude: newGrat });
                          }}
                          className="flex-1 bg-transparent border-b border-[#D5C9AC] dark:border-[#2C4158] font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none focus:border-[#8C3A27] py-0.5"
                        />
                      </div>
                    ))}
                  </div>

                  {/* ============================================================= */}
                  {/* SELECTORS ON TORN PAPER SCRAPS (Compact Handwritten Section) */}
                  {/* ============================================================= */}
                  <div className="pt-2 border-t border-[#D8CCB0]/70 dark:border-[#223348]/70 space-y-3">
                    
                    {/* 1. ENERGY LEVEL */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8]">
                          Energy
                        </span>
                        <span className="font-handwriting text-base font-bold text-[#8C3A27] dark:text-amber-300">
                          {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {ENERGY_LEVELS.map((e) => {
                          const isSelected = currentEntry.energyLevel === e.level;
                          return (
                            <button
                              key={e.level}
                              type="button"
                              onClick={() => updateEntry({ energyLevel: e.level })}
                              className={`py-1 px-1 text-center torn-paper cursor-pointer ${
                                isSelected
                                  ? "bg-[#8C3A27] dark:bg-[#9B402B] text-[#FAF6EE] shadow-sm font-bold"
                                  : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#544332] dark:text-[#B4C5D6] hover:bg-[#E2D6BC] dark:hover:bg-[#203247] shadow-2xs"
                              }`}
                            >
                              <span className="font-handwriting text-base font-bold block leading-tight">
                                {e.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. MOOD & WEATHER SIDE-BY-SIDE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      
                      {/* Mood */}
                      <div className="space-y-1">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">
                          Mood
                        </span>

                        <div className="grid grid-cols-3 gap-1">
                          {MOOD_LIST.map((m, idx) => {
                            const isSelected = currentEntry.mood === `${m.emoji} ${m.label}`;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => updateEntry({ mood: `${m.emoji} ${m.label}` })}
                                className={`flex items-center justify-center gap-1 px-1.5 py-1 torn-paper cursor-pointer ${
                                  isSelected
                                    ? "bg-[#8C3A27] text-[#FAF7F0] shadow-sm font-bold"
                                    : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#4A392A] dark:text-[#B8CADB] hover:bg-[#E2D6BC] dark:hover:bg-[#203247] shadow-2xs"
                                }`}
                              >
                                <span className="text-xs">{m.emoji}</span>
                                <span className="font-handwriting text-sm leading-none">{m.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Weather */}
                      <div className="space-y-1">
                        <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">
                          Weather
                        </span>
                        
                        <div className="grid grid-cols-4 gap-1">
                          {WEATHER_LIST.map((w) => {
                            const Icon = w.icon;
                            const isSelected = currentEntry.weather === w.id;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => updateEntry({ weather: w.id })}
                                className={`p-1 torn-paper flex flex-col items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? "bg-[#8C3A27] text-[#FAF7F0] shadow-sm font-bold"
                                    : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#6B5A4B] dark:text-[#8FA5B8] hover:bg-[#E2D6BC] dark:hover:bg-[#203247] shadow-2xs"
                                }`}
                                title={w.inkNote}
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

                </div>

                {/* Page Bottom Folio / Number */}
                <div className="pt-4 mt-4 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between text-[#7A6855] dark:text-[#8FA5B8] relative z-10">
                  <div className="font-handwriting text-xs italic flex items-center gap-1">
                    <Feather className="h-3 w-3 text-[#8C3A27] dark:text-[#E59375]" />
                    <span>Inked in walnut ink</span>
                  </div>
                  
                  <div className="font-handwriting font-bold text-sm tracking-widest text-[#3E2E21] dark:text-[#F1E8DC]">
                    — Page {currentEntry.pageNumber} —
                  </div>

                  <button
                    onClick={handleSave}
                    className="font-handwriting text-base text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{isSaved ? "Saved to Tome" : "Wax seal entry"}</span>
                  </button>
                </div>

              </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FULL SEPARATE PAGE — TABLE OF CONTENTS & INDEX */}
        {/* ========================================================================= */}
        {activeView === "index" && (
          <div className="w-full relative torn-sheet-shadow">
            <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
              
              {/* Vintage Left Margin Line */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />

              <div className="space-y-4 relative z-10">
                
                {/* Index Folio Header */}
                <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-2">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
                    <h2 className="font-vintage text-lg sm:text-xl font-bold text-[#2C1F16] dark:text-[#FAF4EB] tracking-wide">
                      Table of Contents
                    </h2>
                  </div>

                  <span className="font-handwriting text-sm text-[#7A6855] dark:text-[#94A8BA]">
                    Anno 2026 • {entries.length} Pages Inscribed
                  </span>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A68] dark:text-[#7A8E9E]" />
                    <input
                      type="text"
                      placeholder="Search chronicles by title, thought, or date..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 bg-[#FAF5EB]/90 dark:bg-[#142232]/90 border border-[#C5B89D] dark:border-[#2C4158] rounded-full font-handwriting text-base text-[#1E2536] dark:text-[#F3EDE2] placeholder:text-[#9E8E7D] dark:placeholder:text-[#647888] focus:outline-none focus:border-[#8C3A27]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A68] hover:text-[#2C1F16] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      onClick={() => setFilterMood("all")}
                      className={`px-2 py-0.5 rounded-full text-xs font-handwriting cursor-pointer ${
                        filterMood === "all"
                          ? "bg-[#8C3A27] text-white font-bold"
                          : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#5B4A3A] dark:text-[#CBD5E1]"
                      }`}
                    >
                      All Pages
                    </button>
                    {MOOD_LIST.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => setFilterMood(m.label)}
                        className={`px-2 py-0.5 rounded-full text-xs font-handwriting cursor-pointer ${
                          filterMood === m.label
                            ? "bg-[#8C3A27] text-white font-bold"
                            : "bg-[#EDE5D2] dark:bg-[#1A2838] text-[#5B4A3A] dark:text-[#CBD5E1]"
                        }`}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date-Wise List of Pages */}
                <div className="divide-y divide-[#D8CCB0]/60 dark:divide-[#223348]/60 pt-2">
                  {filteredEntries.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="font-handwriting text-lg text-[#7A6855] dark:text-[#8E9FA8]">
                        No pages match your search query.
                      </p>
                    </div>
                  ) : (
                    filteredEntries.map((entry) => {
                      const realIndex = entries.findIndex((e) => e.pageNumber === entry.pageNumber);
                      const isCurrent = realIndex === entryIndex;

                      return (
                        <div
                          key={entry.pageNumber}
                          onClick={() => {
                            if (realIndex !== -1) setEntryIndex(realIndex);
                            setActiveView("entry");
                          }}
                          className={`py-3 group cursor-pointer flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 ${
                            isCurrent ? "bg-[#EDE4D0]/50 dark:bg-[#1C2C3E]/50 px-2 rounded-md" : "hover:bg-[#EBE2CF]/40 px-2"
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-handwriting font-bold text-sm bg-[#8C3A27] text-white px-2 py-0.5 rounded-full">
                                p. {entry.pageNumber}
                              </span>
                              <span className="font-handwriting font-bold text-base sm:text-lg text-[#2A1D13] dark:text-[#FAF4EB]">
                                {entry.dayOfWeek}, {entry.dateStr}
                              </span>
                              {entry.isHearted && (
                                <Heart className="h-3.5 w-3.5 text-[#B23A2B] fill-[#B23A2B]" />
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-serif uppercase tracking-wider text-[#8C3A27] dark:text-amber-300 font-bold">
                                  (Current Page)
                                </span>
                              )}
                            </div>

                            <p className="font-handwriting text-base font-bold text-[#1E2536] dark:text-[#E8EFF6] group-hover:text-[#8C3A27]">
                              {entry.title || "Untitled Reflection"}
                            </p>

                            <p className="font-handwriting text-sm text-[#6B5A4B] dark:text-[#94A8BA] line-clamp-1">
                              {entry.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <span className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-xs font-handwriting">
                              {entry.mood}
                            </span>
                            <span className="font-handwriting text-sm text-[#8C3A27] dark:text-amber-300">
                              Turn to page ▸
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Index Bottom Actions */}
                <div className="pt-4 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between">
                  <span className="font-handwriting text-sm italic text-[#7A6855] dark:text-[#8FA5B8]">
                    Showing {filteredEntries.length} of {entries.length} pages
                  </span>

                  <button
                    onClick={handleNewPage}
                    className="torn-paper px-3 py-1 bg-[#8C3A27] text-white font-handwriting text-sm font-bold flex items-center gap-1 shadow-xs cursor-pointer hover:bg-[#732E1E]"
                  >
                    <Feather className="h-3 w-3" />
                    <span>Inscribe Fresh Page</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FULL SEPARATE PAGE — CHRONICLE SUMMARY & DIGEST */}
        {/* ========================================================================= */}
        {activeView === "summary" && (
          <div className="w-full relative torn-sheet-shadow">
            <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
              
              {/* Vintage Left Margin Line */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />

              <div className="space-y-5 relative z-10">
                
                {/* Summary Folio Header */}
                <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
                    <h2 className="font-vintage text-lg sm:text-xl font-bold text-[#2C1F16] dark:text-[#FAF4EB] tracking-wide">
                      Vitality & Chronicle Digest
                    </h2>
                  </div>

                  <span className="font-handwriting text-sm text-[#7A6855] dark:text-[#94A8BA]">
                    Year-to-Date Synthesis
                  </span>
                </div>

                {/* Top Stat Cards (Vintage Inked Badges) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  <div className="p-3 torn-paper bg-[#EBE3D0] dark:bg-[#162434] text-center shadow-2xs">
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#8E9FA8] block">
                      Pages Written
                    </span>
                    <span className="font-handwriting text-2xl font-bold text-[#8C3A27] dark:text-[#E59375]">
                      {summaryStats.totalPages}
                    </span>
                  </div>

                  <div className="p-3 torn-paper bg-[#EBE3D0] dark:bg-[#162434] text-center shadow-2xs">
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#8E9FA8] block">
                      Beloved Pages
                    </span>
                    <span className="font-handwriting text-2xl font-bold text-[#B23A2B] dark:text-[#E06C6C] flex items-center justify-center gap-1">
                      <Heart className="h-4 w-4 fill-current inline" />
                      <span>{summaryStats.heartedCount}</span>
                    </span>
                  </div>

                  <div className="p-3 torn-paper bg-[#EBE3D0] dark:bg-[#162434] text-center shadow-2xs">
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#8E9FA8] block">
                      Avg Vitality
                    </span>
                    <span className="font-handwriting text-2xl font-bold text-[#3E2E21] dark:text-[#FAF4EB]">
                      {summaryStats.avgEnergy} <span className="text-xs">/ 5</span>
                    </span>
                  </div>

                  <div className="p-3 torn-paper bg-[#EBE3D0] dark:bg-[#162434] text-center shadow-2xs">
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#8E9FA8] block">
                      Flow Habit
                    </span>
                    <span className="font-handwriting text-2xl font-bold text-[#C48C28] flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 fill-current inline" />
                      <span>5 days</span>
                    </span>
                  </div>

                </div>

                {/* Energy & Vitality Flow Section */}
                <div className="space-y-2 pt-1 border-t border-[#D8CCB0]/60 dark:border-[#223348]/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-handwriting text-base sm:text-lg font-bold text-[#3E2E21] dark:text-[#FAF4EB]">
                      Energy Distribution
                    </h3>
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#94A8BA]">
                      Across all reflections
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ENERGY_LEVELS.map((e) => {
                      const count = summaryStats.energyCounts[e.level] || 0;
                      const pct = Math.round((count / summaryStats.totalPages) * 100);
                      return (
                        <div key={e.level} className="flex items-center gap-3 font-handwriting text-sm">
                          <span className="w-16 font-bold text-[#5B4A3A] dark:text-[#CBD5E1]">
                            {e.label}
                          </span>
                          
                          <div className="flex-1 h-3 bg-[#E5DDCB] dark:bg-[#1A2838] rounded-full overflow-hidden border border-[#D5C9AC] dark:border-[#2C4158]">
                            <div
                              className="h-full bg-[#8C3A27] dark:bg-[#D97757] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <span className="w-12 text-right font-mono text-xs text-[#7A6855] dark:text-[#8FA5B8]">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mood Constellation */}
                <div className="space-y-2 pt-1 border-t border-[#D8CCB0]/60 dark:border-[#223348]/60">
                  <h3 className="font-handwriting text-base sm:text-lg font-bold text-[#3E2E21] dark:text-[#FAF4EB]">
                    Mood Constellation
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(summaryStats.moodCounts).map(([mood, count]) => (
                      <div
                        key={mood}
                        className="torn-paper px-2.5 py-1 bg-[#EBE3D0] dark:bg-[#162434] flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="font-handwriting text-sm font-bold text-[#3E2E21] dark:text-[#FAF4EB]">
                          {mood}
                        </span>
                        <span className="bg-[#8C3A27] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curated Gratitude Harvest */}
                <div className="space-y-2 pt-1 border-t border-[#D8CCB0]/60 dark:border-[#223348]/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-handwriting text-base sm:text-lg font-bold text-[#3E2E21] dark:text-[#FAF4EB] flex items-center gap-1.5">
                      <Quote className="h-3.5 w-3.5 text-[#8C3A27]" />
                      <span>Gratitude Harvest</span>
                    </h3>
                    <span className="font-handwriting text-xs text-[#7A6855] dark:text-[#94A8BA]">
                      {summaryStats.allGratitudes.length} blessings recorded
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {summaryStats.allGratitudes.map((g, idx) => (
                      <div
                        key={idx}
                        className="font-handwriting text-sm text-[#4A382A] dark:text-[#CBD5E1] flex items-baseline gap-2 border-b border-[#D8CCB0]/40 pb-1"
                      >
                        <span className="text-[#8C3A27] font-bold text-xs">#{idx + 1}</span>
                        <span className="flex-1 italic">&ldquo;{g.text}&rdquo;</span>
                        <span className="text-[11px] text-[#8C7A68] opacity-80 shrink-0">
                          (p. {g.pageNumber})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Bottom Actions */}
                <div className="pt-4 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between">
                  <button
                    onClick={() => setActiveView("entry")}
                    className="font-handwriting text-sm text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    <span>Return to Open Journal</span>
                  </button>

                  <button
                    onClick={handleNewPage}
                    className="torn-paper px-3 py-1 bg-[#8C3A27] text-white font-handwriting text-sm font-bold flex items-center gap-1 shadow-xs cursor-pointer hover:bg-[#732E1E]"
                  >
                    <Feather className="h-3 w-3" />
                    <span>Inscribe Today&apos;s Page</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Footer info under the parchment */}
        <div className="mt-3 text-center text-xs font-serif italic text-[#7A6855] dark:text-[#7D93A7]">
          Use the top tabs to switch between Journal, Index, and Summary pages
        </div>

      </main>
    </div>
  );
}
