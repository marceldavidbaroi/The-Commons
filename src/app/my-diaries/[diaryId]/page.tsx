import React from "react";
import { MyDiaryIndexClient } from "@/components/diary/my-diary-index-client";

export function generateStaticParams() {
  return [
    { diaryId: "diary-1" },
    { diaryId: "diary-2" },
    { diaryId: "diary-3" },
    { diaryId: "default" },
  ];
}

export default async function MyDiaryIndexPage({
  params,
}: {
  params: Promise<{ diaryId: string }>;
}) {
  const resolvedParams = await params;
  return <MyDiaryIndexClient diaryId={resolvedParams.diaryId} />;
}
