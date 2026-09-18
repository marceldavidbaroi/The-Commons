import React from "react";
import { SingleDiaryEntryClient } from "@/components/diary/single-diary-entry-client";

export default async function SingleDiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <SingleDiaryEntryClient targetId={resolvedParams.id} />;
}
