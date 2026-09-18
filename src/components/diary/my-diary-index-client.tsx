"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDiaryEntries, useCreateDiaryEntryMutation } from "@/hooks/queries/use-diaries";
import { Loader2 } from "lucide-react";

export function MyDiaryIndexClient({ diaryId }: { diaryId: string }) {
  const router = useRouter();
  const { data: fetchedEntries = [], isLoading } = useDiaryEntries(diaryId);
  const createEntryMutation = useCreateDiaryEntryMutation();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasTriggeredRef.current) return;

    const list = fetchedEntries;

    if (list.length > 0) {
      hasTriggeredRef.current = true;
      router.replace(`/my-diaries/${diaryId}/pages/${list[0].id}`);
    } else if (!createEntryMutation.isPending) {
      hasTriggeredRef.current = true;
      createEntryMutation
        .mutateAsync({ diaryId })
        .then((newEntry) => {
          if (newEntry?.id) {
            router.replace(`/my-diaries/${diaryId}/pages/${newEntry.id}`);
          }
        })
        .catch((err) => {
          console.error("Failed to initialize first entry:", err);
          hasTriggeredRef.current = false;
        });
    }
  }, [diaryId, fetchedEntries, isLoading, router, createEntryMutation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-serif text-muted-foreground gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[#8C3A27] dark:text-[#E59375]" />
      <span className="text-sm italic">Opening manuscript leaf...</span>
    </div>
  );
}
