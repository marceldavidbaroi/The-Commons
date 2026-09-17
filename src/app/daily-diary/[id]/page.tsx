import React from "react";
import { SingleDiaryEntryClient } from "@/components/diary/single-diary-entry-client";

export function generateStaticParams() {
  return [
    { id: "entry-1" },
    { id: "entry-2" },
    { id: "entry-3" },
    { id: "default" },
  ];
}

export default async function SingleDiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <SingleDiaryEntryClient targetId={resolvedParams.id} />;
}
