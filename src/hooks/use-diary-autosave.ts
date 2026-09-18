"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { DiaryEntry } from "@/types/diary";

interface UseDiaryAutosaveProps {
  entry: DiaryEntry | null;
  onSave: (params: { entryId: string; updates: Partial<DiaryEntry> }) => Promise<unknown>;
}

export function useDiaryAutosave({ entry, onSave }: UseDiaryAutosaveProps) {
  const [draftOverrides, setDraftOverrides] = useState<Partial<DiaryEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const latestEntryRef = useRef<DiaryEntry | null>(null);

  // Track entry ID transitions to reset local draft cleanly
  const currentEntryId = entry?.id;
  const [prevEntryId, setPrevEntryId] = useState(currentEntryId);
  if (currentEntryId !== prevEntryId) {
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

  const updateDraft = useCallback((fields: Partial<DiaryEntry>) => {
    setDraftOverrides((prev) => ({ ...prev, ...fields }));
    setHasUnsavedChanges(true);
  }, []);

  const saveAndApply = useCallback(async (fields: Partial<DiaryEntry>) => {
    setDraftOverrides((prev) => ({ ...prev, ...fields }));
    const target = latestEntryRef.current || currentDraft;
    if (!target) return;

    const merged = { ...target, ...fields };
    try {
      setIsSaving(true);
      await onSave({
        entryId: merged.id,
        updates: {
          entryDate: merged.entryDate,
          dateStr: merged.dateStr,
          dayOfWeek: merged.dayOfWeek,
          yearStr: merged.yearStr,
          title: merged.title,
          description: merged.description,
          gratitude: merged.gratitude,
          energyLevel: merged.energyLevel,
          startTime: merged.startTime,
          endTime: merged.endTime,
          mood: merged.mood,
          weather: merged.weather,
          isHearted: merged.isHearted,
          tags: merged.tags,
        },
      });
      setIsSaving(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save entry:", err);
      setIsSaving(false);
    }
  }, [currentDraft, onSave]);

  const saveNow = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    const target = latestEntryRef.current || currentDraft;
    if (!target) return;

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
  }, [currentDraft, hasUnsavedChanges, onSave]);

  return {
    draftOverrides,
    currentDraft,
    updateDraft,
    saveAndApply,
    hasUnsavedChanges,
    isSaving,
    saveNow,
  };
}
