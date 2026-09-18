import React from "react";
import { MyDiaryIndexClient } from "@/components/diary/my-diary-index-client";

export default async function MyDiaryIndexPage({
  params,
}: {
  params: Promise<{ diaryId: string }>;
}) {
  const resolvedParams = await params;
  return <MyDiaryIndexClient diaryId={resolvedParams.diaryId} />;
}
