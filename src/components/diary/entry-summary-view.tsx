"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  Flame,
  Smile,
  Heart,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Sun,
  Zap,
  FileQuestion,
  Loader2,
} from "lucide-react";
import type { DiaryEntry, Diary, DiaryTheme, DiaryDaySummary } from "@/types/diary";
import { useDiaryDaySummary } from "@/hooks/queries/use-diaries";
import { SummaryDatePicker } from "./summary-date-picker";

interface EntrySummaryViewProps {
  currentDiary: Diary | null;
  diaryEntries: DiaryEntry[];
  currentEntry?: DiaryEntry;
  theme: DiaryTheme;
  onClose: () => void;
  onSelectEntry?: (entryId: string) => void;
}

type DateGroupSummary = DiaryDaySummary;

function parseDate(rawDate?: string): Date {
  if (!rawDate) return new Date();
  const parts = rawDate.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function EntrySummaryView({
  currentDiary,
  diaryEntries,
  currentEntry,
  theme = "vintage",
  onClose,
  onSelectEntry,
}: EntrySummaryViewProps) {
  // Group entries by date for the quick day tabs
  const dateGroups = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    const order: string[] = [];

    diaryEntries.forEach((entry) => {
      const key = entry.entryDate || entry.dateStr || "Undated";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(entry);
    });

    const groups: DateGroupSummary[] = order.map((key) => {
      const entries = map.get(key) || [];
      const sample = entries[0];
      const displayDate = sample?.entryDate
        ? `${sample.dayOfWeek ? `${sample.dayOfWeek}, ` : ""}${sample.dateStr || sample.entryDate}`
        : sample?.dateStr || "Undated Entries";

      const totalPages = entries.length;
      const totalWords = entries.reduce(
        (acc, e) =>
          acc +
          (e.wordCount ||
            (e.description ? e.description.trim().split(/\s+/).filter(Boolean).length : 0)),
        0
      );

      const totalEnergy = entries.reduce((acc, e) => acc + (e.energyLevel || 3), 0);
      const avgEnergy = totalPages > 0 ? (totalEnergy / totalPages).toFixed(1) : "0";

      const moods = Array.from(new Set(entries.map((e) => e.mood).filter(Boolean)));
      const weatherList = Array.from(new Set(entries.map((e) => e.weather).filter(Boolean)));

      const gratitudeCount = entries.reduce(
        (acc, e) => acc + (e.gratitude?.filter((g) => g && g.trim()).length || 0),
        0
      );

      return {
        dateKey: key,
        displayDate,
        entries,
        totalPages,
        totalWords,
        avgEnergy,
        moods,
        weatherList,
        gratitudeCount,
      };
    });

    return groups;
  }, [diaryEntries]);

  // Set of dates with recorded entries for the date picker highlights
  const recordedDates = useMemo(() => {
    const set = new Set<string>();
    diaryEntries.forEach((e) => {
      if (e.entryDate) set.add(e.entryDate);
    });
    return set;
  }, [diaryEntries]);

  // Selected day state (default to currentEntry's dateKey or the first date group)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (currentEntry) {
      return currentEntry.entryDate || currentEntry.dateStr || dateGroups[0]?.dateKey || "";
    }
    return dateGroups[0]?.dateKey || "";
  });

  // Call API to fetch day summary and entries whenever selectedDateKey changes
  const { data: apiDaySummary, isLoading: isDayLoading, isFetching: isDayFetching } = useDiaryDaySummary(
    currentDiary?.id,
    selectedDateKey
  );

  const activeGroup = useMemo<DateGroupSummary>(() => {
    if (apiDaySummary) {
      return apiDaySummary;
    }

    const match = dateGroups.find((g) => g.dateKey === selectedDateKey);
    if (match) return match;

    // Check if selectedDateKey matches an entryDate or ISO
    const matchingEntries = diaryEntries.filter(
      (e) => (e.entryDate && e.entryDate === selectedDateKey) || e.dateStr === selectedDateKey
    );

    if (matchingEntries.length > 0) {
      const sample = matchingEntries[0];
      const displayDate = sample?.entryDate
        ? `${sample.dayOfWeek ? `${sample.dayOfWeek}, ` : ""}${sample.dateStr || sample.entryDate}`
        : sample?.dateStr || selectedDateKey;

      const totalPages = matchingEntries.length;
      const totalWords = matchingEntries.reduce(
        (acc, e) =>
          acc +
          (e.wordCount ||
            (e.description ? e.description.trim().split(/\s+/).filter(Boolean).length : 0)),
        0
      );
      const totalEnergy = matchingEntries.reduce((acc, e) => acc + (e.energyLevel || 3), 0);
      const avgEnergy = totalPages > 0 ? (totalEnergy / totalPages).toFixed(1) : "0";
      const moods = Array.from(new Set(matchingEntries.map((e) => e.mood).filter(Boolean)));
      const weatherList = Array.from(new Set(matchingEntries.map((e) => e.weather).filter(Boolean)));
      const gratitudeCount = matchingEntries.reduce(
        (acc, e) => acc + (e.gratitude?.filter((g) => g && g.trim()).length || 0),
        0
      );

      return {
        dateKey: selectedDateKey,
        displayDate,
        entries: matchingEntries,
        totalPages,
        totalWords,
        avgEnergy,
        moods,
        weatherList,
        gratitudeCount,
      };
    }

    // Empty state fallback for selected calendar date
    let displayDate = selectedDateKey || "Selected Date";
    try {
      if (selectedDateKey) {
        const d = parseDate(selectedDateKey);
        const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
        const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
        displayDate = `${dayOfWeek}, ${dateStr}`;
      }
    } catch {}

    return {
      dateKey: selectedDateKey,
      displayDate,
      entries: [],
      totalPages: 0,
      totalWords: 0,
      avgEnergy: "0",
      moods: [],
      weatherList: [],
      gratitudeCount: 0,
    };
  }, [dateGroups, diaryEntries, selectedDateKey]);

  if (theme === "vintage") {
    return (
      <div className="w-full relative torn-sheet-shadow">
        <div className="w-full relative old-paper-bg torn-parchment-sheet p-5 sm:p-8 md:p-10 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
              <h2 className="font-handwriting text-2xl font-bold text-[#2A1D13] dark:text-[#FAF4EB]">
                {currentDiary?.name || "Chronicle"} — Day Digest & Ledger
              </h2>
            </div>
            <span className="font-handwriting text-sm font-bold text-[#7A6855] dark:text-[#8FA5B8]">
              {dateGroups.length} Days Recorded
            </span>
          </div>

          {/* Day Selector & Date Picker */}
          <div className="space-y-1.5">
            <span className="text-xs font-handwriting font-bold text-[#7A6855] dark:text-[#8FA5B8] uppercase block">
              Select Day of Record
            </span>
            <div className="flex items-center gap-2">
              <SummaryDatePicker
                selectedDate={selectedDateKey}
                recordedDates={recordedDates}
                theme="vintage"
                onDateSelect={(iso) => setSelectedDateKey(iso)}
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none flex-1">
                {dateGroups.map((g) => {
                  const isSelected = g.dateKey === activeGroup?.dateKey;
                  return (
                    <button
                      key={g.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(g.dateKey)}
                      className={`px-3 py-1.5 rounded-sm font-handwriting text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-[#8C3A27] text-[#FAF6EE] shadow-sm scale-102"
                          : "bg-[#EDE5D2]/70 dark:bg-[#1A2838]/70 text-[#4A3525] dark:text-amber-200 hover:bg-[#E2D8C3]"
                      }`}
                    >
                      <Calendar className="h-3 w-3 opacity-70" />
                      <span>{g.displayDate}</span>
                      <span className="text-xs opacity-75 font-mono">({g.totalPages})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeGroup && (
            <div className="space-y-4 pt-2">
              {/* Day Average Summary Card */}
              <div className="p-4 bg-[#EDE5D2]/80 dark:bg-[#1A2838]/80 border border-[#D8CCB0] dark:border-[#223348] rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#D8CCB0]/60 dark:border-[#223348]/60 pb-2">
                  <div className="flex items-center gap-1.5 font-handwriting text-lg font-bold text-[#8C3A27] dark:text-amber-300">
                    <Calendar className="h-4 w-4" />
                    <span>Summary Report for {activeGroup.displayDate}</span>
                    {isDayFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8C3A27] dark:text-amber-300 ml-1" />}
                  </div>
                  <span className="text-xs font-handwriting text-[#7A6855] dark:text-[#8E9FA8] font-bold">
                    {activeGroup.totalWords} Total Words
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#FAF6EE]/80 dark:bg-[#14202C]/80 rounded text-center border border-[#D8CCB0]/40 dark:border-[#223348]/40">
                    <span className="text-[11px] font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Pages Inscribed</span>
                    <span className="text-2xl font-handwriting font-bold text-[#1E2536] dark:text-[#F3EDE2]">{activeGroup.totalPages}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE]/80 dark:bg-[#14202C]/80 rounded text-center border border-[#D8CCB0]/40 dark:border-[#223348]/40">
                    <span className="text-[11px] font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Avg Vitality</span>
                    <span className="text-2xl font-handwriting font-bold text-[#8C3A27] dark:text-[#E59375]">{activeGroup.avgEnergy} / 5</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE]/80 dark:bg-[#14202C]/80 rounded text-center border border-[#D8CCB0]/40 dark:border-[#223348]/40">
                    <span className="text-[11px] font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Gratitudes Inscribed</span>
                    <span className="text-2xl font-handwriting font-bold text-[#1E2536] dark:text-[#F3EDE2]">{activeGroup.gratitudeCount}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE]/80 dark:bg-[#14202C]/80 rounded text-center border border-[#D8CCB0]/40 dark:border-[#223348]/40">
                    <span className="text-[11px] font-handwriting text-[#7A6855] dark:text-[#8FA5B8] block">Dominant Moods</span>
                    <span className="text-sm font-handwriting font-bold text-[#8C3A27] dark:text-amber-300 line-clamp-1 mt-1">
                      {activeGroup.moods.length > 0 ? activeGroup.moods.join(", ") : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Entries of the selected day */}
              {activeGroup.entries.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-handwriting font-bold text-[#7A6855] dark:text-[#8FA5B8] uppercase block">
                    Leaves Inscribed on this Day ({activeGroup.entries.length})
                  </span>

                  <div className="divide-y divide-[#D8CCB0]/50 dark:divide-[#223348]/50 max-h-[35vh] overflow-y-auto pr-1">
                    {activeGroup.entries.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => onSelectEntry && onSelectEntry(entry.id)}
                        className="py-2.5 px-3 rounded-sm hover:bg-[#EDE5D2]/50 dark:hover:bg-[#1A2838]/50 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs font-handwriting">
                            <span className="font-bold text-[#8C3A27] dark:text-[#E59375]">
                              Leaf #{entry.pageNumber}
                            </span>
                            {entry.startTime && (
                              <span className="text-[#544332] dark:text-[#B4C5D6] font-semibold">
                                • {entry.startTime}
                              </span>
                            )}
                            <span className="text-xs text-[#8A735E] dark:text-[#8E9FA8]">
                              • Vitality: {entry.energyLevel || 3}/5
                            </span>
                            {entry.mood && (
                              <span className="text-xs text-[#8C3A27] dark:text-amber-300">
                                • {entry.mood}
                              </span>
                            )}
                          </div>
                          <h4 className="font-handwriting text-lg font-bold text-[#1E2536] dark:text-[#F3EDE2] group-hover:text-[#8C3A27] dark:group-hover:text-amber-300 transition-colors">
                            {entry.title || "Untitled Inscription"}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 font-handwriting text-xs font-bold text-[#8C3A27] dark:text-[#E59375] group-hover:underline">
                          <span>Read leaf</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[#D8CCB0] dark:border-[#223348] rounded-sm bg-[#EDE5D2]/40 dark:bg-[#1A2838]/40 space-y-2">
                  <FileQuestion className="h-6 w-6 mx-auto text-[#8C3A27]/60 dark:text-amber-300/60" />
                  <p className="font-handwriting text-base text-[#544332] dark:text-[#CBD5E1]">
                    No leaves or inscriptions recorded for this date.
                  </p>
                  {dateGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(dateGroups[0].dateKey)}
                      className="font-handwriting text-xs text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer"
                    >
                      Jump to latest recorded day ({dateGroups[0].displayDate})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="font-serif text-xl font-bold text-[#152B47] dark:text-[#FAF7EE]">
                {currentDiary?.name || "Chronicle"} — Daily Ledger & Digest
              </h2>
            </div>
            <span className="font-mono text-xs text-[#AA8520]">
              {dateGroups.length} Days Recorded
            </span>
          </div>

          {/* Day Selector & Date Picker */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-[#AA8520] uppercase font-bold block">
              Select Record Date
            </span>
            <div className="flex items-center gap-2">
              <SummaryDatePicker
                selectedDate={selectedDateKey}
                recordedDates={recordedDates}
                theme="classic"
                onDateSelect={(iso) => setSelectedDateKey(iso)}
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none flex-1">
                {dateGroups.map((g) => {
                  const isSelected = g.dateKey === activeGroup?.dateKey;
                  return (
                    <button
                      key={g.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(g.dateKey)}
                      className={`px-3 py-1.5 rounded font-serif text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-[#1E3A5F] text-[#FAF7EE] border border-[#D4AF37] shadow-xs"
                          : "bg-[#EDE7D6]/60 dark:bg-[#1A2636]/60 text-[#152B47] dark:text-[#CBD5E1] hover:bg-[#EDE7D6]"
                      }`}
                    >
                      <Calendar className="h-3 w-3 opacity-70" />
                      <span>{g.displayDate}</span>
                      <span className="text-[10px] font-mono opacity-75">({g.totalPages})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeGroup && (
            <div className="space-y-4 pt-2">
              {/* Day Average Summary Card */}
              <div className="p-4 bg-[#EDE7D6]/60 dark:bg-[#1A2636]/60 border border-[#D0C5B0]/50 dark:border-[#1E3048]/50 rounded space-y-3">
                <div className="flex items-center justify-between border-b border-[#D0C5B0]/40 dark:border-[#1E3048]/40 pb-2">
                  <div className="flex items-center gap-1.5 font-serif text-base font-bold text-[#1E3A5F] dark:text-[#E2ECF7]">
                    <Calendar className="h-4 w-4 text-[#D4AF37]" />
                    <span>Daily Performance Report — {activeGroup.displayDate}</span>
                    {isDayFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37] ml-1" />}
                  </div>
                  <span className="text-xs font-mono text-[#AA8520]">
                    {activeGroup.totalWords} Words Total
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#FAF9F2] dark:bg-[#121A26] rounded text-center border border-[#D0C5B0]/40 dark:border-[#1E3048]/40">
                    <span className="text-[10px] font-mono text-[#AA8520] block">Inscribed Pages</span>
                    <span className="text-xl font-serif font-bold text-[#152B47] dark:text-[#E2ECF7]">{activeGroup.totalPages}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F2] dark:bg-[#121A26] rounded text-center border border-[#D0C5B0]/40 dark:border-[#1E3048]/40">
                    <span className="text-[10px] font-mono text-[#AA8520] block">Avg Vitality</span>
                    <span className="text-xl font-serif font-bold text-[#D4AF37]">{activeGroup.avgEnergy} / 5</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F2] dark:bg-[#121A26] rounded text-center border border-[#D0C5B0]/40 dark:border-[#1E3048]/40">
                    <span className="text-[10px] font-mono text-[#AA8520] block">Gratitudes</span>
                    <span className="text-xl font-serif font-bold text-[#152B47] dark:text-[#E2ECF7]">{activeGroup.gratitudeCount}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F2] dark:bg-[#121A26] rounded text-center border border-[#D0C5B0]/40 dark:border-[#1E3048]/40">
                    <span className="text-[10px] font-mono text-[#AA8520] block">Recorded Moods</span>
                    <span className="text-xs font-serif font-bold text-[#1E3A5F] dark:text-[#D4AF37] line-clamp-1 mt-1">
                      {activeGroup.moods.length > 0 ? activeGroup.moods.join(", ") : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Entries of the selected day */}
              {activeGroup.entries.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-[#AA8520] uppercase font-bold block">
                    Entries Recorded on this Day ({activeGroup.entries.length})
                  </span>

                  <div className="divide-y divide-[#D0C5B0]/40 dark:divide-[#1E3048]/40 max-h-[35vh] overflow-y-auto pr-1">
                    {activeGroup.entries.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => onSelectEntry && onSelectEntry(entry.id)}
                        className="py-2.5 px-3 rounded hover:bg-[#EDE7D6]/40 dark:hover:bg-[#1A2636]/40 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-[#AA8520]">
                              Page #{entry.pageNumber}
                            </span>
                            {entry.startTime && (
                              <span className="text-[#152B47] dark:text-[#CBD5E1] font-semibold font-serif">
                                • {entry.startTime}
                              </span>
                            )}
                            <span className="text-xs text-[#1E3A5F]/70 dark:text-[#E2ECF7]/70 font-serif">
                              • Vitality: {entry.energyLevel || 3}/5
                            </span>
                            {entry.mood && (
                              <span className="text-xs text-[#D4AF37]">
                                • {entry.mood}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif text-base font-bold text-[#152B47] dark:text-[#FAF7EE] group-hover:text-[#D4AF37] transition-colors">
                            {entry.title || "Untitled Reflection"}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 font-serif text-xs font-bold text-[#1E3A5F] dark:text-[#D4AF37] group-hover:underline">
                          <span>Turn page</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[#D0C5B0] dark:border-[#1E3048] rounded bg-[#EDE7D6]/30 dark:bg-[#1A2636]/30 space-y-2">
                  <FileQuestion className="h-6 w-6 mx-auto text-[#D4AF37]/70" />
                  <p className="font-serif text-sm text-[#152B47] dark:text-[#CBD5E1]">
                    No pages inscribed for this date.
                  </p>
                  {dateGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(dateGroups[0].dateKey)}
                      className="font-serif text-xs text-[#1E3A5F] dark:text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      Jump to latest recorded date ({dateGroups[0].displayDate})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sky-500" />
          <h2 className="font-sans text-xl font-bold text-slate-900 dark:text-white">
            {currentDiary?.name || "Diary"} — Daily Summary & Metrics
          </h2>
        </div>
        <span className="font-mono text-xs text-slate-500">
          {dateGroups.length} Days Recorded
        </span>
      </div>

      {/* Day Selector & Date Picker */}
      <div className="space-y-1.5">
        <span className="text-xs font-mono text-slate-500 uppercase font-semibold block">
          Select Day
        </span>
        <div className="flex items-center gap-2">
          <SummaryDatePicker
            selectedDate={selectedDateKey}
            recordedDates={recordedDates}
            theme="modern"
            onDateSelect={(iso) => setSelectedDateKey(iso)}
          />
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none flex-1">
            {dateGroups.map((g) => {
              const isSelected = g.dateKey === activeGroup?.dateKey;
              return (
                <button
                  key={g.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(g.dateKey)}
                  className={`px-3 py-1.5 rounded-lg font-sans text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Calendar className="h-3 w-3 opacity-70" />
                  <span>{g.displayDate}</span>
                  <span className="text-[10px] font-mono opacity-75">({g.totalPages})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeGroup && (
        <div className="space-y-4 pt-2">
          {/* Day Average Summary Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <div className="flex items-center gap-1.5 font-sans text-sm font-bold text-slate-900 dark:text-white">
                <Calendar className="h-4 w-4 text-sky-500" />
                <span>Day Report: {activeGroup.displayDate}</span>
                {isDayFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500 ml-1" />}
              </div>
              <span className="text-xs font-mono text-slate-500">
                {activeGroup.totalWords} Total Words
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-center border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 block">Total Pages</span>
                <span className="text-xl font-sans font-bold text-slate-900 dark:text-white">{activeGroup.totalPages}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-center border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 block">Avg Vitality</span>
                <span className="text-xl font-sans font-bold text-sky-500">{activeGroup.avgEnergy} / 5</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-center border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 block">Gratitudes</span>
                <span className="text-xl font-sans font-bold text-slate-900 dark:text-white">{activeGroup.gratitudeCount}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-center border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 block">Moods Recorded</span>
                <span className="text-xs font-sans font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mt-1">
                  {activeGroup.moods.length > 0 ? activeGroup.moods.join(", ") : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Entries of the selected day */}
          {activeGroup.entries.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-500 uppercase font-semibold block">
                Pages Inscribed on this Day ({activeGroup.entries.length})
              </span>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[35vh] overflow-y-auto pr-1">
                {activeGroup.entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onSelectEntry && onSelectEntry(entry.id)}
                    className="py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="font-bold text-sky-500">
                          Page #{entry.pageNumber}
                        </span>
                        {entry.startTime && (
                          <span className="text-slate-600 dark:text-slate-400 font-sans">
                            • {entry.startTime}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          • Vitality: {entry.energyLevel || 3}/5
                        </span>
                        {entry.mood && (
                          <span className="text-xs text-sky-500">
                            • {entry.mood}
                          </span>
                        )}
                      </div>
                      <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                        {entry.title || "Untitled Entry"}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 font-sans text-xs font-medium text-sky-500 group-hover:underline">
                      <span>Open page</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/30 space-y-2">
              <FileQuestion className="h-6 w-6 mx-auto text-sky-500/70" />
              <p className="font-sans text-sm text-slate-600 dark:text-slate-400">
                No entries logged for this date.
              </p>
              {dateGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(dateGroups[0].dateKey)}
                  className="font-sans text-xs font-medium text-sky-500 hover:underline cursor-pointer"
                >
                  Jump to latest recorded day ({dateGroups[0].displayDate})
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
