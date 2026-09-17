"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDiaryStore } from "@/stores/diary-store";

export default function MyDiaryIndexPage({
  params,
}: {
  params: Promise<{ diaryId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { diaryId } = resolvedParams;

  const entries = useDiaryStore((s) => s.entries);
  const createEntryStore = useDiaryStore((s) => s.createEntry);

  useEffect(() => {
    const diaryEntries = entries.filter((e) => e.diaryId === diaryId);
    if (diaryEntries.length > 0) {
      router.replace(`/my-diaries/${diaryId}/pages/${diaryEntries[0].id}`);
    } else {
      const newEntry = createEntryStore(diaryId);
      router.replace(`/my-diaries/${diaryId}/pages/${newEntry.id}`);
    }
  }, [diaryId, entries, createEntryStore, router]);

  return null;
}
