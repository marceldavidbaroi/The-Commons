"use client";

import React from "react";
import { List, Heart, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PencilDelete } from "./diary-icons";
import type { DiaryEntry, Diary, DiaryTheme } from "@/types/diary";

interface EntryIndexViewProps {
  currentDiary: Diary | null;
  diaryEntries: DiaryEntry[];
  currentEntry: DiaryEntry;
  theme?: DiaryTheme;
  onSelectEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewPage: () => void;
  onClose: () => void;
}

export function EntryIndexView({
  currentDiary,
  diaryEntries,
  currentEntry,
  theme = "vintage",
  onSelectEntry,
  onDeleteEntry,
  onNewPage,
  onClose,
}: EntryIndexViewProps) {
  if (theme === "vintage") {
    return (
      <div className="w-full relative torn-sheet-shadow">
        <div className="w-full relative old-paper-bg torn-parchment-sheet p-5 sm:p-8 md:p-10 border border-[#D5CAA8]/70 dark:border-[#2A3B4E]/70 select-text space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8CCB0] dark:border-[#223348] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
              <h2 className="font-handwriting text-2xl font-bold text-[#2A1D13] dark:text-[#FAF4EB]">
                {currentDiary?.name || "Chronicle"} — Table of Leaves
              </h2>
            </div>
            <span className="font-handwriting text-sm font-bold text-[#7A6855] dark:text-[#8FA5B8]">
              {diaryEntries.length} Leaves Inscribed
            </span>
          </div>

          <div className="divide-y divide-[#D8CCB0]/60 dark:divide-[#223348]/60 max-h-[60vh] overflow-y-auto pr-1">
            {diaryEntries.map((entry: DiaryEntry) => {
              const isCurrent = entry.id === currentEntry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className={`py-3 px-2 rounded-sm cursor-pointer flex items-center justify-between transition-colors ${
                    isCurrent ? "bg-[#EDE5D2]/80 dark:bg-[#1A2838]/80" : "hover:bg-[#EDE5D2]/40 dark:hover:bg-[#1A2838]/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-handwriting">
                      <span className="font-bold text-[#8C3A27] dark:text-[#E59375] text-sm">
                        Leaf #{entry.pageNumber}
                      </span>
                      <span className="text-[#544332] dark:text-[#B4C5D6] font-semibold text-sm">
                        {entry.dayOfWeek}, {entry.dateStr}
                      </span>
                      {entry.isHearted && (
                        <span className="text-[#8C3A27] dark:text-[#E59375] text-xs">♥ Marked</span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] text-[#8C3A27] dark:text-amber-300 font-bold uppercase">
                          (Open Page)
                        </span>
                      )}
                    </div>
                    <p className="font-handwriting text-lg font-bold text-[#1E2536] dark:text-[#F3EDE2] line-clamp-1">
                      {entry.title || "Untitled Inscription"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      title="Strike out leaf"
                    >
                      <PencilDelete theme="vintage" />
                    </button>
                    <span className="font-handwriting text-sm font-bold text-[#8C3A27] dark:text-[#E59375] hover:underline">
                      Turn leaf ▸
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#D8CCB0] dark:border-[#223348] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="font-handwriting text-base text-[#8C3A27] dark:text-amber-300 hover:underline cursor-pointer"
            >
              Return to Open Leaf
            </button>
            <button
              type="button"
              onClick={onNewPage}
              className="torn-paper px-3 py-1 bg-[#8C3A27] text-[#FAF6EE] font-handwriting text-sm flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Inscribe New Leaf</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "classic") {
    return (
      <div className="w-full relative shadow-xl rounded-lg overflow-hidden border border-[#D0C5B0] dark:border-[#1E3048]">
        <div className="bg-[#FBF9F2] dark:bg-[#121A26] p-5 sm:p-8 md:p-10 relative space-y-4">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-3">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="font-serif text-xl font-bold text-[#152B47] dark:text-[#FAF7EE]">
                {currentDiary?.name || "Chronicle"} — Table of Contents
              </h2>
            </div>
            <span className="font-mono text-xs text-[#AA8520]">
              {diaryEntries.length} Pages Inscribed
            </span>
          </div>

          <div className="divide-y divide-[#D0C5B0]/50 dark:divide-[#1E3048]/50 max-h-[60vh] overflow-y-auto pr-1">
            {diaryEntries.map((entry: DiaryEntry) => {
              const isCurrent = entry.id === currentEntry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className={`py-3 px-2 rounded cursor-pointer flex items-center justify-between transition-colors ${
                    isCurrent ? "bg-[#EDE7D6]/70 dark:bg-[#1A2636]/70" : "hover:bg-[#EDE7D6]/30 dark:hover:bg-[#1A2636]/30"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-[#AA8520]">p. {entry.pageNumber}</span>
                      <span className="text-[#152B47] dark:text-[#CBD5E1] font-semibold font-serif">
                        {entry.dayOfWeek}, {entry.dateStr}
                      </span>
                      {entry.isHearted && <Heart className="h-3 w-3 text-[#D4AF37] fill-current" />}
                      {isCurrent && (
                        <span className="text-[10px] text-amber-500 font-bold uppercase">(Active)</span>
                      )}
                    </div>
                    <p className="font-serif text-base font-bold text-[#152B47] dark:text-[#E2ECF7] line-clamp-1">
                      {entry.title || "Untitled Reflection"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      title="Delete page"
                    >
                      <PencilDelete theme="classic" />
                    </button>
                    <span className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] hover:underline">
                      Turn to page ▸
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#D4AF37]/40 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-serif text-[#1E3A5F] dark:text-[#D4AF37] hover:underline cursor-pointer"
            >
              Return to Open Page
            </button>
            <button
              type="button"
              onClick={onNewPage}
              className="px-3 py-1 bg-[#1E3A5F] text-[#FAF7EE] border border-[#D4AF37]/40 font-serif text-xs rounded font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>New Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-sky-500" />
          <h2 className="font-sans text-xl font-bold text-slate-900 dark:text-white">
            {currentDiary?.name || "Diary"} — Table of Contents
          </h2>
        </div>
        <span className="font-mono text-xs text-slate-500">
          {diaryEntries.length} Pages
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto pr-1">
        {diaryEntries.map((entry: DiaryEntry) => {
          const isCurrent = entry.id === currentEntry.id;
          return (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className={`py-3 px-2 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                isCurrent ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-sky-500">p. {entry.pageNumber}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">
                    {entry.dayOfWeek}, {entry.dateStr}
                  </span>
                  {entry.isHearted && <Heart className="h-3 w-3 text-rose-500 fill-current" />}
                  {isCurrent && (
                    <span className="text-[10px] text-sky-500 font-bold uppercase">(Active)</span>
                  )}
                </div>
                <p className="font-sans text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {entry.title || "Untitled Entry"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEntry(entry.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete page"
                >
                  <PencilDelete theme="modern" />
                </button>
                <span className="text-xs font-sans text-sky-500 hover:underline font-medium">
                  Go to page ▸
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-sans text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
        >
          Return to Entry
        </button>
        <Button size="sm" onClick={onNewPage} className="h-8 text-xs font-sans rounded-lg gap-1">
          <Plus className="h-3 w-3" />
          <span>New Page</span>
        </Button>
      </div>
    </div>
  );
}
