"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDiaryStore } from "@/stores/diary-store";
import { useDiaryEntries, useCreateDiaryEntryMutation } from "@/hooks/queries/use-diaries";

export default function MyDiaryIndexPage({
  params,
}: {
  params: Promise<{ diaryId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { diaryId } = resolvedParams;

  const storeEntries = useDiaryStore((s) => s.entries);
  const { data: fetchedEntries = [], isLoading } = useDiaryEntries(diaryId);
  const createEntryMutation = useCreateDiaryEntryMutation();

  useEffect(() => {
    if (isLoading) return;

    const list = fetchedEntries.length > 0 ? fetchedEntries : storeEntries.filter((e) => e.diaryId === diaryId);

    if (list.length > 0) {
      router.replace(`/my-diaries/${diaryId}/pages/${list[0].id}`);
    } else {
      createEntryMutation.mutateAsync({ diaryId }).then((newEntry) => {
        router.replace(`/my-diaries/${diaryId}/pages/${newEntry.id}`);
      });
    }
  }, [diaryId, fetchedEntries, storeEntries, isLoading, createEntryMutation, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-serif text-muted-foreground">
      <span>Opening manuscript...</span>
    </div>
  );
}
