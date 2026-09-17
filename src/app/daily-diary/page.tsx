"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SingleDiaryEntryClient } from "@/components/diary/single-diary-entry-client";
import { useDiaryStore } from "@/stores/diary-store";
import { useDiariesOverview, useDiaryEntries } from "@/hooks/queries/use-diaries";

export default function DailyDiaryDefaultPage() {
  const router = useRouter();
  const currentEntryId = useDiaryStore((s) => s.currentEntryId);
  const localEntries = useDiaryStore((s) => s.entries);
  const { data: diaries = [], isLoading: isDiariesLoading } = useDiariesOverview();
  const { data: entries = [], isLoading: isEntriesLoading } = useDiaryEntries();

  const allEntries = entries.length > 0 ? entries : localEntries;
  const targetId = currentEntryId || allEntries[0]?.id;

  useEffect(() => {
    if (!isDiariesLoading && !isEntriesLoading && !targetId && diaries.length === 0) {
      router.replace("/my-diaries");
    }
  }, [isDiariesLoading, isEntriesLoading, targetId, diaries.length, router]);

  if (!targetId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center font-serif text-muted-foreground">
        <span>Opening library...</span>
      </div>
    );
  }

  return <SingleDiaryEntryClient targetId={targetId} />;
}

