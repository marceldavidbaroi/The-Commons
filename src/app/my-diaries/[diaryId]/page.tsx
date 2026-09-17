import React from "react";
import { MyDiaryIndexClient } from "@/components/diary/my-diary-index-client";

import { INITIAL_DIARIES } from "@/types/diary";

export function generateStaticParams() {
  const generic = [
    "diary-1",
    "diary-2",
    "diary-3",
    "default",
    "diary-vintage-1",
    "diary-classic-1",
    "diary-modern-1",
  ];
  const initial = INITIAL_DIARIES.map((d) => d.id);
  const allIds = Array.from(new Set([...initial, ...generic]));

  return allIds.map((diaryId) => ({ diaryId }));
}

export default async function MyDiaryIndexPage({
  params,
}: {
  params: Promise<{ diaryId: string }>;
}) {
  const resolvedParams = await params;
  return <MyDiaryIndexClient diaryId={resolvedParams.diaryId} />;
}
