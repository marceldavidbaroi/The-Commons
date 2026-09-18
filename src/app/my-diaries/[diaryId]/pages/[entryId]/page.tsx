import React from "react";
import { MyDiaryEntryDetailsClient } from "@/components/diary/my-diary-entry-details-client";

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
