"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SingleDiaryEntryClient } from "@/components/diary/single-diary-entry-client";
import { useDiaryStore } from "@/stores/diary-store";
import { useDiariesOverview, useDiaryEntries } from "@/hooks/queries/use-diaries";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Loader2 } from "lucide-react";

function DailyDiaryContent() {
  const router = useRouter();
  const currentEntryId = useDiaryStore((s) => s.currentEntryId);
  const { data: diaries = [], isLoading: isDiariesLoading } = useDiariesOverview();
  const { data: entries = [], isLoading: isEntriesLoading } = useDiaryEntries();

  const targetId = currentEntryId || entries[0]?.id;

  useEffect(() => {
    if (!isDiariesLoading && !isEntriesLoading && !targetId && diaries.length === 0) {
      router.replace("/my-diaries");
    }
  }, [isDiariesLoading, isEntriesLoading, targetId, diaries.length, router]);

  if (isDiariesLoading || isEntriesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-serif text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#8C3A27] dark:text-[#E59375]" />
        <span>Opening archive...</span>
      </div>
    );
  }

  if (!targetId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-serif text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#8C3A27] dark:text-[#E59375]" />
        <span>Navigating to tome repository...</span>
      </div>
    );
  }

  return <SingleDiaryEntryClient targetId={targetId} />;
}

export default function DailyDiaryDefaultPage() {
  return (
    <AuthGuard>
      <DailyDiaryContent />
    </AuthGuard>
  );
}

