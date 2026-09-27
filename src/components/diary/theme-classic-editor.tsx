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

export function ThemeClassicEditor({
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
    <div className="w-full relative shadow-md rounded-lg overflow-hidden border border-border">
      <div className="bg-card text-card-foreground p-5 sm:p-8 md:p-10 relative">
        <div className="absolute top-0 right-10 w-6 h-8 bg-gradient-to-b from-primary to-primary/70 rounded-b shadow-sm pointer-events-none" />
        <div className="space-y-5 relative z-10">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (prevEntry) onNavigate(prevEntry.id);
              }}
              disabled={!prevEntry}
              className="px-2 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground font-serif text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>Prev</span>
            </button>

            <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-2 flex-1 min-w-0 px-1">
              <DiaryDatePicker
                currentEntry={currentEntry}
                theme="classic"
                onDateSelect={applyInstantChange}
              />
              <span className="text-border text-xs select-none">•</span>
              <DiaryTimePicker
                startTime={currentEntry.startTime}
                endTime={currentEntry.endTime}
                theme="classic"
                onTimeChange={applyInstantChange}
                calculateDuration={calculateDuration}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onToggleHeart}
                className="cursor-pointer p-0.5 hover:opacity-80 transition-opacity"
                title={currentEntry.isHearted ? "Unmark Favorite" : "Mark as Favorite"}
              >
                <PencilHeart filled={!!currentEntry.isHearted} theme="classic" />
              </button>

              <button
                type="button"
                onClick={onDeletePage}
                disabled={isDeleting}
                className="cursor-pointer p-0.5 group hover:scale-110 transition-transform disabled:opacity-30"
                title="Strike out / Delete this page"
              >
                <PencilDelete theme="classic" />
              </button>

              <span className="font-mono text-xs font-bold text-primary">
                #{currentEntry.pageNumber}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (nextEntry) onNavigate(nextEntry.id);
                  else onNewPage();
                }}
                className="px-2 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground font-serif text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{nextEntry ? "Next" : "New +"}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={currentEntry.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onBlur={onSave}
              placeholder="The Day's Proclamation..."
              className="w-full bg-transparent font-serif text-2xl sm:text-3xl font-bold text-foreground border-b border-primary/40 focus:border-primary focus:outline-none py-1 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="space-y-2">
            <textarea
              rows={7}
              value={currentEntry.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Record your daily inquiries, field notes, and reflections with fountain pen clarity..."
              className="w-full bg-transparent font-reading text-base sm:text-lg text-foreground leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground/40"
            />
            {hasDescriptionChanges && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/50 font-serif text-xs rounded font-bold cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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

          <div className="space-y-2 pt-1 border-t border-border/80">
            <span className="font-mono text-[10px] uppercase text-primary font-bold tracking-wider block">
              Gratitude Inscriptions
            </span>
            {currentEntry.gratitude.map((item: string, idx: number) => (
              <div key={idx} className="flex items-baseline gap-2">
                <span className="font-serif text-sm font-bold text-primary">§{idx + 1}.</span>
                <input
                  type="text"
                  value={item}
                  placeholder={`Daily blessing #${idx + 1}...`}
                  onChange={(e) => {
                    const newGrat = [...currentEntry.gratitude] as [string, string, string];
                    newGrat[idx] = e.target.value;
                    onUpdate({ gratitude: newGrat });
                  }}
                  onBlur={onSave}
                  className="flex-1 bg-transparent border-b border-border font-serif text-base text-foreground focus:outline-none focus:border-primary py-0.5 placeholder:text-muted-foreground/40"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border/80 space-y-3">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs font-bold text-primary uppercase">Vitality</span>
                <span className="font-serif text-xs font-bold text-foreground">
                  {ENERGY_LEVELS.find((l) => l.level === currentEntry.energyLevel)?.label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {ENERGY_LEVELS.map((e) => (
                  <button
                    key={e.level}
                    type="button"
                    onClick={() => applyInstantChange({ energyLevel: e.level })}
                    className={`py-1.5 px-1 text-center rounded border font-serif text-xs cursor-pointer ${
                      currentEntry.energyLevel === e.level
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-muted/60 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-primary uppercase block">
                  Disposition
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {MOOD_LIST.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyInstantChange({ mood: `${m.emoji} ${m.label}` })}
                      className={`flex items-center justify-center gap-1 px-1 py-1 rounded border text-xs font-serif cursor-pointer ${
                        currentEntry.mood === `${m.emoji} ${m.label}`
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : "bg-muted/60 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-primary uppercase block">
                  Atmosphere
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {WEATHER_LIST.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => applyInstantChange({ weather: w.id })}
                        className={`p-1 rounded border flex flex-col items-center justify-center cursor-pointer ${
                          currentEntry.weather === w.id
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-muted/60 border-border text-muted-foreground hover:text-foreground"
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
            <div className="flex items-center gap-1.5">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-[#1E3A5F] dark:text-[#D4AF37]" />
                  <span className="italic animate-pulse">Saving reflection...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Unsaved changes
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Saved</span>
                </>
              )}
            </div>
            <span className="font-mono font-bold tracking-wider">
              — Page {currentEntry.pageNumber} —
            </span>
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-3 py-1 bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF7EE] border border-[#D4AF37]/50 font-serif text-xs rounded font-bold cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
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
