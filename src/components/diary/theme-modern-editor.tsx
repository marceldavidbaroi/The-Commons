"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Check, Save, Loader2 } from "lucide-react";
import { PencilHeart, PencilDelete, WEATHER_LIST } from "./diary-icons";
import { ENERGY_LEVELS, MOOD_LIST } from "@/types/diary";
import type { DiaryEntry } from "@/types/diary";
import { DiaryDatePicker } from "./diary-date-picker";
import { DiaryTimePicker } from "./diary-time-picker";

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
  hasDescriptionChanges?: boolean;
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
  hasDescriptionChanges,
  isDeleting,
}: ThemeEditorProps) {
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

  return (
    <div className="w-full relative bg-card text-card-foreground rounded-2xl shadow-md border border-border p-5 sm:p-8 md:p-10 select-text">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-3 gap-2">
          <button
            type="button"
            onClick={() => {
              if (prevEntry) onNavigate(prevEntry.id);
            }}
            disabled={!prevEntry}
            className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground font-sans text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Prev</span>
          </button>

          <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-2 flex-1 min-w-0 px-1">
            <DiaryDatePicker
              currentEntry={currentEntry}
              theme="modern"
              onDateSelect={applyInstantChange}
            />
            <span className="text-border text-xs select-none">•</span>
            <DiaryTimePicker
              startTime={currentEntry.startTime}
              endTime={currentEntry.endTime}
              theme="modern"
              onTimeChange={applyInstantChange}
              calculateDuration={calculateDuration}
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleHeart}
              className="cursor-pointer p-1 rounded-full hover:bg-muted transition-colors"
              title={currentEntry.isHearted ? "Unmark Favorite" : "Mark as Favorite"}
            >
              <PencilHeart filled={!!currentEntry.isHearted} theme="modern" />
            </button>

            <button
              type="button"
              onClick={onDeletePage}
              disabled={isDeleting}
              className="cursor-pointer p-1 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
              title="Delete this page"
            >
              <PencilDelete theme="modern" />
            </button>

            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
              p. {currentEntry.pageNumber}
            </span>

            <button
              type="button"
              onClick={() => {
                if (nextEntry) onNavigate(nextEntry.id);
                else onNewPage();
              }}
              className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground font-sans text-xs flex items-center gap-1 cursor-pointer"
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
            className="w-full bg-transparent font-sans text-2xl sm:text-3xl font-bold text-foreground border-b border-border/80 focus:border-primary focus:outline-none py-1 placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="space-y-2">
          <textarea
            rows={7}
            value={currentEntry.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Type your notes, sprint logs, and mindful reflections..."
            className="w-full bg-transparent font-reading text-base sm:text-lg text-foreground leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground/50"
          />
          {hasDescriptionChanges && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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

        <div className="space-y-2 pt-1 border-t border-border/80">
          <span className="font-mono text-[11px] uppercase text-primary font-semibold tracking-wider block">
            Key Gratitudes
          </span>
          {currentEntry.gratitude.map((item: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
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
                className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-1.5 font-sans text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/80 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                Energy Level
              </span>
              <span className="text-xs font-bold text-primary">
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
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            <div className="space-y-1.5">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase block">
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
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase block">
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
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
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
