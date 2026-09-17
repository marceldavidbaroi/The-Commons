import React from "react";
import { MyDiaryEntryDetailsClient } from "@/components/diary/my-diary-entry-details-client";

import { INITIAL_DIARIES, INITIAL_ENTRIES } from "@/types/diary";

export function generateStaticParams() {
  const params: Array<{ diaryId: string; entryId: string }> = [];

  // 1. Initial entries mapped with their specific parent diaries
  for (const entry of INITIAL_ENTRIES) {
    params.push({ diaryId: entry.diaryId, entryId: entry.id });
    params.push({ diaryId: entry.diaryId, entryId: String(entry.pageNumber) });
    params.push({ diaryId: entry.diaryId, entryId: `page-${entry.pageNumber}` });
  }

  // 2. Cross-product for all initial diaries with all entry IDs and page numbers 1-20
  for (const diary of INITIAL_DIARIES) {
    for (const entry of INITIAL_ENTRIES) {
      params.push({ diaryId: diary.id, entryId: entry.id });
    }
    for (let i = 1; i <= 20; i++) {
      params.push({ diaryId: diary.id, entryId: String(i) });
      params.push({ diaryId: diary.id, entryId: `entry-${i}` });
      params.push({ diaryId: diary.id, entryId: `page-${i}` });
    }
    params.push({ diaryId: diary.id, entryId: "default" });
  }

  // 3. Fallback generic identifiers
  const genericDiaries = [
    "diary-1",
    "diary-2",
    "diary-3",
    "default",
    "diary-vintage-1",
    "diary-classic-1",
    "diary-modern-1",
  ];
  for (const gId of genericDiaries) {
    for (let i = 1; i <= 20; i++) {
      params.push({ diaryId: gId, entryId: String(i) });
      params.push({ diaryId: gId, entryId: `entry-${i}` });
      params.push({ diaryId: gId, entryId: `page-${i}` });
    }
    params.push({ diaryId: gId, entryId: "default" });
  }

  // Deduplicate
  const uniqueKeys = new Set<string>();
  const deduplicated: Array<{ diaryId: string; entryId: string }> = [];
  for (const p of params) {
    const key = `${p.diaryId}__${p.entryId}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      deduplicated.push(p);
    }
  }

  return deduplicated;
}

export default async function MyDiaryEntryDetailsPage({
  params,
}: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <MyDiaryEntryDetailsClient
      diaryId={resolvedParams.diaryId}
      entryId={resolvedParams.entryId}
    />
  );
}
