import React from "react";
import { MyDiaryEntryDetailsClient } from "@/components/diary/my-diary-entry-details-client";

export function generateStaticParams() {
  return [
    { diaryId: "diary-1", entryId: "entry-1" },
    { diaryId: "diary-2", entryId: "entry-2" },
    { diaryId: "diary-3", entryId: "entry-3" },
    { diaryId: "default", entryId: "default" },
  ];
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
