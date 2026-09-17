import React from "react";
import { SingleDiaryEntryClient } from "@/components/diary/single-diary-entry-client";

import { INITIAL_ENTRIES, INITIAL_DIARIES } from "@/types/diary";

export function generateStaticParams() {
  const generic = [
    "entry-1",
    "entry-2",
    "entry-3",
    "entry-4",
    "entry-5",
    "entry-6",
    "default",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
  ];
  const fromEntries = INITIAL_ENTRIES.flatMap((e) => [
    e.id,
    String(e.pageNumber),
    `page-${e.pageNumber}`,
  ]);
  const fromDiaries = INITIAL_DIARIES.map((d) => d.id);
  const allIds = Array.from(new Set([...fromEntries, ...fromDiaries, ...generic]));

  return allIds.map((id) => ({ id }));
}

export default async function SingleDiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <SingleDiaryEntryClient targetId={resolvedParams.id} />;
}
