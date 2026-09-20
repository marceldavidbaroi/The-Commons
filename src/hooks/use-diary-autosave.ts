"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { DiaryEntry } from "@/types/diary";

interface UseDiaryAutosaveProps {
  entry: DiaryEntry | null;
  onSave: (params: { entryId: string; updates: Partial<DiaryEntry> }) => Promise<unknown>;
  debounceMs?: number;
}

export function useDiaryAutosave({ entry, onSave, debounceMs = 1200 }: UseDiaryAutosaveProps) {
  const [draftOverrides, setDraftOverrides] = useState<Partial<DiaryEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const latestEntryRef = useRef<DiaryEntry | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track entry ID transitions to reset local draft cleanly
  const currentEntryId = entry?.id;
  const [prevEntryId, setPrevEntryId] = useState(currentEntryId);
  if (currentEntryId !== prevEntryId) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setPrevEntryId(currentEntryId);
    setDraftOverrides({});
    setHasUnsavedChanges(false);
  }

  // Merged live draft
  const currentDraft = useMemo(() => {
    if (!entry) return null;
    return { ...entry, ...draftOverrides };
  }, [entry, draftOverrides]);

  useEffect(() => {
    if (currentDraft) {
      latestEntryRef.current = currentDraft;
    }
  }, [currentDraft]);

  // Direct persistence function
  const persistEntry = useCallback(
    async (target: DiaryEntry) => {
      try {
        setIsSaving(true);
        await onSave({
          entryId: target.id,
          updates: {
            entryDate: target.entryDate,
            dateStr: target.dateStr,
            dayOfWeek: target.dayOfWeek,
            yearStr: target.yearStr,
            title: target.title,
            description: target.description,
            gratitude: target.gratitude,
            energyLevel: target.energyLevel,
            startTime: target.startTime,
            endTime: target.endTime,
            mood: target.mood,
            weather: target.weather,
            isHearted: target.isHearted,
            tags: target.tags,
          },
        });
        setIsSaving(false);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Failed to save entry:", err);
        setIsSaving(false);
      }
    },
    [onSave]
  );

  // Debounced auto-save on typing/content updates
  const updateDraft = useCallback(
    (fields: Partial<DiaryEntry>) => {
      setDraftOverrides((prev) => ({ ...prev, ...fields }));
      setHasUnsavedChanges(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const target = latestEntryRef.current;
        if (target) {
          const merged = { ...target, ...fields };
          persistEntry(merged);
        }
      }, debounceMs);
    },
    [debounceMs, persistEntry]
  );

  // Immediate save for instant actions (Date, Time, Weather, Mood, Heart, etc.)
  const saveAndApply = useCallback(
    async (fields: Partial<DiaryEntry>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setDraftOverrides((prev) => ({ ...prev, ...fields }));
      const target = latestEntryRef.current || currentDraft;
      if (!target) return;

      const merged = { ...target, ...fields };
      await persistEntry(merged);
    },
    [currentDraft, persistEntry]
  );

  // Manual or blur save
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!hasUnsavedChanges) return;
    const target = latestEntryRef.current || currentDraft;
    if (!target) return;

    await persistEntry(target);
  }, [currentDraft, hasUnsavedChanges, persistEntry]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Specific check if description/notes textarea specifically has unsaved changes
  const hasDescriptionChanges = useMemo(() => {
    if (!entry) return false;
    return draftOverrides.description !== undefined && draftOverrides.description !== entry.description;
  }, [entry, draftOverrides.description]);

  return {
    draftOverrides,
    currentDraft,
    updateDraft,
    saveAndApply,
    hasUnsavedChanges,
    hasDescriptionChanges,
    isSaving,
    saveNow,
  };
}
