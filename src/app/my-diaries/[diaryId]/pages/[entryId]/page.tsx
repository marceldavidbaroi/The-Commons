import React, { Suspense } from "react";
import { MyDiaryEntryDetailsClient } from "@/components/diary/my-diary-entry-details-client";

export default async function MyDiaryEntryDetailsPage({
  params,
}: {
  params: Promise<{ diaryId: string; entryId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={null}>
      <MyDiaryEntryDetailsClient
        diaryId={resolvedParams.diaryId}
        entryId={resolvedParams.entryId}
      />
    </Suspense>
  );
}
