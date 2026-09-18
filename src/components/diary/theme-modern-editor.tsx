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

export function ThemeModernEditor({
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
      return `${h} hrs ${m > 0 ? `${m} mins` : ""}`.trim();
    } catch {
      return "8 hrs";
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
    <div className="w-full relative bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 md:p-10 select-text">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <button
            type="button"
            onClick={() => {
              if (prevEntry) onNavigate(prevEntry.id);
            }}
            disabled={!prevEntry}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
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
              className="group inline-flex items-center gap-1.5 font-sans text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight hover:text-sky-500 transition-colors cursor-pointer"
              title="Click to select entry date"
            >
              <span>
                {currentEntry.dayOfWeek}, {currentEntry.dateStr} • {currentEntry.startTime} (
                {calculateDuration(currentEntry.startTime, currentEntry.endTime)})
              </span>
              <Calendar className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity text-sky-500 shrink-0" />
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
              className="cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={currentEntry.isHearted ? "Unmark Favorite" : "Mark as Favorite"}
            >
              <PencilHeart filled={!!currentEntry.isHearted} theme="modern" />
            </button>

            <button
              type="button"
              onClick={onDeletePage}
              disabled={isDeleting}
              className="cursor-pointer p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-30"
              title="Delete this page"
            >
              <PencilDelete theme="modern" />
            </button>

            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              p. {currentEntry.pageNumber}
            </span>

            <button
              type="button"
              onClick={() => {
                if (nextEntry) onNavigate(nextEntry.id);
                else onNewPage();
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
            onChange={(e) => onUpdate({ title: e.target.value })}
            onBlur={onSave}
            placeholder="Focus Title or Morning Intent..."
            className="w-full bg-transparent font-sans text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-none py-1 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <textarea
            rows={7}
            value={currentEntry.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Type your notes, sprint logs, and mindful reflections..."
            className="w-full bg-transparent font-sans text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed focus:outline-none resize-none placeholder:text-slate-400"
          />
          {hasUnsavedChanges && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-sans text-xs font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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
                    <span>Save Reflection</span>
                  </>
                )}
              </button>
            </div>
          )}
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
                  onUpdate({ gratitude: newGrat });
                }}
                onBlur={onSave}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-sans text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
              />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs font-semibold text-slate-500 uppercase">
                Energy Level
              </span>
              <span className="text-xs font-bold text-sky-500">
                {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {ENERGY_LEVELS.map((e) => (
                <button
                  key={e.level}
                  type="button"
                  onClick={() => applyInstantChange({ energyLevel: e.level })}
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
              <span className="font-mono text-xs font-semibold text-slate-500 uppercase block">
                Mood
              </span>
              <div className="grid grid-cols-3 gap-1">
                {MOOD_LIST.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyInstantChange({ mood: `${m.emoji} ${m.label}` })}
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
              <span className="font-mono text-xs font-semibold text-slate-500 uppercase block">
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
          <div className="flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
                <span className="text-sky-500 font-medium animate-pulse">Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Unsaved changes
                </span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">All changes saved</span>
              </>
            )}
          </div>
          <span className="font-mono font-bold">— Page {currentEntry.pageNumber} —</span>
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-sans text-xs font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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
  );
}
