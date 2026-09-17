"use client";

import React from "react";
import SingleDiaryEntryPage from "./[id]/page";
import { useDiaryStore } from "@/stores/diary-store";

export default function DailyDiaryDefaultPage() {
  const currentEntryId = useDiaryStore((s) => s.currentEntryId) || "142";
  const paramsPromise = Promise.resolve({ id: currentEntryId });

  return <SingleDiaryEntryPage params={paramsPromise} />;
}
