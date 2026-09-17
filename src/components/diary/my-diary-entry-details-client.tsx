"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  List,
  BarChart3,
  BookMarked,
  Heart,
  Plus,
  BookOpen,
  Search,
  Pencil,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommonsSealVector } from "@/components/brand/logo";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useDiaryStore } from "@/stores/diary-store";
import {
  useDiariesOverview,
  useDiaryEntries,
  useDiaryStats,
  useUpdateDiaryEntryMutation,
  useCreateDiaryEntryMutation,
  useUpdateDiaryMutation,
  useDeleteDiaryMutation,
  useDeleteDiaryEntryMutation,
  useToggleHeartEntryMutation,
} from "@/hooks/queries/use-diaries";
import { Diary, DiaryEntry, DiaryTheme, ENERGY_LEVELS, MOOD_LIST } from "@/types/diary";

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

export function MyDiaryEntryDetailsClient({
  diaryId,
  entryId,
}: {
  diaryId: string;
  entryId: string;
}) {
  const router = useRouter();

  // 1. TanStack Query + Supabase Hooks
  const { data: diaries = [] } = useDiariesOverview();
  const { data: fetchedEntries = [] } = useDiaryEntries(diaryId);
  const { data: stats } = useDiaryStats(diaryId);
  const updateEntryMutation = useUpdateDiaryEntryMutation();
  const createEntryMutation = useCreateDiaryEntryMutation();
  const updateDiaryMutation = useUpdateDiaryMutation();
  const deleteDiaryMutation = useDeleteDiaryMutation();
  const deleteEntryMutation = useDeleteDiaryEntryMutation();
  const toggleHeartMutation = useToggleHeartEntryMutation();

  // 2. Local Zustand Store
  const storeEntries = useDiaryStore((s) => s.entries);
  const getDiaryById = useDiaryStore((s) => s.getDiaryById);
  const getEntryById = useDiaryStore((s) => s.getEntryById);
  const updateEntryStore = useDiaryStore((s) => s.updateEntry);
  const toggleHeartStore = useDiaryStore((s) => s.toggleHeart);
  const searchQuery = useDiaryStore((s) => s.searchQuery);
  const setSearchQuery = useDiaryStore((s) => s.setSearchQuery);

  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>("entry");
  const [isSaved, setIsSaved] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [filterMood, setFilterMood] = useState<string>("all");
  const isFirstMount = React.useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Edit Diary Properties Modal State
  const [isEditDiaryOpen, setIsEditDiaryOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTheme, setEditTheme] = useState<DiaryTheme>("vintage");

  const currentDiary = useMemo(() => {
    return diaries.find((d: Diary) => d.id === diaryId) || getDiaryById(diaryId) || diaries[0];
  }, [diaryId, diaries, getDiaryById]);

  const handleOpenEditDiaryModal = () => {
    if (!currentDiary) return;
    setEditName(currentDiary.name);
    setEditDescription(currentDiary.description || "");
    setEditTheme(currentDiary.theme || "vintage");
    setIsEditDiaryOpen(true);
  };

  const handleSaveDiaryProperties = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDiary || !editName.trim()) return;

    try {
      await updateDiaryMutation.mutateAsync({
        diaryId: currentDiary.id,
        updates: {
          name: editName,
          description: editDescription,
          theme: editTheme,
        },
      });
      setIsEditDiaryOpen(false);
    } catch (err) {
      console.error("Failed to update diary properties:", err);
    }
  };

  const handleDeleteDiary = async () => {
    if (!currentDiary) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the chronicle tome "${currentDiary.name}" and all of its pages? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteDiaryMutation.mutateAsync(currentDiary.id);
      setIsEditDiaryOpen(false);
      router.push("/my-diaries");
    } catch (err) {
      console.error("Failed to delete diary:", err);
    }
  };

  const diaryEntries = useMemo(() => {
    const list = storeEntries.length > 0 ? storeEntries : fetchedEntries;
    if (!currentDiary) return list;
    return list.filter((e: DiaryEntry) => e.diaryId === currentDiary.id);
  }, [storeEntries, fetchedEntries, currentDiary]);

  const currentEntry = useMemo(() => {
    const found = diaryEntries.find((e: DiaryEntry) => e.id === entryId || String(e.pageNumber) === entryId);
    if (found) return found;
    return diaryEntries[0] || getEntryById(entryId) || storeEntries[0] || fetchedEntries[0];
  }, [diaryEntries, entryId, getEntryById, storeEntries, fetchedEntries]);

  const currentDiaryIndex = useMemo(() => {
    if (!currentEntry) return 0;
    const idx = diaryEntries.findIndex((e: DiaryEntry) => e.id === currentEntry.id);
    return idx >= 0 ? idx : 0;
  }, [diaryEntries, currentEntry]);

  const prevEntry = currentDiaryIndex < diaryEntries.length - 1 ? diaryEntries[currentDiaryIndex + 1] : null;
  const nextEntry = currentDiaryIndex > 0 ? diaryEntries[currentDiaryIndex - 1] : null;

  const theme: DiaryTheme = currentDiary?.theme || "vintage";

  const updateEntry = (fields: Partial<DiaryEntry>) => {
    if (!currentEntry) return;
    updateEntryStore(currentEntry.id, fields);
  };

  const handleToggleHeart = () => {
    if (!currentEntry) return;
    const newHeartState = !currentEntry.isHearted;
    toggleHeartMutation.mutate({
      entryId: currentEntry.id,
      isHearted: newHeartState,
      diaryId: currentEntry.diaryId,
    });
  };

  // Debounced Autosave effect for seamless synchronization
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!currentEntry) return;

    setIsAutosaving(true);
    const timer = setTimeout(async () => {
      try {
        await updateEntryMutation.mutateAsync({
          entryId: currentEntry.id,
          updates: {
            title: currentEntry.title,
            description: currentEntry.description,
            gratitude: currentEntry.gratitude,
            energyLevel: currentEntry.energyLevel,
            startTime: currentEntry.startTime,
            endTime: currentEntry.endTime,
            mood: currentEntry.mood,
            weather: currentEntry.weather,
            isHearted: currentEntry.isHearted,
          },
        });
        setIsAutosaving(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } catch (err) {
        setIsAutosaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentEntry?.title,
    currentEntry?.description,
    currentEntry?.gratitude?.[0],
    currentEntry?.gratitude?.[1],
    currentEntry?.gratitude?.[2],
    currentEntry?.energyLevel,
    currentEntry?.startTime,
    currentEntry?.endTime,
    currentEntry?.mood,
    currentEntry?.weather,
  ]);

  const handleSave = async () => {
    if (!currentEntry) return;
    try {
      await updateEntryMutation.mutateAsync({
        entryId: currentEntry.id,
        updates: {
          title: currentEntry.title,
          description: currentEntry.description,
          gratitude: currentEntry.gratitude,
          energyLevel: currentEntry.energyLevel,
          startTime: currentEntry.startTime,
          endTime: currentEntry.endTime,
          mood: currentEntry.mood,
          weather: currentEntry.weather,
          isHearted: currentEntry.isHearted,
        },
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } catch (err) {
      console.error("Failed to save entry:", err);
    }
  };

  const handleNewPage = async () => {
    if (!currentDiary) return;
    try {
      const newEntry = await createEntryMutation.mutateAsync({
        diaryId: currentDiary.id,
      });
      router.push(`/my-diaries/${currentDiary.id}/pages/${newEntry.id}`);
      setActiveView("entry");
    } catch (err) {
      console.error("Failed to create new page:", err);
    }
  };

  const handleDeletePage = async (targetEntryId?: string) => {
    const idToDelete = targetEntryId || currentEntry?.id;
    if (!idToDelete || !currentDiary) return;

    const confirmed = window.confirm(
      "Are you sure you wish to strike out and delete this diary leaf? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteEntryMutation.mutateAsync({
        entryId: idToDelete,
        diaryId: currentDiary.id,
      });

      if (idToDelete === currentEntry?.id) {
        const remaining = diaryEntries.filter((e: DiaryEntry) => e.id !== idToDelete);
        if (remaining.length > 0) {
          router.push(`/my-diaries/${currentDiary.id}/pages/${remaining[0].id}`);
        } else {
          router.push("/my-diaries");
        }
      }
    } catch (err) {
      console.error("Failed to delete diary page:", err);
    }
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
    return diaryEntries.filter((e: DiaryEntry) => {
      const matchesSearch =
        !searchQuery.trim() ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dateStr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dayOfWeek?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `#${e.pageNumber}`.includes(searchQuery);

      const matchesMood =
        filterMood === "all" ||
        e.mood === filterMood ||
        e.mood?.toLowerCase().includes(filterMood.toLowerCase());
      return matchesSearch && matchesMood;
    });
  }, [diaryEntries, searchQuery, filterMood]);

  // Summary stats merged from PostgreSQL RPC and local cache
  const summaryStats = useMemo(() => {
    const totalPages = stats?.total_entries ?? diaryEntries.length;
    const heartedCount =
      stats?.hearted_entries ?? diaryEntries.filter((e: DiaryEntry) => e.isHearted).length;
    const totalWords =
      stats?.total_words ??
      diaryEntries.reduce(
        (sum, e) => sum + (e.description ? e.description.split(/\s+/).filter(Boolean).length : 0),
        0
      );
    const currentStreak = stats?.current_streak ?? 0;
    const longestStreak = stats?.longest_streak ?? 0;

    const totalEnergy = diaryEntries.reduce(
      (acc: number, e: DiaryEntry) => acc + (e.energyLevel || 3),
      0
    );
    const avgEnergy = stats?.average_energy
      ? String(stats.average_energy)
      : totalPages > 0
      ? (totalEnergy / totalPages).toFixed(1)
      : "3.5";

    const moodCounts: Record<string, number> = stats?.mood_breakdown || {};
    if (Object.keys(moodCounts).length === 0) {
      diaryEntries.forEach((e: DiaryEntry) => {
        if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      });
    }

    const energyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    diaryEntries.forEach((e: DiaryEntry) => {
      energyCounts[e.energyLevel] = (energyCounts[e.energyLevel] || 0) + 1;
    });

    const allGratitudes: { text: string; pageNumber: number; dateStr: string; entryId: string }[] =
      [];
    diaryEntries.forEach((e: DiaryEntry) => {
      e.gratitude?.forEach((g: string) => {
        if (g && g.trim()) {
          allGratitudes.push({
            text: g,
            pageNumber: e.pageNumber,
            dateStr: e.dateStr,
            entryId: e.id,
          });
        }
      });
    });

    return {
      totalPages,
      heartedCount,
      totalWords,
      currentStreak,
      longestStreak,
      avgEnergy,
      moodCounts,
      energyCounts,
      allGratitudes,
    };
  }, [diaryEntries, stats]);

  if (!mounted || !currentEntry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <Feather className="h-8 w-8 text-[#8C3A27] mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">Opening the Codex...</h2>
          <Link href="/my-diaries">
            <Button variant="outline" className="font-serif text-sm mt-2">
              Return to My Diaries
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
    <AuthGuard>
      <div className={`min-h-screen ${themePageBg} flex flex-col transition-colors duration-200`}>
        {/* 1. TOP TOOLBAR HEADER */}
        <header className={`sticky top-0 z-40 ${themeHeaderBg} px-3 sm:px-6 py-2 border-b backdrop-blur-xs`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Left: Back & Seal + Diary Name */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/my-diaries">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-current/20 cursor-pointer"
                  title="Return to My Diaries (/my-diaries)"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <div className="flex items-center gap-1.5">
                <Link href="/my-diaries" className="flex items-center gap-2 hover:opacity-85 transition-opacity" title="Return to My Diaries">
                  <CommonsSealVector size={22} markOnly className="shrink-0 hover:rotate-6 transition-transform" />
                  <span className="text-xs font-serif font-bold tracking-wide truncate max-w-[130px] sm:max-w-[180px]">
                    {currentDiary?.name}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleOpenEditDiaryModal}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-current/60 hover:text-current cursor-pointer transition-colors"
                  title="Edit Diary Tome Properties"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
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
                      if (prevEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${prevEntry.id}`);
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
                      if (nextEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${nextEntry.id}`);
                    }}
                    disabled={!nextEntry}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="Turn forward page"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Return to My Diaries List */}
              <Link href="/my-diaries">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0"
                  title="Return to My Diaries"
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="hidden sm:inline">All Diaries</span>
                </Button>
              </Link>

              {/* Fresh Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewPage}
                className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0 cursor-pointer"
                title="Turn to Fresh Blank Page"
              >
                <Plus className="h-3 w-3 text-[#8C3A27] dark:text-[#E59375]" />
                <span className="hidden md:inline">Fresh Page</span>
              </Button>

              {/* Delete Active Page */}
              {activeView === "entry" && currentEntry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePage()}
                  disabled={deleteEntryMutation.isPending}
                  className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                  title="Delete This Page"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden md:inline">Delete Page</span>
                </Button>
              )}

              {/* Seal / Inked Save */}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isAutosaving}
                className={`h-6.5 px-2.5 rounded-full font-serif font-semibold text-xs shadow-xs gap-1 shrink-0 cursor-pointer ${themeSaveBtn}`}
                title="Save & Inscribe"
              >
                {isAutosaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-amber-200" />
                    <span>Ink drying...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="h-3 w-3 text-amber-200" />
                    <span>Saved</span>
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

        {/* 2. MAIN JOURNAL CANVAS */}
        <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
          {activeView === "entry" && (
            theme === "vintage" ? (
              <div className="w-full relative torn-sheet-shadow">
                <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
                  <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-1.5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { if (prevEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${prevEntry.id}`); }}
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
                          onClick={handleToggleHeart}
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
                            if (nextEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${nextEntry.id}`);
                            else handleNewPage();
                          }}
                          className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] font-handwriting text-sm flex items-center gap-1 cursor-pointer"
                        >
                          <span>{nextEntry ? "Next" : "New +"}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <input
                        type="text"
                        value={currentEntry.title}
                        onChange={(e) => updateEntry({ title: e.target.value })}
                        placeholder="Title of your reflection..."
                        className="w-full bg-transparent font-handwriting text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#FAF5ED] border-b-2 border-[#C9BC9F] dark:border-[#2C4158] focus:border-[#8C3A27] focus:outline-none py-0.5 placeholder:text-[#8C7A68]/50"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={7}
                        value={currentEntry.description}
                        onChange={(e) => updateEntry({ description: e.target.value })}
                        placeholder="Inscribe your thoughts, sketches of mind, and quiet recollections in walnut ink..."
                        className="w-full bg-transparent ruled-lines-bg font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none resize-none selection:bg-[#E8C89A] placeholder:text-[#8C7A68]/40"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {currentEntry.gratitude.map((item: string, idx: number) => (
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
            ) : theme === "classic" ? (
              <div className="w-full relative shadow-xl rounded-lg overflow-hidden border border-[#D0C5B0] dark:border-[#1E3048]">
                <div className="bg-[#FBF9F2] dark:bg-[#121A26] p-5 sm:p-8 md:p-10 relative">
                  <div className="absolute top-0 right-10 w-6 h-8 bg-gradient-to-b from-[#D4AF37] to-[#AA8520] rounded-b shadow-sm pointer-events-none" />
                  <div className="space-y-5 relative z-10">
                    <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { if (prevEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${prevEntry.id}`); }}
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
                          onClick={handleToggleHeart}
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
                            if (nextEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${nextEntry.id}`);
                            else handleNewPage();
                          }}
                          className="px-2 py-0.5 rounded bg-[#EDE7D6] dark:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37] font-serif text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>{nextEntry ? "Next" : "New +"}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <input
                        type="text"
                        value={currentEntry.title}
                        onChange={(e) => updateEntry({ title: e.target.value })}
                        placeholder="Title of your entry..."
                        className="w-full bg-transparent font-serif text-xl sm:text-2xl font-bold text-[#152B47] dark:text-[#F1F6FC] border-b border-[#D4AF37]/50 focus:border-[#1E3A5F] focus:outline-none py-1 placeholder:text-[#1E3A5F]/40"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={7}
                        value={currentEntry.description}
                        onChange={(e) => updateEntry({ description: e.target.value })}
                        placeholder="Record your daily inquiries, field notes, and reflections with fountain pen clarity..."
                        className="w-full bg-transparent font-serif text-base sm:text-lg text-[#152B47] dark:text-[#E2ECF7] leading-relaxed focus:outline-none resize-none placeholder:text-[#1E3A5F]/30"
                      />
                    </div>

                    <div className="space-y-2 pt-1 border-t border-[#D0C5B0]/50">
                      <span className="font-mono text-[10px] uppercase text-[#AA8520] font-bold tracking-wider block">
                        Gratitude Inscriptions
                      </span>
                      {currentEntry.gratitude.map((item: string, idx: number) => (
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
            ) : (
              <div className="w-full relative bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 md:p-10 select-text">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { if (prevEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${prevEntry.id}`); }}
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
                        onClick={handleToggleHeart}
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
                          if (nextEntry) router.push(`/my-diaries/${currentDiary.id}/pages/${nextEntry.id}`);
                          else handleNewPage();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>{nextEntry ? "Next" : "New +"}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      value={currentEntry.title}
                      onChange={(e) => updateEntry({ title: e.target.value })}
                      placeholder="Focus Title or Morning Intent..."
                      className="w-full bg-transparent font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-none py-1 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={7}
                      value={currentEntry.description}
                      onChange={(e) => updateEntry({ description: e.target.value })}
                      placeholder="Type your notes, sprint logs, and mindful reflections..."
                      className="w-full bg-transparent font-sans text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed focus:outline-none resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-mono text-[11px] uppercase text-sky-500 font-semibold tracking-wider block">
                      Key Gratitudes
                    </span>
                    {currentEntry.gratitude.map((item: string, idx: number) => (
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

          {/* VIEW 2: TABLE OF CONTENTS INDEX */}
          {activeView === "index" && (
            <div className="w-full">
              {theme === "vintage" && (
                <div className="w-full bg-[#F4EAD4] dark:bg-[#14181F] text-[#2C241E] dark:text-[#E2E8F0] border-2 border-[#8C3A27]/40 shadow-2xl p-5 sm:p-8 rounded-lg relative overflow-hidden space-y-6">
                  <div className="absolute top-2 left-2 text-[#8C3A27]/30 text-lg select-none">❖</div>
                  <div className="absolute top-2 right-2 text-[#8C3A27]/30 text-lg select-none">❖</div>
                  <div className="absolute bottom-2 left-2 text-[#8C3A27]/30 text-lg select-none">❖</div>
                  <div className="absolute bottom-2 right-2 text-[#8C3A27]/30 text-lg select-none">❖</div>

                  <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-[#8C3A27]/30">
                    <div className="flex items-center justify-center gap-2 text-[#8C3A27] dark:text-[#E59375]">
                      <CommonsSealVector size={26} markOnly />
                      <span className="font-mono text-xs tracking-widest uppercase">Codex Archive</span>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2C241E] dark:text-[#F4EAD4]">
                      Table of Contents & Inscriptions
                    </h2>
                    <p className="font-serif italic text-xs text-[#5C4A3A] dark:text-[#94A8BA]">
                      Chronicle volume: &ldquo;{currentDiary?.name}&rdquo; • {diaryEntries.length} Inscribed Folios
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#EFE3CA] dark:bg-[#1A222D] p-3 rounded-md border border-[#8C3A27]/25">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8C3A27]/60" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search antique inscriptions, topics, dates..."
                        className="w-full bg-transparent pl-8 pr-3 py-1.5 font-serif text-xs text-[#2C241E] dark:text-[#F4EAD4] focus:outline-none placeholder:text-[#5C4A3A]/60"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-full">
                      <span className="font-mono text-[10px] text-[#5C4A3A] dark:text-[#94A8BA] uppercase mr-1">Mood:</span>
                      {["all", ...MOOD_LIST.map((m) => m.label)].map((m) => (
                        <button
                          key={m}
                          onClick={() => setFilterMood(m === "all" ? "all" : m)}
                          className={`px-2 py-0.5 rounded-full font-serif text-[11px] cursor-pointer transition-colors ${
                            filterMood === (m === "all" ? "all" : m)
                              ? "bg-[#8C3A27] text-[#FAF6EE] font-bold"
                              : "bg-[#E2D5BA] dark:bg-[#25303E] text-[#5C4A3A] dark:text-[#94A8BA] hover:bg-[#D5C6A7]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredEntries.map((entry: DiaryEntry) => {
                      const isCurrent = entry.id === currentEntry.id;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${entry.id}`);
                            setActiveView("entry");
                          }}
                          className={`p-3 rounded-md border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isCurrent
                              ? "bg-[#EAE0C8] dark:bg-[#1E2836] border-[#8C3A27] shadow-xs"
                              : "bg-[#F7EFE0]/60 dark:bg-[#171E28]/60 border-[#8C3A27]/15 hover:bg-[#EFE4CC] dark:hover:bg-[#1D2735]"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full border border-[#8C3A27] bg-[#8C3A27]/10 flex items-center justify-center shrink-0">
                              <span className="font-serif font-bold text-xs text-[#8C3A27] dark:text-[#E59375]">
                                {entry.pageNumber}
                              </span>
                            </div>

                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#5C4A3A] dark:text-[#94A8BA]">
                                <span>{entry.dayOfWeek}, {entry.dateStr}</span>
                                <span>•</span>
                                <span>{entry.mood}</span>
                                {entry.isHearted && (
                                  <span className="text-[#8C3A27] dark:text-[#E59375] font-bold text-[10px] flex items-center gap-0.5">
                                    ★ Illuminated
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[10px] bg-[#8C3A27] text-white px-1.5 py-0.2 rounded-full font-bold">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="font-serif text-base font-bold text-[#2C241E] dark:text-[#FAF7F0] truncate">
                                {entry.title || "Untitled Manuscript Leaf"}
                              </p>
                              {entry.description && (
                                <p className="font-serif italic text-xs text-[#5C4A3A] dark:text-[#94A8BA] line-clamp-1">
                                  {entry.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(entry.id);
                              }}
                              className="p-1 text-[#5C4A3A] dark:text-[#94A8BA] hover:text-red-600 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Delete this leaf"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-serif text-[#8C3A27] dark:text-[#E59375] font-bold">
                              Unroll Parchment ❧
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-[#8C3A27]/25 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-serif text-[#8C3A27] dark:text-[#E59375] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Return to Open Page</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-7 bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Inscribe New Leaf</span>
                    </Button>
                  </div>
                </div>
              )}

              {theme === "classic" && (
                <div className="w-full bg-[#FAF7EE] dark:bg-[#0E1622] text-[#152B47] dark:text-[#E2ECF7] border-2 border-[#1E3A5F]/40 shadow-xl p-5 sm:p-8 rounded-md relative space-y-6">
                  <div className="absolute top-2 left-2 text-[#D4AF37] text-sm select-none">✦</div>
                  <div className="absolute top-2 right-2 text-[#D4AF37] text-sm select-none">✦</div>
                  <div className="absolute bottom-2 left-2 text-[#D4AF37] text-sm select-none">✦</div>
                  <div className="absolute bottom-2 right-2 text-[#D4AF37] text-sm select-none">✦</div>

                  <div className="text-center space-y-1 pb-4 border-b-2 border-[#D4AF37]/50">
                    <span className="font-mono text-xs tracking-widest text-[#D4AF37] uppercase font-bold">
                      Official Ledger Registry
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F] dark:text-[#FAF7EE] tracking-tight">
                      {currentDiary?.name} — Master Index
                    </h2>
                    <p className="font-serif italic text-xs text-muted-foreground">
                      Smythson Edition • {diaryEntries.length} Recorded Chapters & Entries
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#F0EBE0] dark:bg-[#162334] p-3 rounded border border-[#1E3A5F]/20">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#1E3A5F]/60 dark:text-[#D4AF37]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter registry records..."
                        className="w-full bg-transparent pl-8 pr-3 py-1 font-serif text-xs text-[#152B47] dark:text-[#E2ECF7] focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-full">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase mr-1">Mood:</span>
                      {["all", ...MOOD_LIST.map((m) => m.label)].map((m) => (
                        <button
                          key={m}
                          onClick={() => setFilterMood(m === "all" ? "all" : m)}
                          className={`px-2 py-0.5 rounded font-serif text-[11px] cursor-pointer transition-colors ${
                            filterMood === (m === "all" ? "all" : m)
                              ? "bg-[#1E3A5F] text-[#FAF7EE] font-bold"
                              : "bg-[#E5DEC9] dark:bg-[#203148] text-[#152B47] dark:text-[#E2ECF7] hover:bg-[#D8CFAE]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#1E3A5F]/20 divide-y divide-[#1E3A5F]/15 rounded overflow-hidden">
                    {filteredEntries.map((entry: DiaryEntry) => {
                      const isCurrent = entry.id === currentEntry.id;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${entry.id}`);
                            setActiveView("entry");
                          }}
                          className={`p-3.5 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isCurrent
                              ? "bg-[#ECE4D0] dark:bg-[#1A2C42] border-l-4 border-l-[#1E3A5F] dark:border-l-[#D4AF37]"
                              : "bg-[#FAF7EE] dark:bg-[#0E1622] hover:bg-[#F2ECD8] dark:hover:bg-[#152233]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-[#D4AF37] px-2 py-0.5 rounded bg-[#1E3A5F]/10 dark:bg-[#1E3A5F]/40 border border-[#D4AF37]/30 shrink-0">
                              [ p. {String(entry.pageNumber).padStart(2, "0")} ]
                            </span>

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                <span>{entry.dayOfWeek}, {entry.dateStr}</span>
                                <span>•</span>
                                <span>{entry.mood}</span>
                                {entry.isHearted && (
                                  <span className="text-[#D4AF37] font-bold text-xs flex items-center gap-1">
                                    ★ Bookmarked
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[10px] bg-[#1E3A5F] text-[#FAF7EE] px-1.5 rounded font-bold uppercase">
                                    Active Page
                                  </span>
                                )}
                              </div>
                              <p className="font-serif text-base font-bold text-[#152B47] dark:text-[#FAF7EE] truncate">
                                {entry.title || "Untitled Ledger Entry"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(entry.id);
                              }}
                              className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Delete this ledger record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] font-bold hover:underline">
                              Inspect Ledger Record →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-[#D4AF37]/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Return to Open Ledger</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-7 bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF7EE] border border-[#D4AF37]/40 font-serif text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Ledger Entry</span>
                    </Button>
                  </div>
                </div>
              )}

              {theme === "modern" && (
                <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-8 rounded-2xl space-y-6 text-slate-900 dark:text-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                        <span className="font-mono text-xs uppercase tracking-wider text-sky-500 font-semibold">
                          Modern Studio Index
                        </span>
                      </div>
                      <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {currentDiary?.name}
                      </h2>
                    </div>
                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold self-start sm:self-auto">
                      {diaryEntries.length} Entries Logged
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search thoughts, sprints, topics, or #pages..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 font-sans text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {["all", ...MOOD_LIST.map((m) => m.label)].map((m) => (
                        <button
                          key={m}
                          onClick={() => setFilterMood(m === "all" ? "all" : m)}
                          className={`px-3 py-1 rounded-full font-sans text-xs transition-colors cursor-pointer shrink-0 ${
                            filterMood === (m === "all" ? "all" : m)
                              ? "bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-900 font-semibold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredEntries.map((entry: DiaryEntry) => {
                      const isCurrent = entry.id === currentEntry.id;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${entry.id}`);
                            setActiveView("entry");
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                            isCurrent
                              ? "bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 shadow-xs"
                              : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold shrink-0 shadow-2xs">
                              p. {entry.pageNumber}
                            </span>

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                                <span>{entry.dayOfWeek}, {entry.dateStr}</span>
                                <span>•</span>
                                <span>{entry.mood}</span>
                                {entry.isHearted && (
                                  <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                                )}
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 font-bold uppercase">
                                    Current
                                  </span>
                                )}
                              </div>
                              <h4 className="font-sans text-base font-semibold text-slate-900 dark:text-white truncate">
                                {entry.title || "Untitled Studio Entry"}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(entry.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <span className="font-sans text-xs font-semibold text-sky-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              <span>Open</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-sans text-sky-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Return to Open Canvas</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-900 font-sans text-xs gap-1.5 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: SUMMARY DIGEST */}
          {activeView === "summary" && (
            <div className="w-full">
              {theme === "vintage" && (
                <div className="w-full bg-[#F4EAD4] dark:bg-[#14181F] text-[#2C241E] dark:text-[#E2E8F0] border-2 border-[#8C3A27]/40 shadow-2xl p-5 sm:p-8 rounded-lg relative space-y-6">
                  <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-[#8C3A27]/30">
                    <span className="font-mono text-xs tracking-widest text-[#8C3A27] dark:text-[#E59375] uppercase">
                      Almanac & Codex Digest
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2C241E] dark:text-[#F4EAD4]">
                      The Scribe&rsquo;s Vitality Record
                    </h2>
                    <p className="font-serif italic text-xs text-[#5C4A3A] dark:text-[#94A8BA]">
                      Synthesized from {summaryStats.totalPages} manuscript leaves in &ldquo;{currentDiary?.name}&rdquo;
                    </p>
                  </div>

                  {/* Vintage Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Inscribed Leaves</span>
                      <span className="text-xl font-serif font-bold text-[#8C3A27] dark:text-[#E59375]">{summaryStats.totalPages}</span>
                    </div>
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Writing Streak</span>
                      <span className="text-xl font-serif font-bold text-amber-600 dark:text-amber-400">{summaryStats.currentStreak}d</span>
                    </div>
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Words Written</span>
                      <span className="text-xl font-serif font-bold text-[#2C5F4D] dark:text-[#62B394]">
                        {summaryStats.totalWords >= 1000 ? `${(summaryStats.totalWords / 1000).toFixed(1)}k` : summaryStats.totalWords}
                      </span>
                    </div>
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Illuminated</span>
                      <span className="text-xl font-serif font-bold text-[#B23A2B]">{summaryStats.heartedCount}</span>
                    </div>
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Mean Vigor</span>
                      <span className="text-xl font-serif font-bold text-[#2C241E] dark:text-[#F4EAD4]">{summaryStats.avgEnergy}</span>
                    </div>
                    <div className="p-3 bg-[#EAE0C8] dark:bg-[#1A2330] rounded-md border border-[#8C3A27]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA] uppercase block">Graces Logged</span>
                      <span className="text-xl font-serif font-bold text-[#8C3A27] dark:text-[#E59375]">{summaryStats.allGratitudes.length}</span>
                    </div>
                  </div>

                  {/* Mood Distribution */}
                  {Object.keys(summaryStats.moodCounts).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#8C3A27]/20 text-xs font-mono">
                      <span className="text-muted-foreground text-[11px]">Mood Balance:</span>
                      {Object.entries(summaryStats.moodCounts).map(([m, count]) => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-[#EAE0C8]/60 dark:bg-[#1A2330]/60 border border-[#8C3A27]/20 text-xs">
                          {m} ({count})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-[#8C3A27]/25 pb-1.5">
                      <Feather className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
                      <h3 className="font-serif font-bold text-sm text-[#2C241E] dark:text-[#F4EAD4]">
                        Key Inscribed Graces & Prompts
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {summaryStats.allGratitudes.slice(0, 8).map((g, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${g.entryId}`);
                            setActiveView("entry");
                          }}
                          className="p-3 bg-[#EFE4CC]/80 dark:bg-[#17202C]/80 rounded border border-[#8C3A27]/20 hover:border-[#8C3A27] cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#5C4A3A] dark:text-[#94A8BA]">
                            <span>Leaf #{g.pageNumber}</span>
                            <span>{g.dateStr}</span>
                          </div>
                          <p className="font-serif italic text-xs text-[#2C241E] dark:text-[#E2E8F0]">
                            &ldquo;{g.text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#8C3A27]/25 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-serif text-[#8C3A27] dark:text-[#E59375] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Return to Open Page</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-7 bg-[#8C3A27] hover:bg-[#732E1E] text-white font-serif text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Inscribe New Leaf</span>
                    </Button>
                  </div>
                </div>
              )}

              {theme === "classic" && (
                <div className="w-full bg-[#FAF7EE] dark:bg-[#0E1622] text-[#152B47] dark:text-[#E2ECF7] border-2 border-[#1E3A5F]/40 shadow-xl p-5 sm:p-8 rounded-md relative space-y-6">
                  <div className="text-center space-y-1 pb-4 border-b-2 border-[#D4AF37]/50">
                    <span className="font-mono text-xs tracking-widest text-[#D4AF37] uppercase font-bold">
                      Executive Vitality Audit
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1E3A5F] dark:text-[#FAF7EE] tracking-tight">
                      {currentDiary?.name} — Performance Digest
                    </h2>
                    <p className="font-serif italic text-xs text-muted-foreground">
                      Smythson Registry Analytics • {summaryStats.totalPages} Recorded Entries
                    </p>
                  </div>

                  {/* Classic Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Total Entries</span>
                      <span className="text-xl font-serif font-bold text-[#1E3A5F] dark:text-[#FAF7EE]">{summaryStats.totalPages}</span>
                    </div>
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Streak</span>
                      <span className="text-xl font-serif font-bold text-amber-600 dark:text-amber-400">{summaryStats.currentStreak}d</span>
                    </div>
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Words</span>
                      <span className="text-xl font-serif font-bold text-[#2C5F4D] dark:text-[#62B394]">
                        {summaryStats.totalWords >= 1000 ? `${(summaryStats.totalWords / 1000).toFixed(1)}k` : summaryStats.totalWords}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Bookmarked</span>
                      <span className="text-xl font-serif font-bold text-[#D4AF37]">{summaryStats.heartedCount}</span>
                    </div>
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Energy</span>
                      <span className="text-xl font-serif font-bold text-[#1E3A5F] dark:text-[#FAF7EE]">{summaryStats.avgEnergy}/5</span>
                    </div>
                    <div className="p-3 bg-[#F0EBE0] dark:bg-[#162334] rounded border border-[#D4AF37]/30 text-center space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">Gratitudes</span>
                      <span className="text-xl font-serif font-bold text-[#D4AF37]">{summaryStats.allGratitudes.length}</span>
                    </div>
                  </div>

                  {/* Mood Distribution */}
                  {Object.keys(summaryStats.moodCounts).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1E3A5F]/20 text-xs font-mono">
                      <span className="text-muted-foreground text-[11px]">Mood Registry:</span>
                      {Object.entries(summaryStats.moodCounts).map(([m, count]) => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-[#F0EBE0]/60 dark:bg-[#162334]/60 border border-[#D4AF37]/25 text-xs">
                          {m} ({count})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-[#1E3A5F]/20 pb-1.5">
                      <BookMarked className="h-4 w-4 text-[#D4AF37]" />
                      <h3 className="font-serif font-bold text-sm text-[#1E3A5F] dark:text-[#FAF7EE]">
                        Formal Gratitude Ledger Records
                      </h3>
                    </div>

                    <div className="border border-[#1E3A5F]/20 divide-y divide-[#1E3A5F]/15 rounded overflow-hidden">
                      {summaryStats.allGratitudes.slice(0, 6).map((g, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${g.entryId}`);
                            setActiveView("entry");
                          }}
                          className="p-3 bg-[#FAF7EE] dark:bg-[#0E1622] hover:bg-[#F2ECD8] dark:hover:bg-[#152233] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#D4AF37] font-bold">[p.{g.pageNumber}]</span>
                            <span className="font-serif italic text-[#152B47] dark:text-[#E2ECF7]">&ldquo;{g.text}&rdquo;</span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">{g.dateStr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#D4AF37]/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Return to Open Ledger</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-7 bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF7EE] border border-[#D4AF37]/40 font-serif text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Ledger Entry</span>
                    </Button>
                  </div>
                </div>
              )}

              {theme === "modern" && (
                <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-8 rounded-2xl space-y-6 text-slate-900 dark:text-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <span className="font-mono text-xs uppercase tracking-wider text-sky-500 font-semibold">
                        Analytics & Performance Studio
                      </span>
                      <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {currentDiary?.name} — Vitality Insights
                      </h2>
                    </div>
                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-800 self-start sm:self-auto">
                      Live Analytics
                    </span>
                  </div>

                  {/* Modern Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Entries</span>
                      <span className="text-2xl font-sans font-bold text-slate-900 dark:text-white">{summaryStats.totalPages}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Streak</span>
                      <span className="text-2xl font-sans font-bold text-amber-500">{summaryStats.currentStreak}d</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Words</span>
                      <span className="text-2xl font-sans font-bold text-emerald-500">
                        {summaryStats.totalWords >= 1000 ? `${(summaryStats.totalWords / 1000).toFixed(1)}k` : summaryStats.totalWords}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Favorited</span>
                      <span className="text-2xl font-sans font-bold text-rose-500">{summaryStats.heartedCount}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Vitality</span>
                      <span className="text-2xl font-sans font-bold text-sky-500">{summaryStats.avgEnergy}<span className="text-xs text-slate-400">/5</span></span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Gratitudes</span>
                      <span className="text-2xl font-sans font-bold text-indigo-500">{summaryStats.allGratitudes.length}</span>
                    </div>
                  </div>

                  {/* Mood Distribution */}
                  {Object.keys(summaryStats.moodCounts).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">Mood Stream:</span>
                      {Object.entries(summaryStats.moodCounts).map(([m, count]) => (
                        <span key={m} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                          {m} ({count})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-500" />
                        <span>Recent Gratitude Stream</span>
                      </h3>
                      <span className="font-mono text-xs text-slate-400">
                        {summaryStats.allGratitudes.length} total
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {summaryStats.allGratitudes.slice(0, 6).map((g, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            router.push(`/my-diaries/${currentDiary.id}/pages/${g.entryId}`);
                            setActiveView("entry");
                          }}
                          className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                            <span className="text-sky-500 font-semibold">Page {g.pageNumber}</span>
                            <span>{g.dateStr}</span>
                          </div>
                          <p className="font-sans text-sm text-slate-700 dark:text-slate-200">
                            {g.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView("entry")}
                      className="text-xs font-sans text-sky-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Return to Open Canvas</span>
                    </button>
                    <Button
                      size="sm"
                      onClick={handleNewPage}
                      className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-900 font-sans text-xs gap-1.5 font-semibold"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* EDIT DIARY PROPERTIES MODAL */}
        {isEditDiaryOpen && currentDiary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-xl p-6 sm:p-7 shadow-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-border/70 pb-3">
                <div className="space-y-1">
                  <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                    § EDIT CHRONICLE PROPERTIES
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Edit Diary Properties
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditDiaryOpen(false)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDiaryProperties} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                    Diary Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Inquiries, Architectural Codex..."
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#3368A0]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief intention or purpose of this volume..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#3368A0] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                    Select Visual Tome Theme *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setEditTheme("vintage")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "vintage"
                          ? "border-[#8C3A27] bg-[#8C3A27]/5 dark:bg-[#8C3A27]/10"
                          : "border-border hover:border-border/80 bg-muted/20"
                      }`}
                    >
                      {editTheme === "vintage" && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#8C3A27] text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}

                      <div className="w-8 h-10 rounded bg-[#8C3A27] border border-[#4A180E] flex items-center justify-center text-[10px] text-amber-200 font-serif font-bold shadow-xs">
                        📜
                      </div>

                      <div>
                        <span className="font-serif text-sm font-bold text-foreground block">
                          Old Book
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-tight block">
                          Aged deckled parchment, walnut cursive ink & red margins.
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setEditTheme("classic")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "classic"
                          ? "border-[#1E3A5F] bg-[#1E3A5F]/5 dark:bg-[#1E3A5F]/10"
                          : "border-border hover:border-border/80 bg-muted/20"
                      }`}
                    >
                      {editTheme === "classic" && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}

                      <div className="w-8 h-10 rounded bg-[#1E3A5F] border border-[#0B1829] flex items-center justify-center text-[10px] text-amber-300 font-serif font-bold shadow-xs">
                        ⚜
                      </div>

                      <div>
                        <span className="font-serif text-sm font-bold text-foreground block">
                          Classic Book
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-tight block">
                          Mid-century cloth, cream ivory paper & navy fountain ink.
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setEditTheme("modern")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "modern"
                          ? "border-[#38BDF8] bg-[#38BDF8]/5 dark:bg-[#38BDF8]/10"
                          : "border-border hover:border-border/80 bg-muted/20"
                      }`}
                    >
                      {editTheme === "modern" && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#38BDF8] text-[#0A1420] flex items-center justify-center text-[10px] font-bold">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}

                      <div className="w-8 h-10 rounded bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[10px] text-sky-400 font-sans font-bold shadow-xs">
                        ⚡
                      </div>

                      <div>
                        <span className="font-serif text-sm font-bold text-foreground block">
                          Modern Book
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-tight block">
                          Matte minimalist studio canvas & sleek modern chips.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteDiary}
                    disabled={deleteDiaryMutation.isPending}
                    className="font-serif text-xs gap-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Tome</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDiaryOpen(false)}
                      className="font-serif text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateDiaryMutation.isPending}
                      className="bg-[#3368A0] hover:bg-[#254F7A] text-white font-serif text-xs font-bold px-4 cursor-pointer disabled:opacity-50"
                    >
                      {updateDiaryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      <span>{updateDiaryMutation.isPending ? "Saving..." : "Save Changes"}</span>
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
