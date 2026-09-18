"use client";

import React, { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { DiaryEntry, Diary, DiaryTheme } from "@/types/diary";

interface EntrySummaryViewProps {
  currentDiary: Diary | null;
  diaryEntries: DiaryEntry[];
  theme: DiaryTheme;
  onClose: () => void;
}

export function EntrySummaryView({
  currentDiary,
  diaryEntries,
  theme,
  onClose,
}: EntrySummaryViewProps) {
  const summaryStats = useMemo(() => {
    const totalPages = diaryEntries.length;
    const heartedCount = diaryEntries.filter((e: DiaryEntry) => e.isHearted).length;

    const totalEnergy = diaryEntries.reduce(
      (acc: number, e: DiaryEntry) => acc + (e.energyLevel || 3),
      0
    );
    const avgEnergy = totalPages > 0 ? (totalEnergy / totalPages).toFixed(1) : "0";

    const moodCounts: Record<string, number> = {};
    diaryEntries.forEach((e: DiaryEntry) => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    const energyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    diaryEntries.forEach((e: DiaryEntry) => {
      if (e.energyLevel) {
        energyCounts[e.energyLevel] = (energyCounts[e.energyLevel] || 0) + 1;
      }
    });

    const allGratitudes: { text: string; pageNumber: number; dateStr: string; entryId: string }[] = [];
    diaryEntries.forEach((e: DiaryEntry) => {
      e.gratitude?.forEach((g: string) => {
        if (g && g.trim()) {
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

  if (theme === "vintage") {
    return (
      <div className="w-full relative torn-sheet-shadow">
        <div className="w-full relative old-paper-bg torn-parchment-sheet p-5 sm:p-8 md:p-10 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text space-y-5">
          <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
              <h2 className="font-handwriting text-2xl font-bold text-[#2A1D13] dark:text-[#FAF4EB]">
                {currentDiary?.name || "Chronicle"} — Vitality Digest
              </h2>
            </div>
            <span className="font-handwriting text-sm font-bold text-[#7A6855] dark:text-[#8FA5B8]">
              Vintage Parchment
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#EDE5D2]/70 dark:bg-[#1A2838]/70 rounded text-center border border-[#D8CCB0]/60 dark:border-[#223348]/60">
              <span className="text-xs font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Leaves Inscribed</span>
              <span className="text-2xl font-handwriting font-bold text-[#1E2536] dark:text-[#F3EDE2]">{summaryStats.totalPages}</span>
            </div>
            <div className="p-3 bg-[#EDE5D2]/70 dark:bg-[#1A2838]/70 rounded text-center border border-[#D8CCB0]/60 dark:border-[#223348]/60">
              <span className="text-xs font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Marked Leaves</span>
              <span className="text-2xl font-handwriting font-bold text-[#8C3A27] dark:text-[#E59375]">{summaryStats.heartedCount}</span>
            </div>
            <div className="p-3 bg-[#EDE5D2]/70 dark:bg-[#1A2838]/70 rounded text-center border border-[#D8CCB0]/60 dark:border-[#223348]/60">
              <span className="text-xs font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Avg Vitality</span>
              <span className="text-2xl font-handwriting font-bold text-[#1E2536] dark:text-[#F3EDE2]">{summaryStats.avgEnergy}/5</span>
            </div>
            <div className="p-3 bg-[#EDE5D2]/70 dark:bg-[#1A2838]/70 rounded text-center border border-[#D8CCB0]/60 dark:border-[#223348]/60">
              <span className="text-xs font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Gratitudes</span>
              <span className="text-2xl font-handwriting font-bold text-[#8C3A27] dark:text-[#E59375]">
                {summaryStats.allGratitudes.length}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="font-handwriting text-base text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer"
            >
              Return to Open Leaf
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "classic") {
    return (
      <div className="w-full relative shadow-xl rounded-lg overflow-hidden border border-[#D0C5B0] dark:border-[#1E3048]">
        <div className="bg-[#FBF9F2] dark:bg-[#121A26] p-5 sm:p-8 md:p-10 relative space-y-5">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="font-serif text-xl font-bold text-[#152B47] dark:text-[#FAF7EE]">
                {currentDiary?.name || "Chronicle"} — Vitality Digest
              </h2>
            </div>
            <span className="font-mono text-xs text-[#AA8520]">
              Classic Ledger
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#EDE7D6]/70 dark:bg-[#1A2636]/70 rounded text-center border border-[#D0C5B0]/50 dark:border-[#1E3048]/50">
              <span className="text-[11px] font-mono text-[#AA8520] block">Pages Inscribed</span>
              <span className="text-2xl font-serif font-bold text-[#152B47] dark:text-[#E2ECF7]">{summaryStats.totalPages}</span>
            </div>
            <div className="p-3 bg-[#EDE7D6]/70 dark:bg-[#1A2636]/70 rounded text-center border border-[#D0C5B0]/50 dark:border-[#1E3048]/50">
              <span className="text-[11px] font-mono text-[#AA8520] block">Beloved Pages</span>
              <span className="text-2xl font-serif font-bold text-[#D4AF37]">{summaryStats.heartedCount}</span>
            </div>
            <div className="p-3 bg-[#EDE7D6]/70 dark:bg-[#1A2636]/70 rounded text-center border border-[#D0C5B0]/50 dark:border-[#1E3048]/50">
              <span className="text-[11px] font-mono text-[#AA8520] block">Avg Vitality</span>
              <span className="text-2xl font-serif font-bold text-[#152B47] dark:text-[#E2ECF7]">{summaryStats.avgEnergy}/5</span>
            </div>
            <div className="p-3 bg-[#EDE7D6]/70 dark:bg-[#1A2636]/70 rounded text-center border border-[#D0C5B0]/50 dark:border-[#1E3048]/50">
              <span className="text-[11px] font-mono text-[#AA8520] block">Gratitudes</span>
              <span className="text-2xl font-serif font-bold text-[#1E3A5F] dark:text-[#D4AF37]">
                {summaryStats.allGratitudes.length}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D4AF37]/40 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] hover:underline cursor-pointer"
            >
              Return to Open Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sky-500" />
          <h2 className="font-sans text-xl font-bold text-slate-900 dark:text-white">
            {currentDiary?.name || "Chronicle"} — Vitality Digest
          </h2>
        </div>
        <span className="font-mono text-xs text-slate-500">
          Modern
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 block">Pages Inscribed</span>
          <span className="text-2xl font-sans font-bold text-slate-900 dark:text-white">{summaryStats.totalPages}</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 block">Beloved Pages</span>
          <span className="text-2xl font-sans font-bold text-rose-500">{summaryStats.heartedCount}</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 block">Avg Vitality</span>
          <span className="text-2xl font-sans font-bold text-sky-500">{summaryStats.avgEnergy}/5</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-500 block">Gratitudes</span>
          <span className="text-2xl font-sans font-bold text-slate-900 dark:text-white">
            {summaryStats.allGratitudes.length}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-sans text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
        >
          Return to Open Page
        </button>
      </div>
    </div>
  );
}
