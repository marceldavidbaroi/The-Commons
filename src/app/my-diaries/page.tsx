"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Feather,
  Plus,
  X,
  Check,
  Flame,
  BookOpen,
  Sparkles,
  Layers,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { CommonsSealVector } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { useDiaryStore } from "@/stores/diary-store";
import {
  useDiariesOverview,
  useDiaryStats,
  useCreateDiaryMutation,
  useUpdateDiaryMutation,
  useDeleteDiaryMutation,
} from "@/hooks/queries/use-diaries";
import { Diary, DiaryTheme } from "@/types/diary";

export const THEME_CONFIGS: Record<
  DiaryTheme,
  {
    name: string;
    tagline: string;
    badge: string;
    coverColor: string;
    accentColor: string;
    description: string;
  }
> = {
  vintage: {
    name: "Old Book",
    tagline: "Aged Parchment & Walnut Ink",
    badge: "Antique Tome",
    coverColor: "#8C3A27",
    accentColor: "#C48C28",
    description: "Deckled torn paper edges, vintage walnut cursive ink, red margin lines, and wax seal stamps.",
  },
  classic: {
    name: "Classic Notebook",
    tagline: "Mid-Century Cloth & Fountain Ink",
    badge: "Clothbound Ledger",
    coverColor: "#1E3A5F",
    accentColor: "#D4AF37",
    description: "Warm cream ivory linen paper, navy fountain ink, gold corner accents, and classic ruled blue lines.",
  },
  modern: {
    name: "Modern Book",
    tagline: "Matte Minimalist Studio",
    badge: "Contemporary",
    coverColor: "#172330",
    accentColor: "#66A3BF",
    description: "Crisp matte studio card canvas, sleek modern typography, ambient glow, and contemporary pill chips.",
  },
};

/* ==========================================================================
   TACTILE BOOK COVER COMPONENT (STYLED BY THEME)
   ========================================================================== */
function DiaryBookCover({
  diary,
  entriesCount,
  onClick,
  onEdit,
}: {
  diary: Diary;
  entriesCount: number;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  const theme = diary.theme || "vintage";
  const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.vintage;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex flex-col items-center select-none relative"
    >
      {/* 3D Book Container */}
      <div className="relative w-full max-w-[240px] aspect-[3/4] transition-all duration-500 ease-out transform group-hover:-translate-y-3 group-hover:rotate-1">
        
        {/* Quick Edit Action Button */}
        <button
          type="button"
          onClick={onEdit}
          title="Edit diary name, description, and theme"
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground/80 hover:text-foreground border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
        >
          <Pencil className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
        </button>

        {/* Deep Book Drop Shadow */}
        <div className="absolute inset-x-4 bottom-0 h-6 bg-black/35 dark:bg-black/60 rounded-full blur-md transform translate-y-3 group-hover:translate-y-4 group-hover:blur-lg transition-all" />

        {/* 1. OLD BOOK (VINTAGE THEME) */}
        {theme === "vintage" && (
          <svg
            viewBox="0 0 240 320"
            className="w-full h-full drop-shadow-lg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`grad_v_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8C3A27" />
                <stop offset="50%" stopColor="#6E2B1D" />
                <stop offset="100%" stopColor="#4A180E" />
              </linearGradient>
              <linearGradient id={`spine_v_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4A180E" />
                <stop offset="100%" stopColor="#8C3A27" />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="8" fill={`url(#grad_v_${diary.id})`} stroke="#3A120B" strokeWidth="2" />
            <rect x="12" y="12" width="24" height="296" rx="3" fill={`url(#spine_v_${diary.id})`} />
            <line x1="36" y1="12" x2="36" y2="308" stroke="#2A0B05" strokeWidth="1.5" opacity="0.6" />
            <line x1="16" y1="50" x2="32" y2="50" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="100" x2="32" y2="100" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="220" x2="32" y2="220" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="270" x2="32" y2="270" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />

            <rect x="46" y="24" width="170" height="272" rx="5" fill="none" stroke="#D4AF37" strokeWidth="1.25" strokeDasharray="5 2.5" opacity="0.85" />

            <rect x="58" y="54" width="146" height="150" rx="4" fill="#F5EEE0" stroke="#8C3A27" strokeWidth="1.25" />
            <rect x="62" y="58" width="138" height="142" rx="2" fill="none" stroke="#8C3A27" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />

            <text x="131" y="80" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="8" letterSpacing="0.18em" fontWeight="bold">
              OLD BOOK
            </text>
            <text x="131" y="98" textAnchor="middle" fill="#2C1F16" fontFamily="serif" fontSize="12" fontWeight="bold">
              {diary.name.length > 18 ? `${diary.name.substring(0, 16)}...` : diary.name}
            </text>
            <line x1="80" y1="108" x2="182" y2="108" stroke="#8C3A27" strokeWidth="0.8" opacity="0.4" />
            <text x="131" y="126" textAnchor="middle" fill="#2C1F16" fontFamily="serif" fontSize="10" fontStyle="italic">
              {entriesCount} Inscribed {entriesCount === 1 ? "Page" : "Pages"}
            </text>
            <text x="131" y="150" textAnchor="middle" fill="#8C3A27" fontFamily="monospace" fontSize="8.5">
              Walnut Ink & Tome
            </text>

            <circle cx="131" cy="245" r="20" fill="#8C3A27" />
            <circle cx="131" cy="245" r="17" fill="none" stroke="#FAF4EB" strokeWidth="1" strokeDasharray="2 2" />
            <text x="131" y="250" textAnchor="middle" fill="#FAF4EB" fontFamily="serif" fontSize="13" fontWeight="bold">
              C
            </text>

            <text x="131" y="282" textAnchor="middle" fill="#D4AF37" fontFamily="serif" fontStyle="italic" fontSize="7" letterSpacing="0.08em" opacity="0.85">
              Anno 2026 • The Commons
            </text>
          </svg>
        )}

        {/* 2. CLASSIC NOTEBOOK (CLASSIC THEME) */}
        {theme === "classic" && (
          <svg
            viewBox="0 0 240 320"
            className="w-full h-full drop-shadow-lg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`grad_c_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E3A5F" />
                <stop offset="50%" stopColor="#152B47" />
                <stop offset="100%" stopColor="#0B1829" />
              </linearGradient>
              <linearGradient id={`ribbon_c_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#AA8520" />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="6" fill={`url(#grad_c_${diary.id})`} stroke="#0B1829" strokeWidth="2" />
            
            <rect x="12" y="12" width="18" height="296" rx="2" fill="#112236" />
            <line x1="30" y1="12" x2="30" y2="308" stroke="#000000" strokeWidth="1" opacity="0.5" />

            <path d="M42 22 L62 22 M42 22 L42 42" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M220 22 L200 22 M220 22 L220 42" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M42 298 L62 298 M42 298 L42 278" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M220 298 L200 298 M220 298 L220 278" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />

            <rect x="46" y="58" width="168" height="142" rx="3" fill="#FAF7EE" stroke="#D4AF37" strokeWidth="1.2" />
            <rect x="50" y="62" width="160" height="134" rx="2" fill="none" stroke="#1E3A5F" strokeWidth="0.8" opacity="0.6" />

            <text x="130" y="84" textAnchor="middle" fill="#D4AF37" fontFamily="monospace" fontSize="8" letterSpacing="0.2em" fontWeight="bold">
              CLASSIC NOTEBOOK
            </text>
            <text x="130" y="104" textAnchor="middle" fill="#152B47" fontFamily="serif" fontSize="13" fontWeight="bold">
              {diary.name.length > 18 ? `${diary.name.substring(0, 16)}...` : diary.name}
            </text>
            <line x1="75" y1="114" x2="185" y2="114" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
            
            <text x="130" y="132" textAnchor="middle" fill="#152B47" fontFamily="serif" fontSize="10.5" fontStyle="italic">
              {entriesCount} Inscribed {entriesCount === 1 ? "Page" : "Pages"}
            </text>
            <text x="130" y="152" textAnchor="middle" fill="#1E3A5F" fontFamily="monospace" fontSize="8.5">
              Ivory Linen & Fountain Ink
            </text>

            <circle cx="130" cy="245" r="18" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
            <text x="130" y="250" textAnchor="middle" fill="#D4AF37" fontFamily="serif" fontSize="12" fontWeight="bold">
              ⚜
            </text>

            <path d="M120 308 L120 318 L130 312 L140 318 L140 308 Z" fill={`url(#ribbon_c_${diary.id})`} />
          </svg>
        )}

        {/* 3. MODERN BOOK (MODERN THEME) */}
        {theme === "modern" && (
          <svg
            viewBox="0 0 240 320"
            className="w-full h-full drop-shadow-lg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`grad_m_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="50%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <linearGradient id={`glow_m_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="12" fill={`url(#grad_m_${diary.id})`} stroke="#334155" strokeWidth="1.5" />
            <rect x="24" y="24" width="4" height="272" rx="2" fill={`url(#glow_m_${diary.id})`} />

            <rect x="42" y="48" width="170" height="156" rx="8" fill="#FFFFFF" fillOpacity="0.06" stroke="#475569" strokeWidth="1" />

            <text x="56" y="76" fill="#38BDF8" fontFamily="monospace" fontSize="8.5" letterSpacing="0.16em" fontWeight="bold">
              MODERN STUDIO
            </text>
            <text x="56" y="98" fill="#F8FAFC" fontFamily="sans-serif" fontSize="13" fontWeight="bold">
              {diary.name.length > 16 ? `${diary.name.substring(0, 14)}...` : diary.name}
            </text>
            
            <line x1="56" y1="112" x2="196" y2="112" stroke="#334155" strokeWidth="1" />
            
            <text x="56" y="132" fill="#94A3B8" fontFamily="sans-serif" fontSize="10">
              {entriesCount} {entriesCount === 1 ? "Record" : "Records"} Logged
            </text>
            <text x="56" y="152" fill="#CBD5E1" fontFamily="monospace" fontSize="9">
              Matte Minimalist Studio
            </text>

            <rect x="56" y="235" width="48" height="22" rx="11" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1" />
            <text x="80" y="249" textAnchor="middle" fill="#38BDF8" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
              ACTIVE
            </text>

            <circle cx="188" cy="246" r="10" fill="none" stroke="#64748B" strokeWidth="1.5" />
            <circle cx="188" cy="246" r="4" fill="#38BDF8" />
          </svg>
        )}

      </div>

      {/* Book Metadata Under Title */}
      <div className="mt-4 text-center space-y-1 max-w-[220px]">
        <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span className="font-bold text-[#3368A0] dark:text-[#66A3BF]">
            {themeConfig.name}
          </span>
          <span>•</span>
          <span>{entriesCount} {entriesCount === 1 ? "Page" : "Pages"}</span>
        </div>

        <h3 className="font-serif text-sm font-bold text-foreground group-hover:text-[#3368A0] dark:group-hover:text-[#66A3BF] line-clamp-1 transition-colors">
          {diary.name}
        </h3>

        <p className="font-serif italic text-xs text-muted-foreground line-clamp-1">
          {diary.description || "A private chronicle for thoughts and daily records."}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   CREATE NEW DIARY CARD
   ========================================================================== */
function CreateDiarySlot({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex flex-col items-center select-none"
    >
      <div className="relative w-full max-w-[240px] aspect-[3/4] transition-all duration-500 ease-out transform group-hover:-translate-y-3 group-hover:rotate-1">
        
        <div className="absolute inset-x-4 bottom-0 h-6 bg-black/15 dark:bg-black/40 rounded-full blur-md transform translate-y-3 group-hover:translate-y-4 transition-all" />

        <div className="w-full h-full border-2 border-dashed border-[#8C3A27]/40 dark:border-[#E59375]/40 group-hover:border-[#8C3A27] dark:group-hover:border-[#E59375] bg-muted/25 dark:bg-muted/10 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 transition-colors">
          <div className="w-14 h-14 rounded-full bg-[#8C3A27]/10 dark:bg-[#8C3A27]/20 border border-[#8C3A27]/30 flex items-center justify-center text-[#8C3A27] dark:text-[#E59375] group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <span className="font-serif text-base font-bold text-foreground block">
              Create New Diary
            </span>
            <span className="font-serif italic text-xs text-muted-foreground block">
              Choose theme & start inscriber
            </span>
          </div>

          <span className="font-mono text-[10px] text-[#8C3A27] dark:text-[#E59375] font-bold uppercase tracking-wider">
            + Inscribe New Volume
          </span>
        </div>
      </div>

      <div className="mt-4 text-center space-y-1 max-w-[220px]">
        <div className="text-xs font-mono text-muted-foreground">
          New Volume
        </div>
        <h3 className="font-serif text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
          Bind Fresh Tome
        </h3>
      </div>
    </div>
  );
}

/* ==========================================================================
   MAIN MY DIARIES LIST PAGE
   ========================================================================== */
export default function MyDiariesPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 1. TanStack Query + Supabase Hooks
  const { data: diaries = [], isLoading: isDiariesLoading } = useDiariesOverview();
  const { data: stats } = useDiaryStats();
  const createDiaryMutation = useCreateDiaryMutation();
  const updateDiaryMutation = useUpdateDiaryMutation();
  const deleteDiaryMutation = useDeleteDiaryMutation();

  // 2. Zustand Store Sync
  const entries = useDiaryStore((state) => state.entries);
  const setActiveDiaryId = useDiaryStore((state) => state.setActiveDiaryId);

  const [mounted, setMounted] = useState(false);

  // 3. Modal State for Creating a Diary
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<DiaryTheme>("vintage");

  // 4. Modal State for Editing a Diary
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTheme, setEditTheme] = useState<DiaryTheme>("vintage");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenDiary = (diaryId: string) => {
    setActiveDiaryId(diaryId);
    // Find the latest entry for this diary from store
    const diaryEntries = entries.filter((e) => e.diaryId === diaryId);
    const targetEntry = diaryEntries[0] || null;

    startTransition(() => {
      if (targetEntry) {
        router.push(`/my-diaries/${diaryId}/pages/${targetEntry.id}`);
      } else {
        router.push(`/my-diaries/${diaryId}`);
      }
    });
  };

  const handleOpenEditModal = (e: React.MouseEvent, diary: Diary) => {
    e.stopPropagation();
    setEditingDiary(diary);
    setEditName(diary.name);
    setEditDescription(diary.description || "");
    setEditTheme(diary.theme || "vintage");
  };

  const handleCreateDiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await createDiaryMutation.mutateAsync({
        name,
        description,
        theme: selectedTheme,
      });

      setIsCreateModalOpen(false);
      setName("");
      setDescription("");
      setSelectedTheme("vintage");

      const newDiaryEntries = useDiaryStore.getState().entries.filter((e) => e.diaryId === created.id);
      const firstEntry = newDiaryEntries[0];

      startTransition(() => {
        if (firstEntry) {
          router.push(`/my-diaries/${created.id}/pages/${firstEntry.id}`);
        } else {
          router.push(`/my-diaries/${created.id}`);
        }
      });
    } catch (err) {
      console.error("Failed to create diary tome:", err);
    }
  };

  const handleUpdateDiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiary || !editName.trim()) return;

    try {
      await updateDiaryMutation.mutateAsync({
        diaryId: editingDiary.id,
        updates: {
          name: editName,
          description: editDescription,
          theme: editTheme,
        },
      });

      setEditingDiary(null);
    } catch (err) {
      console.error("Failed to update diary tome:", err);
    }
  };

  const handleDeleteDiary = async () => {
    if (!editingDiary) return;
    const confirmDelete = window.confirm(
      `Are you sure you wish to archive and delete "${editingDiary.name}" and all its pages?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDiaryMutation.mutateAsync(editingDiary.id);
      setEditingDiary(null);
    } catch (err) {
      console.error("Failed to delete diary tome:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
      
      {/* 1. TOP EDITORIAL NAVIGATION */}
      <SanctuaryNav subtitle="CHRONICLES & TOMES ARCHIVE" />

      {/* 2. SIMPLE EDITORIAL TITLE */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-10 pb-4 text-center flex flex-col items-center">
        <span className="kicker block text-[#3368A0] dark:text-[#66A3BF] mb-1.5">
          § CITIZEN CHRONICLES & TOMES
        </span>

        <h1 className="masthead-title text-4xl sm:text-5xl md:text-6xl text-foreground">
          My Diaries
        </h1>

        <p className="font-serif italic text-base text-muted-foreground mt-2 max-w-lg mx-auto">
          Select a book volume to open your journal, edit volume properties, or bind a new volume.
        </p>

        {/* 3. SANCTUARY QUICK STATS PILL ROW */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border">
            <BookOpen className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
            <span className="text-muted-foreground">Volumes:</span>
            <span className="font-bold text-foreground">{diaries.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border">
            <Layers className="h-3.5 w-3.5 text-[#8C3A27] dark:text-[#E59375]" />
            <span className="text-muted-foreground">Pages:</span>
            <span className="font-bold text-foreground">
              {stats?.total_entries ?? entries.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">Streak:</span>
            <span className="font-bold text-foreground">
              {stats?.current_streak ?? 0} {stats?.current_streak === 1 ? "day" : "days"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Avg Vitality:</span>
            <span className="font-bold text-foreground">
              {stats?.average_energy ? `${stats.average_energy} / 5` : "3.5 / 5"}
            </span>
          </div>
        </div>
      </section>

      {/* 4. BOOKS GALLERY */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
        {isDiariesLoading && diaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#3368A0]" />
            <span className="font-mono text-xs">Accessing manuscript archive...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10 justify-items-center">
            
            {/* List of Created Diaries */}
            {diaries.map((diary) => {
              const diaryEntries = entries.filter((e) => e.diaryId === diary.id);
              const count = diary.entriesCount ?? diaryEntries.length;
              return (
                <DiaryBookCover
                  key={diary.id}
                  diary={diary}
                  entriesCount={count}
                  onClick={() => handleOpenDiary(diary.id)}
                  onEdit={(e) => handleOpenEditModal(e, diary)}
                />
              );
            })}

            {/* New Diary Slot */}
            <CreateDiarySlot onClick={() => setIsCreateModalOpen(true)} />

          </div>
        )}
      </main>

      {/* 5. EDITORIAL FOOTER */}
      <footer className="border-t border-border/80 bg-muted/20 py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <CommonsSealVector size={18} markOnly />
            <span>The Commons © 2026. All chronicles preserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/home" className="hover:text-foreground">Sanctuary</Link>
            <span>•</span>
            <Link href="/daily-diary" className="hover:text-foreground">Today&apos;s Entry</Link>
            <span>•</span>
            <Link href="/citizen-passport" className="hover:text-foreground">Passport</Link>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 6. CREATE DIARY MODAL (NAME, DESCRIPTION, 3 THEMES) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl p-6 sm:p-7 shadow-2xl space-y-6">
            
            <div className="flex items-start justify-between border-b border-border/70 pb-3">
              <div className="space-y-1">
                <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                  § BIND NEW CHRONICLE
                </span>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Create a New Diary
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiarySubmit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                  Diary Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Inquiries, Architectural Codex..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#3368A0] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                  Select Visual Tome Theme *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Option 1: Old Book */}
                  <div
                    onClick={() => setSelectedTheme("vintage")}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                      selectedTheme === "vintage"
                        ? "border-[#8C3A27] bg-[#8C3A27]/5 dark:bg-[#8C3A27]/10"
                        : "border-border hover:border-border/80 bg-muted/20"
                    }`}
                  >
                    {selectedTheme === "vintage" && (
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

                  {/* Option 2: Classic Notebook */}
                  <div
                    onClick={() => setSelectedTheme("classic")}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                      selectedTheme === "classic"
                        ? "border-[#1E3A5F] bg-[#1E3A5F]/5 dark:bg-[#1E3A5F]/10"
                        : "border-border hover:border-border/80 bg-muted/20"
                    }`}
                  >
                    {selectedTheme === "classic" && (
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

                  {/* Option 3: Modern Book */}
                  <div
                    onClick={() => setSelectedTheme("modern")}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all space-y-2 relative ${
                      selectedTheme === "modern"
                        ? "border-[#38BDF8] bg-[#38BDF8]/5 dark:bg-[#38BDF8]/10"
                        : "border-border hover:border-border/80 bg-muted/20"
                    }`}
                  >
                    {selectedTheme === "modern" && (
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

              <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="font-serif text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDiaryMutation.isPending}
                  className="bg-[#3368A0] hover:bg-[#254F7A] text-white font-serif text-xs font-bold px-4 cursor-pointer disabled:opacity-50"
                >
                  {createDiaryMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Feather className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>{createDiaryMutation.isPending ? "Binding Tome..." : "Bind & Inscribe Diary"}</span>
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EDIT DIARY MODAL (NAME, DESCRIPTION, THEME, DELETE) */}
      {/* ========================================================================= */}
      {editingDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl p-6 sm:p-7 shadow-2xl space-y-6">
            
            <div className="flex items-start justify-between border-b border-border/70 pb-3">
              <div className="space-y-1">
                <span className="kicker text-[#3368A0] dark:text-[#66A3BF]">
                  § EDIT CHRONICLE PROPERTIES
                </span>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Edit Diary Tome
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setEditingDiary(null)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDiarySubmit} className="space-y-5">
              
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
                  
                  {/* Option 1: Old Book */}
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

                  {/* Option 2: Classic Notebook */}
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

                  {/* Option 3: Modern Book */}
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
                    onClick={() => setEditingDiary(null)}
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
                    <span>{updateDiaryMutation.isPending ? "Saving Changes..." : "Save Changes"}</span>
                  </Button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
