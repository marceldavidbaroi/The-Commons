"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
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
  Star,
  Search,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Heart,
  Archive,
  BookCheck,
} from "lucide-react";
import { CommonsSealVector } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";

import { useDiaryStore } from "@/stores/diary-store";
import {
  useDiariesOverview,
  useDiaryEntries,
  useDiaryStats,
  useCreateDiaryMutation,
  useUpdateDiaryMutation,
  useDeleteDiaryMutation,
  useReorderDiariesMutation,
} from "@/hooks/queries/use-diaries";
import { Diary, DiaryEntry, DiaryTheme } from "@/types/diary";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

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

export const COLOR_PRESETS = [
  { label: "Crimson Codex", hex: "#8C3A27" },
  { label: "Navy Cloth", hex: "#1E3A5F" },
  { label: "Midnight Studio", hex: "#172330" },
  { label: "Forest Scribe", hex: "#1E4D38" },
  { label: "Royal Amber", hex: "#7A4E1D" },
  { label: "Obsidian Slate", hex: "#2A2E39" },
  { label: "Plum Velvet", hex: "#4A1E3E" },
  { label: "Terracotta Earth", hex: "#A34728" },
  { label: "Deep Emerald", hex: "#123E2A" },
  { label: "Cobalt Ledger", hex: "#164E8A" },
];

export function adjustColorBrightness(hex: string, percent: number): string {
  if (!hex || typeof hex !== "string") return "#8C3A27";
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/* ==========================================================================
   TACTILE BOOK COVER COMPONENT (STYLED BY THEME & COVER COLOR)
   ========================================================================== */
function DiaryBookCover({
  diary,
  entriesCount,
  isFirst,
  isLast,
  onClick,
  onEdit,
  onToggleFavorite,
  onMoveLeft,
  onMoveRight,
}: {
  diary: Diary;
  entriesCount: number;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onMoveLeft: (e: React.MouseEvent) => void;
  onMoveRight: (e: React.MouseEvent) => void;
}) {
  const theme = diary.theme || "vintage";
  const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.vintage;
  const coverColor = diary.coverColor || themeConfig.coverColor;

  const highlightColor = adjustColorBrightness(coverColor, 20);
  const midDarkColor = adjustColorBrightness(coverColor, -25);
  const deepDarkColor = adjustColorBrightness(coverColor, -50);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex flex-col items-center select-none relative w-full max-w-[240px]"
    >
      {/* 3D Book Container */}
      <div className="relative w-full aspect-[3/4] transition-all duration-500 ease-out transform group-hover:-translate-y-3 group-hover:rotate-1">
        
        {/* Favorite Bookmark Star Badge */}
        <button
          type="button"
          onClick={onToggleFavorite}
          title={diary.isFavorite ? "Remove from favorites" : "Mark as favorite volume"}
          className={`absolute top-2 left-2 z-20 p-1.5 rounded-full transition-all duration-200 cursor-pointer border ${
            diary.isFavorite
              ? "bg-amber-500 text-amber-950 border-amber-400 shadow-md opacity-100 scale-105"
              : "bg-background hover:bg-muted text-muted-foreground hover:text-amber-500 border-border opacity-0 group-hover:opacity-100 shadow-xs"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${diary.isFavorite ? "fill-current" : ""}`} />
        </button>

        {/* Quick Actions Bar (Top Right) */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Move Left */}
          {!isFirst && (
            <button
              type="button"
              onClick={onMoveLeft}
              title="Move tome left"
              className="p-1.5 rounded-full bg-background hover:bg-muted text-foreground/80 hover:text-foreground border border-border shadow-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Move Right */}
          {!isLast && (
            <button
              type="button"
              onClick={onMoveRight}
              title="Move tome right"
              className="p-1.5 rounded-full bg-background hover:bg-muted text-foreground/80 hover:text-foreground border border-border shadow-xs transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Edit Action */}
          <button
            type="button"
            onClick={onEdit}
            title="Edit diary name, description, and theme"
            className="p-1.5 rounded-full bg-background hover:bg-muted text-foreground/80 hover:text-foreground border border-border shadow-md transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
          </button>
        </div>

        {/* Deep Book Drop Shadow */}
        <div className="absolute inset-x-4 bottom-0 h-6 bg-black/25 dark:bg-black/50 rounded-full shadow-lg transform translate-y-3 group-hover:translate-y-4 transition-all" />

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
                <stop offset="0%" stopColor={highlightColor} />
                <stop offset="35%" stopColor={coverColor} />
                <stop offset="70%" stopColor={midDarkColor} />
                <stop offset="100%" stopColor={deepDarkColor} />
              </linearGradient>
              <linearGradient id={`spine_v_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={deepDarkColor} />
                <stop offset="50%" stopColor={coverColor} />
                <stop offset="100%" stopColor={midDarkColor} />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="8" fill={`url(#grad_v_${diary.id})`} stroke={deepDarkColor} strokeWidth="2" />
            <rect x="12" y="12" width="24" height="296" rx="3" fill={`url(#spine_v_${diary.id})`} />
            <line x1="36" y1="12" x2="36" y2="308" stroke={deepDarkColor} strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="50" x2="32" y2="50" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="100" x2="32" y2="100" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="220" x2="32" y2="220" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />
            <line x1="16" y1="270" x2="32" y2="270" stroke="#D4AF37" strokeWidth="1.5" opacity="0.8" />

            <rect x="46" y="24" width="170" height="272" rx="5" fill="none" stroke="#D4AF37" strokeWidth="1.25" strokeDasharray="5 2.5" opacity="0.85" />

            <rect x="58" y="54" width="146" height="150" rx="4" fill="#F5EEE0" stroke={coverColor} strokeWidth="1.25" />
            <rect x="62" y="58" width="138" height="142" rx="2" fill="none" stroke={coverColor} strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />

            <text x="131" y="80" textAnchor="middle" fill={coverColor} fontFamily="monospace" fontSize="8" letterSpacing="0.18em" fontWeight="bold">
              OLD BOOK
            </text>
            <text x="131" y="98" textAnchor="middle" fill="#2C1F16" fontFamily="serif" fontSize="12" fontWeight="bold">
              {diary.name.length > 18 ? `${diary.name.substring(0, 16)}...` : diary.name}
            </text>
            <line x1="80" y1="108" x2="182" y2="108" stroke={coverColor} strokeWidth="0.8" opacity="0.4" />
            <text x="131" y="126" textAnchor="middle" fill="#2C1F16" fontFamily="serif" fontSize="10" fontStyle="italic">
              {entriesCount} Inscribed {entriesCount === 1 ? "Page" : "Pages"}
            </text>
            <text x="131" y="150" textAnchor="middle" fill={coverColor} fontFamily="monospace" fontSize="8.5">
              Walnut Ink & Tome
            </text>

            <circle cx="131" cy="245" r="20" fill={coverColor} />
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
                <stop offset="0%" stopColor={highlightColor} />
                <stop offset="35%" stopColor={coverColor} />
                <stop offset="70%" stopColor={midDarkColor} />
                <stop offset="100%" stopColor={deepDarkColor} />
              </linearGradient>
              <linearGradient id={`spine_c_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={deepDarkColor} />
                <stop offset="50%" stopColor={coverColor} />
                <stop offset="100%" stopColor={midDarkColor} />
              </linearGradient>
              <linearGradient id={`ribbon_c_${diary.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#AA8520" />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="6" fill={`url(#grad_c_${diary.id})`} stroke={deepDarkColor} strokeWidth="2" />
            
            <rect x="12" y="12" width="20" height="296" rx="2" fill={`url(#spine_c_${diary.id})`} />
            <line x1="32" y1="12" x2="32" y2="308" stroke="#000000" strokeWidth="1.2" opacity="0.5" />
            <line x1="32" y1="12" x2="32" y2="308" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.8" />

            <path d="M42 22 L62 22 M42 22 L42 42" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M220 22 L200 22 M220 22 L220 42" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M42 298 L62 298 M42 298 L42 278" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M220 298 L200 298 M220 298 L220 278" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />

            <rect x="46" y="58" width="168" height="142" rx="3" fill="#FAF7EE" stroke="#D4AF37" strokeWidth="1.2" />
            <rect x="50" y="62" width="160" height="134" rx="2" fill="none" stroke={coverColor} strokeWidth="0.8" opacity="0.6" />

            <text x="130" y="84" textAnchor="middle" fill="#D4AF37" fontFamily="monospace" fontSize="8" letterSpacing="0.2em" fontWeight="bold">
              CLASSIC NOTEBOOK
            </text>
            <text x="130" y="104" textAnchor="middle" fill={deepDarkColor} fontFamily="serif" fontSize="13" fontWeight="bold">
              {diary.name.length > 18 ? `${diary.name.substring(0, 16)}...` : diary.name}
            </text>
            <line x1="75" y1="114" x2="185" y2="114" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
            
            <text x="130" y="132" textAnchor="middle" fill="#152B47" fontFamily="serif" fontSize="10.5" fontStyle="italic">
              {entriesCount} Inscribed {entriesCount === 1 ? "Page" : "Pages"}
            </text>
            <text x="130" y="152" textAnchor="middle" fill={coverColor} fontFamily="monospace" fontSize="8.5">
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
                <stop offset="0%" stopColor={highlightColor} />
                <stop offset="35%" stopColor={coverColor} />
                <stop offset="70%" stopColor={midDarkColor} />
                <stop offset="100%" stopColor={deepDarkColor} />
              </linearGradient>
              <linearGradient id={`glow_m_${diary.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={highlightColor} />
                <stop offset="50%" stopColor={coverColor} />
                <stop offset="100%" stopColor={deepDarkColor} />
              </linearGradient>
            </defs>

            <rect x="12" y="12" width="216" height="296" rx="12" fill={`url(#grad_m_${diary.id})`} stroke={midDarkColor} strokeWidth="1.5" />
            <rect x="20" y="20" width="6" height="280" rx="3" fill={`url(#glow_m_${diary.id})`} />

            <rect x="38" y="48" width="174" height="156" rx="8" fill="#FFFFFF" fillOpacity="0.08" stroke={highlightColor} strokeWidth="1" strokeOpacity="0.4" />

            <text x="52" y="76" fill={highlightColor} fontFamily="monospace" fontSize="8.5" letterSpacing="0.16em" fontWeight="bold">
              MODERN STUDIO
            </text>
            <text x="52" y="98" fill="#F8FAFC" fontFamily="sans-serif" fontSize="13" fontWeight="bold">
              {diary.name.length > 16 ? `${diary.name.substring(0, 14)}...` : diary.name}
            </text>
            
            <line x1="52" y1="112" x2="196" y2="112" stroke={midDarkColor} strokeWidth="1" />
            
            <text x="52" y="132" fill="#94A3B8" fontFamily="sans-serif" fontSize="10">
              {entriesCount} {entriesCount === 1 ? "Record" : "Records"} Logged
            </text>
            <text x="52" y="152" fill="#CBD5E1" fontFamily="monospace" fontSize="9">
              Matte Minimalist Studio
            </text>

            <rect x="52" y="235" width="54" height="22" rx="11" fill={coverColor} fillOpacity="0.3" stroke={highlightColor} strokeWidth="1" />
            <text x="79" y="249" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
              ACTIVE
            </text>

            <circle cx="188" cy="246" r="10" fill="none" stroke={highlightColor} strokeWidth="1.5" opacity="0.6" />
            <circle cx="188" cy="246" r="4" fill={highlightColor} />
          </svg>
        )}

      </div>

      {/* Book Metadata Under Title */}
      <div className="mt-4 text-center space-y-1 w-full px-1">
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

        {diary.latestEntryDate && (
          <span className="font-mono text-[10px] text-muted-foreground/80 block">
            Latest: {diary.latestEntryDate}
          </span>
        )}
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
      className="group cursor-pointer flex flex-col items-center select-none w-full max-w-[240px]"
    >
      <div className="relative w-full aspect-[3/4] transition-all duration-500 ease-out transform group-hover:-translate-y-3 group-hover:rotate-1">
        
        <div className="absolute inset-x-4 bottom-0 h-6 bg-black/15 dark:bg-black/30 rounded-full shadow-md transform translate-y-3 group-hover:translate-y-4 transition-all" />

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
  const { data: rawDiaries = [], isLoading: isDiariesLoading } = useDiariesOverview();
  const { data: serverEntries = [], isLoading: isEntriesLoading } = useDiaryEntries();
  const { data: stats } = useDiaryStats();
  const createDiaryMutation = useCreateDiaryMutation();
  const updateDiaryMutation = useUpdateDiaryMutation();
  const deleteDiaryMutation = useDeleteDiaryMutation();
  const reorderDiariesMutation = useReorderDiariesMutation();

  // 2. Zustand Store UI Actions
  const setActiveDiaryId = useDiaryStore((state) => state.setActiveDiaryId);

  const diaries = rawDiaries;
  const entries = serverEntries;

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<"all" | "favorites" | "archived">("all");

  // 3. Modal State for Creating a Diary
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<DiaryTheme>("vintage");
  const [selectedCoverColor, setSelectedCoverColor] = useState<string>("#8C3A27");

  // 4. Modal State for Editing a Diary
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTheme, setEditTheme] = useState<DiaryTheme>("vintage");
  const [editCoverColor, setEditCoverColor] = useState<string>("#8C3A27");
  const [editIsFavorite, setEditIsFavorite] = useState(false);
  const [editIsArchived, setEditIsArchived] = useState(false);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState<Diary | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtered Diaries according to tab and search query
  const filteredDiaries = useMemo(() => {
    return diaries.filter((d: Diary) => {
      // 1. Tab filter
      if (collectionFilter === "favorites" && !d.isFavorite) return false;
      if (collectionFilter === "archived" && !d.isArchived) return false;
      if (collectionFilter === "all" && d.isArchived) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = d.name.toLowerCase().includes(query);
        const matchDesc = (d.description || "").toLowerCase().includes(query);
        return matchName || matchDesc;
      }

      return true;
    });
  }, [diaries, collectionFilter, searchQuery]);

  // Total words across entries
  const calculatedTotalWords = useMemo(() => {
    return entries.reduce(
      (sum, e) => sum + (e.description ? e.description.split(/\s+/).filter(Boolean).length : 0),
      0
    );
  }, [entries]);

  const totalWordsDisplay = stats?.total_words !== undefined && stats.total_words > 0
    ? stats.total_words
    : calculatedTotalWords;

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

  const handleToggleFavorite = async (e: React.MouseEvent, diary: Diary) => {
    e.stopPropagation();
    try {
      await updateDiaryMutation.mutateAsync({
        diaryId: diary.id,
        updates: {
          isFavorite: !diary.isFavorite,
        },
      });
    } catch (err) {
      console.error("Failed to toggle favorite diary:", err);
    }
  };

  const handleMoveDiary = async (e: React.MouseEvent, currentIndex: number, direction: "left" | "right") => {
    e.stopPropagation();
    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= filteredDiaries.length) return;

    const reorderedList = [...filteredDiaries];
    const [moved] = reorderedList.splice(currentIndex, 1);
    reorderedList.splice(newIndex, 0, moved);

    const diaryIds = reorderedList.map((d) => d.id);
    try {
      await reorderDiariesMutation.mutateAsync(diaryIds);
    } catch (err) {
      console.error("Failed to reorder diaries:", err);
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, diary: Diary) => {
    e.stopPropagation();
    setEditingDiary(diary);
    setEditName(diary.name);
    setEditDescription(diary.description || "");
    setEditTheme(diary.theme || "vintage");
    setEditCoverColor(diary.coverColor || THEME_CONFIGS[diary.theme || "vintage"].coverColor);
    setEditIsFavorite(Boolean(diary.isFavorite));
    setEditIsArchived(Boolean(diary.isArchived));
  };

  const handleCreateDiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await createDiaryMutation.mutateAsync({
        name,
        description,
        theme: selectedTheme,
        coverColor: selectedCoverColor,
      });

      setIsCreateModalOpen(false);
      setName("");
      setDescription("");
      setSelectedTheme("vintage");
      setSelectedCoverColor("#8C3A27");

      const targetEntryId = created.firstEntryId;

      startTransition(() => {
        if (targetEntryId) {
          router.push(`/my-diaries/${created.id}/pages/${targetEntryId}`);
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
          coverColor: editCoverColor,
          isFavorite: editIsFavorite,
          isArchived: editIsArchived,
        },
      });

      setEditingDiary(null);
    } catch (err) {
      console.error("Failed to update diary tome:", err);
    }
  };

  const handleDeleteDiary = () => {
    if (!editingDiary) return;
    setDiaryToDelete(editingDiary);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDiary = async () => {
    if (!diaryToDelete) return;
    try {
      await deleteDiaryMutation.mutateAsync(diaryToDelete.id);
      if (editingDiary?.id === diaryToDelete.id) {
        setEditingDiary(null);
      }
      setIsDeleteModalOpen(false);
      setDiaryToDelete(null);
    } catch (err) {
      console.error("Failed to delete diary tome:", err);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        
        {/* 1. TOP EDITORIAL NAVIGATION */}
        <SanctuaryNav subtitle="CHRONICLES & TOMES ARCHIVE" />

        {/* 2. OVERVIEW HEADER & GLOBAL ANALYTICS BANNER */}
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-10 pb-6 text-center flex flex-col items-center">
          <span className="kicker block text-[#3368A0] dark:text-[#66A3BF] mb-1.5 font-mono text-xs tracking-wider uppercase font-semibold">
            § CITIZEN CHRONICLES & TOMES
          </span>

          <h1 className="masthead-title text-4xl sm:text-5xl md:text-6xl text-foreground font-serif font-bold">
            My Diaries
          </h1>

          <p className="font-serif italic text-base text-muted-foreground mt-2 max-w-xl mx-auto">
            Select a book volume to open your journal, edit volume properties, or bind a new volume.
          </p>

          {/* 3. SANCTUARY SUMMARY STATS BANNER (PRD / Matrix Analytics) */}
          <div className="w-full mt-8 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CommonsSealVector size={16} markOnly />
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
                  Manuscript Archive Analytics
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                Synced in real-time via PostgreSQL RPC
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              
              {/* Volumes */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
                  Volumes
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {diaries.length}
                </span>
              </div>

              {/* Total Pages */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-[#8C3A27] dark:text-[#E59375]" />
                  Pages
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {stats?.total_entries ?? entries.length}
                </span>
              </div>

              {/* Streak */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Streak
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {stats?.current_streak ?? 0} <span className="text-xs font-normal font-sans text-muted-foreground">{stats?.current_streak === 1 ? "day" : "days"}</span>
                </span>
              </div>

              {/* Total Words */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Feather className="h-3.5 w-3.5 text-[#2C5F4D] dark:text-[#62B394]" />
                  Words
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {totalWordsDisplay >= 1000 ? `${(totalWordsDisplay / 1000).toFixed(1)}k` : totalWordsDisplay}
                </span>
              </div>

              {/* Vitality */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Avg Vitality
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {stats?.average_energy ? `${stats.average_energy}` : "4.0"} <span className="text-xs font-normal font-sans text-muted-foreground">/ 5</span>
                </span>
              </div>

              {/* Hearted Leaves */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  Hearted
                </span>
                <span className="text-xl font-serif font-bold text-foreground mt-1">
                  {stats?.hearted_entries ?? entries.filter((e) => e.isHearted).length}
                </span>
              </div>

            </div>

            {/* Mood Distribution Chips */}
            {stats?.mood_breakdown && Object.keys(stats.mood_breakdown).length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground mr-1 text-[11px]">Mood Balance:</span>
                {Object.entries(stats.mood_breakdown).map(([mood, count]) => (
                  <span
                    key={mood}
                    className="px-2.5 py-1 rounded-full bg-background/80 border border-border/60 text-foreground font-medium flex items-center gap-1 shadow-2xs"
                  >
                    <span>{mood}</span>
                    <span className="text-muted-foreground font-bold font-mono">({count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. TOOLBAR & FILTER CONTROLS */}
          <div className="w-full mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search volume archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-card/80 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#3368A0]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Collection Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 border border-border self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={() => setCollectionFilter("all")}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  collectionFilter === "all"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Volumes ({diaries.filter((d) => !d.isArchived).length})
              </button>

              <button
                type="button"
                onClick={() => setCollectionFilter("favorites")}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                  collectionFilter === "favorites"
                    ? "bg-background text-amber-600 dark:text-amber-400 font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3 w-3 fill-current" />
                Favorites ({diaries.filter((d) => d.isFavorite).length})
              </button>

              <button
                type="button"
                onClick={() => setCollectionFilter("archived")}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                  collectionFilter === "archived"
                    ? "bg-background text-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Archive className="h-3 w-3" />
                Archived ({diaries.filter((d) => d.isArchived).length})
              </button>
            </div>

          </div>
        </section>

        {/* 5. TACTILE BOOK GALLERY */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 flex-1">
          {isDiariesLoading && diaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#3368A0]" />
              <span className="font-mono text-xs">Accessing manuscript archive...</span>
            </div>
          ) : filteredDiaries.length === 0 && collectionFilter !== "all" ? (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl max-w-md mx-auto my-12 space-y-3 bg-muted/10">
              <BookMarked className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-serif text-lg font-bold text-foreground">
                No {collectionFilter} volumes found
              </h3>
              <p className="text-xs font-serif text-muted-foreground">
                You currently have no diaries marked under this filter preset.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCollectionFilter("all")}
                className="font-mono text-xs"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10 justify-items-center">
              
              {/* List of Created Diaries */}
              {filteredDiaries.map((diary: Diary, idx: number) => {
                const diaryEntries = entries.filter((e: DiaryEntry) => e.diaryId === diary.id);
                const count = diary.entriesCount ?? diaryEntries.length;
                return (
                  <DiaryBookCover
                    key={diary.id}
                    diary={diary}
                    entriesCount={count}
                    isFirst={idx === 0}
                    isLast={idx === filteredDiaries.length - 1}
                    onClick={() => handleOpenDiary(diary.id)}
                    onEdit={(e) => handleOpenEditModal(e, diary)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, diary)}
                    onMoveLeft={(e) => handleMoveDiary(e, idx, "left")}
                    onMoveRight={(e) => handleMoveDiary(e, idx, "right")}
                  />
                );
              })}

              {/* New Diary Slot */}
              <CreateDiarySlot onClick={() => setIsCreateModalOpen(true)} />

            </div>
          )}

          {/* 6. SAMPLE PROMPT INSPIRATIONS (PRD Empty / Inspiration State) */}
          {diaries.length <= 2 && (
            <section className="mt-16 p-6 sm:p-8 rounded-2xl bg-card border border-border/80 text-center max-w-3xl mx-auto space-y-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[#3368A0] dark:text-[#66A3BF] font-semibold">
                § INSPIRATION FOR YOUR MANUSCRIPTS
              </span>
              <h2 className="font-serif text-2xl font-bold text-foreground">
                Craft Your Personal Sanctuary of Chronicles
              </h2>
              <p className="font-serif italic text-sm text-muted-foreground max-w-lg mx-auto">
                Begin dedicated tomes for different chapters of your life, distinct inquiry domains, or specialized study notes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div
                  onClick={() => {
                    setName("Morning Inquiries");
                    setDescription("Daily dawn reflections and gratitude in walnut ink.");
                    setSelectedTheme("vintage");
                    setIsCreateModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border hover:border-[#8C3A27] bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all space-y-1"
                >
                  <span className="font-serif text-sm font-bold text-foreground block">📜 Morning Inquiries</span>
                  <p className="text-[11px] text-muted-foreground">Antique codex for quiet morning focus & 3-item gratitude.</p>
                </div>

                <div
                  onClick={() => {
                    setName("Architectural Codex");
                    setDescription("Technical designs, crafts observations, and structured systems.");
                    setSelectedTheme("classic");
                    setIsCreateModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border hover:border-[#1E3A5F] bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all space-y-1"
                >
                  <span className="font-serif text-sm font-bold text-foreground block">⚜ Architectural Codex</span>
                  <p className="text-[11px] text-muted-foreground">Clothbound ledger with ivory paper for project logs.</p>
                </div>

                <div
                  onClick={() => {
                    setName("Field Observations");
                    setDescription("Fast daily snapshots, energy tracking, and concise records.");
                    setSelectedTheme("modern");
                    setIsCreateModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border hover:border-[#38BDF8] bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all space-y-1"
                >
                  <span className="font-serif text-sm font-bold text-foreground block">⚡ Field Observations</span>
                  <p className="text-[11px] text-muted-foreground">Contemporary minimal studio logbook with vibrant vitality chips.</p>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* 7. EDITORIAL FOOTER */}
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
        {/* 8. CREATE DIARY MODAL (NAME, DESCRIPTION, THEMES, COVER COLOR) */}
        {/* ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
              
              <div className="flex items-start justify-between border-b border-border/70 pb-3">
                <div className="space-y-1">
                  <span className="kicker text-[#3368A0] dark:text-[#66A3BF] font-mono text-xs uppercase font-semibold">
                    § BIND NEW CHRONICLE
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Create a New Diary
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
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
                      onClick={() => {
                        setSelectedTheme("vintage");
                        setSelectedCoverColor("#8C3A27");
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        selectedTheme === "vintage"
                          ? "border-[#8C3A27] bg-[#8C3A27]/10"
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
                      onClick={() => {
                        setSelectedTheme("classic");
                        setSelectedCoverColor("#1E3A5F");
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        selectedTheme === "classic"
                          ? "border-[#1E3A5F] bg-[#1E3A5F]/10"
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
                      onClick={() => {
                        setSelectedTheme("modern");
                        setSelectedCoverColor("#172330");
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        selectedTheme === "modern"
                          ? "border-[#38BDF8] bg-[#38BDF8]/10"
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

                {/* Cover Color Palette Accent Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                    Spine & Cover Shade
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSelectedCoverColor(color.hex)}
                        title={color.label}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                          selectedCoverColor === color.hex
                            ? "scale-110 border-foreground shadow-sm"
                            : "border-transparent hover:scale-105 opacity-80"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {selectedCoverColor === color.hex && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    ))}
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
        {/* 9. EDIT DIARY MODAL (NAME, DESCRIPTION, THEME, COLOR, FAVORITE, ARCHIVE, DELETE) */}
        {/* ========================================================================= */}
        {editingDiary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
              
              <div className="flex items-start justify-between border-b border-border/70 pb-3">
                <div className="space-y-1">
                  <span className="kicker text-[#3368A0] dark:text-[#66A3BF] font-mono text-xs uppercase font-semibold">
                    § EDIT CHRONICLE PROPERTIES
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Edit Diary Tome
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingDiary(null)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
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
                    Visual Tome Theme *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Option 1: Old Book */}
                    <div
                      onClick={() => setEditTheme("vintage")}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "vintage"
                          ? "border-[#8C3A27] bg-[#8C3A27]/10"
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
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "classic"
                          ? "border-[#1E3A5F] bg-[#1E3A5F]/10"
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
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                        editTheme === "modern"
                          ? "border-[#38BDF8] bg-[#38BDF8]/10"
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

                {/* Cover Color Palette Accent Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-semibold block">
                    Spine & Cover Shade
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setEditCoverColor(color.hex)}
                        title={color.label}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                          editCoverColor === color.hex
                            ? "scale-110 border-foreground shadow-sm"
                            : "border-transparent hover:scale-105 opacity-80"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {editCoverColor === color.hex && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles for Favorite and Archive */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsFavorite}
                      onChange={(e) => setEditIsFavorite(e.target.checked)}
                      className="rounded text-[#3368A0] focus:ring-0"
                    />
                    <span className="text-xs font-mono font-medium flex items-center gap-1 text-foreground">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      Favorite Volume
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsArchived}
                      onChange={(e) => setEditIsArchived(e.target.checked)}
                      className="rounded text-[#3368A0] focus:ring-0"
                    />
                    <span className="text-xs font-mono font-medium flex items-center gap-1 text-foreground">
                      <Archive className="h-3 w-3 text-muted-foreground" />
                      Archive Volume
                    </span>
                  </label>
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

        {/* Themed Delete Tome Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={isDeleteModalOpen}
          onOpenChange={(open) => {
            setIsDeleteModalOpen(open);
            if (!open) setDiaryToDelete(null);
          }}
          onConfirm={confirmDeleteDiary}
          isPending={deleteDiaryMutation.isPending}
          theme={diaryToDelete?.theme || "vintage"}
          itemType="tome"
          itemName={diaryToDelete?.name}
        />

      </div>
    </AuthGuard>
  );
}
