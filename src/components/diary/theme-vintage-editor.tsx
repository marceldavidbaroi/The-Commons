"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Save, Loader2, Calendar } from "lucide-react";
import { PencilHeart, PencilDelete, WEATHER_LIST } from "./diary-icons";
import { ENERGY_LEVELS, MOOD_LIST } from "@/types/diary";
import type { DiaryEntry } from "@/types/diary";

interface ThemeEditorProps {
  currentEntry: DiaryEntry;
  prevEntry: DiaryEntry | null;
  nextEntry: DiaryEntry | null;
  onNavigate: (entryId: string) => void;
  onNewPage: () => void;
  onToggleHeart: () => void;
  onDeletePage: () => void;
  onUpdate: (fields: Partial<DiaryEntry>) => void;
  onSaveAndApply?: (fields: Partial<DiaryEntry>) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isDeleting?: boolean;
}

export function ThemeVintageEditor({
  currentEntry,
  prevEntry,
  nextEntry,
  onNavigate,
  onNewPage,
  onToggleHeart,
  onDeletePage,
  onUpdate,
  onSaveAndApply,
  onSave,
  isSaving,
  hasUnsavedChanges,
  isDeleting,
}: ThemeEditorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const calculateDuration = (start: string, end: string) => {
    try {
      const [sH, sM] = start.split(":").map(Number);
      const [eH, eM] = end.split(":").map(Number);
      let diff = eH * 60 + eM - (sH * 60 + sM);
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
    } catch {
      return "0h 0m";
    }
  };

  const applyInstantChange = (fields: Partial<DiaryEntry>) => {
    if (onSaveAndApply) {
      onSaveAndApply(fields);
    } else {
      onUpdate(fields);
      onSave();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) return;
    const [year, month, day] = raw.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dateStr = selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const dayOfWeek = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
    const yearStr = `Anno ${selectedDate.getFullYear()}`;

    applyInstantChange({
      entryDate: raw,
      dateStr,
      dayOfWeek,
      yearStr,
    });
  };

  const formattedEntryDate = currentEntry.entryDate || (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="w-full relative torn-sheet-shadow">
      <div className="w-full relative old-paper-bg torn-parchment-sheet p-4 sm:p-7 md:p-9 lg:p-11 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text">
        <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-[#D97D7D]/25 dark:bg-[#E06C6C]/15 pointer-events-none" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (prevEntry) onNavigate(prevEntry.id);
              }}
              disabled={!prevEntry}
              className="torn-paper px-2 py-0.5 bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-[#CBD5E1] font-handwriting text-xs sm:text-sm flex items-center gap-0.5 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>Prev</span>
            </button>

            <div className="relative flex items-center justify-center flex-1 truncate px-1">
              <button
                type="button"
                onClick={() => {
                  if (dateInputRef.current) {
                    if ("showPicker" in HTMLInputElement.prototype) {
                      try {
                        dateInputRef.current.showPicker();
                      } catch {
                        dateInputRef.current.focus();
                      }
                    } else {
                      dateInputRef.current.focus();
                    }
                  }
                }}
                className="group inline-flex items-center gap-1.5 font-handwriting text-sm sm:text-base md:text-lg font-bold text-[#2A1D13] dark:text-[#FAF4EB] tracking-wide hover:text-[#8C3A27] dark:hover:text-amber-300 transition-colors cursor-pointer"
                title="Click to select inscription date"
              >
                <span>
                  {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} (
                  {calculateDuration(currentEntry.startTime, currentEntry.endTime)})
                </span>
                <Calendar className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity text-[#8C3A27] dark:text-amber-300 shrink-0" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={formattedEntryDate}
                onChange={handleDateChange}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                tabIndex={-1}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onToggleHeart}
                className="cursor-pointer p-0.5 hover:opacity-80 transition-opacity"
                title={currentEntry.isHearted ? "Unmark Favorite" : "Mark as Favorite"}
              >
                <PencilHeart filled={!!currentEntry.isHearted} theme="vintage" />
              </button>

              <button
                type="button"
                onClick={onDeletePage}
                disabled={isDeleting}
                className="cursor-pointer p-0.5 group hover:scale-110 transition-transform disabled:opacity-30"
                title="Strike out / Delete this page"
              >
                <PencilDelete theme="vintage" />
              </button>

              <span className="font-handwriting text-sm text-[#7A6855] dark:text-[#8FA5B8] min-w-6">
                #{currentEntry.pageNumber}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (nextEntry) onNavigate(nextEntry.id);
                  else onNewPage();
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
              placeholder="Title of this page..."
              onChange={(e) => onUpdate({ title: e.target.value })}
              onBlur={onSave}
              className="w-full bg-transparent border-b border-[#D5C9AC] dark:border-[#2C4158] font-handwriting text-xl sm:text-2xl font-bold text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none focus:border-[#8C3A27] pb-1 placeholder:text-[#8C7A68]/50"
            />
          </div>

          <div className="pt-2 space-y-2">
            <textarea
              rows={5}
              value={currentEntry.description}
              placeholder="Pen your thoughts upon the parchment..."
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full bg-transparent ruled-lines-bg font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none resize-none selection:bg-[#E8C89A] placeholder:text-[#8C7A68]/40"
            />
            {hasUnsavedChanges && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-3 py-1 bg-[#8C3A27] hover:bg-[#732E1E] text-[#FAF6EE] font-handwriting text-sm rounded shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Save Reflection"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Inscription</span>
                    </>
                  )}
                </button>
              </div>
            )}
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
                    onUpdate({ gratitude: newGrat });
                  }}
                  onBlur={onSave}
                  className="flex-1 bg-transparent border-b border-[#D5C9AC] dark:border-[#2C4158] font-handwriting text-lg sm:text-xl text-[#1E2536] dark:text-[#F3EDE2] focus:outline-none focus:border-[#8C3A27] py-0.5 placeholder:text-[#8C7A68]/40"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#D8CCB0]/70 dark:border-[#223348]/70 space-y-3">
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
                {ENERGY_LEVELS.map((e) => (
                  <button
                    key={e.level}
                    type="button"
                    onClick={() => applyInstantChange({ energyLevel: e.level })}
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
                <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">
                  Mood
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {MOOD_LIST.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyInstantChange({ mood: `${m.emoji} ${m.label}` })}
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
                <span className="font-handwriting text-base font-bold text-[#8A735E] dark:text-[#8E9FA8] block">
                  Weather
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {WEATHER_LIST.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => applyInstantChange({ weather: w.id })}
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
            <div className="font-handwriting text-xs italic flex items-center gap-1.5 min-w-0">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-[#8C3A27] shrink-0" />
                  <span className="text-[#8C3A27] dark:text-[#E59375] font-medium animate-pulse">
                    Saving reflection...
                  </span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Unsaved changes
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Saved</span>
                </>
              )}
            </div>
            <div className="font-handwriting font-bold text-sm tracking-widest text-[#3E2E21] dark:text-[#F1E8DC]">
              — Page {currentEntry.pageNumber} —
            </div>
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3 py-1 bg-[#8C3A27] hover:bg-[#732E1E] text-[#FAF6EE] font-handwriting text-sm rounded shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title="Save Reflection"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Page</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
