"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Feather,
  ArrowLeft,
  Check,
  List,
  BarChart3,
  BookMarked,
  Plus,
  BookOpen,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommonsSealVector } from "@/components/brand/logo";
import { AuthGuard } from "@/components/auth/auth-guard";
import {
  useDiariesOverview,
  useDiaryEntries,
  useUpdateDiaryEntryMutation,
  useCreateDiaryEntryMutation,
  useDeleteDiaryEntryMutation,
  useToggleHeartEntryMutation,
} from "@/hooks/queries/use-diaries";
import { useDiaryAutosave } from "@/hooks/use-diary-autosave";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { EntryIndexView } from "./entry-index-view";
import { EntrySummaryView } from "./entry-summary-view";
import { ThemeVintageEditor } from "./theme-vintage-editor";
import { ThemeClassicEditor } from "./theme-classic-editor";
import { ThemeModernEditor } from "./theme-modern-editor";
import type { Diary, DiaryEntry, DiaryTheme } from "@/types/diary";

type ViewMode = "entry" | "index" | "summary";

export function SingleDiaryEntryClient({ targetId }: { targetId: string }) {
  const router = useRouter();

  // 1. TanStack Query
  const { data: diaries = [] } = useDiariesOverview();
  const { data: allFetchedEntries = [] } = useDiaryEntries();
  const updateEntryMutation = useUpdateDiaryEntryMutation();
  const createEntryMutation = useCreateDiaryEntryMutation();
  const deleteEntryMutation = useDeleteDiaryEntryMutation();
  const toggleHeartMutation = useToggleHeartEntryMutation();

  const [activeView, setActiveView] = useState<ViewMode>("entry");
  const [activeEntryId, setActiveEntryId] = useState<string>(targetId);
  const [isDeletePageOpen, setIsDeletePageOpen] = useState(false);
  const [targetEntryToDeleteId, setTargetEntryToDeleteId] = useState<string | null>(null);

  // Synchronize activeEntryId when route targetId changes
  const [prevTargetId, setPrevTargetId] = useState(targetId);
  if (targetId !== prevTargetId) {
    setPrevTargetId(targetId);
    setActiveEntryId(targetId);
  }

  const navigateToEntry = (targetPageId: string) => {
    setActiveEntryId(targetPageId);
    router.replace(`/daily-diary/${targetPageId}`, { scroll: false });
  };

  // Base entry from query cache (UUID-first)
  const baseEntry = useMemo(() => {
    const found = allFetchedEntries.find((e: DiaryEntry) => e.id === activeEntryId);
    if (found) return found;
    return allFetchedEntries[0] || null;
  }, [activeEntryId, allFetchedEntries]);

  // Autosave / Draft management
  const {
    currentDraft,
    updateDraft,
    saveAndApply,
    hasUnsavedChanges,
    isSaving,
    saveNow,
  } = useDiaryAutosave({
    entry: baseEntry,
    onSave: async ({ entryId, updates }) => {
      await updateEntryMutation.mutateAsync({ entryId, updates });
    },
  });

  const currentEntry = currentDraft;

  // Active diary
  const currentDiary = useMemo(() => {
    if (currentEntry) {
      const found = diaries.find((d: Diary) => d.id === currentEntry.diaryId);
      if (found) return found;
    }
    const directDiary = diaries.find((d: Diary) => d.id === targetId);
    if (directDiary) return directDiary;
    return diaries[0] || null;
  }, [currentEntry, targetId, diaries]);

  // Entries for this specific diary
  const diaryEntries = useMemo(() => {
    if (!currentDiary) return allFetchedEntries;
    return allFetchedEntries.filter((e: DiaryEntry) => e.diaryId === currentDiary.id);
  }, [allFetchedEntries, currentDiary]);

  const currentDiaryIndex = useMemo(() => {
    if (!currentEntry || diaryEntries.length === 0) return 0;
    const idx = diaryEntries.findIndex((e: DiaryEntry) => e.id === currentEntry.id);
    return idx >= 0 ? idx : 0;
  }, [currentEntry, diaryEntries]);

  const prevEntry = currentDiaryIndex < diaryEntries.length - 1 ? diaryEntries[currentDiaryIndex + 1] : null;
  const nextEntry = currentDiaryIndex > 0 ? diaryEntries[currentDiaryIndex - 1] : null;

  const theme: DiaryTheme = currentDiary?.theme || "vintage";

  const handleToggleHeart = () => {
    if (!currentEntry) return;
    const nextHeart = !currentEntry.isHearted;
    updateDraft({ isHearted: nextHeart });
    toggleHeartMutation.mutate({
      entryId: currentEntry.id,
      isHearted: nextHeart,
      diaryId: currentDiary?.id,
    });
  };

  const handleNewPage = async () => {
    if (!currentDiary) return;
    if (hasUnsavedChanges) await saveNow();

    try {
      const newPage = await createEntryMutation.mutateAsync({
        diaryId: currentDiary.id,
      });
      if (newPage?.id) {
        navigateToEntry(newPage.id);
        setActiveView("entry");
      }
    } catch (err) {
      console.error("Failed to create new page leaf:", err);
    }
  };

  const handleDeletePage = (entryIdToDelete?: string) => {
    const id = entryIdToDelete || currentEntry?.id;
    if (!id) return;
    setTargetEntryToDeleteId(id);
    setIsDeletePageOpen(true);
  };

  const confirmDeletePage = async () => {
    const idToDelete = targetEntryToDeleteId || currentEntry?.id;
    if (!idToDelete || !currentDiary) return;

    try {
      await deleteEntryMutation.mutateAsync({
        entryId: idToDelete,
        diaryId: currentDiary.id,
      });

      if (idToDelete === currentEntry?.id) {
        const remaining = diaryEntries.filter((e: DiaryEntry) => e.id !== idToDelete);
        if (remaining.length > 0) {
          navigateToEntry(remaining[0].id);
        } else {
          router.push("/my-diaries");
        }
      }
      setIsDeletePageOpen(false);
      setTargetEntryToDeleteId(null);
    } catch (err) {
      console.error("Failed to delete diary page:", err);
    }
  };

  if (!currentEntry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <Feather className="h-8 w-8 text-[#8C3A27] mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">Opening the Codex...</h2>
          <Link href="/my-diaries">
            <Button variant="outline" className="font-serif text-sm mt-2">
              Return to All Diaries
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const themePageBg =
    theme === "vintage"
      ? "bg-[#DED6C4] dark:bg-[#0A0F17] text-[#2C241E] dark:text-[#E2E8F0]"
      : theme === "classic"
      ? "bg-[#EAE5D9] dark:bg-[#0D141F] text-[#152B47] dark:text-[#E2ECF7]"
      : "bg-[#F1F5F9] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]";

  const themeHeaderBg =
    theme === "vintage"
      ? "bg-[#DED6C4]/95 dark:bg-[#0A0F17]/95 border-[#C8BEA8]/40 dark:border-[#223348]/40"
      : theme === "classic"
      ? "bg-[#EAE5D9]/95 dark:bg-[#0D141F]/95 border-[#D0C5B0]/50 dark:border-[#1E3048]/50"
      : "bg-[#F1F5F9]/95 dark:bg-[#090D16]/95 border-slate-200 dark:border-slate-800";

  const themeActiveTab =
    theme === "vintage"
      ? "bg-[#8C3A27] text-[#FAF6EE]"
      : theme === "classic"
      ? "bg-[#1E3A5F] text-[#FAF7EE] shadow-xs"
      : "bg-[#0F172A] dark:bg-[#38BDF8] text-white dark:text-[#090D16] shadow-xs";

  const themeSaveBtn =
    theme === "vintage"
      ? "bg-[#8C3A27] hover:bg-[#732E1E] text-[#FAF7F0]"
      : theme === "classic"
      ? "bg-[#1E3A5F] hover:bg-[#152B47] text-[#FAF7EE] border border-[#D4AF37]/30"
      : "bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] text-white dark:text-[#0F172A]";

  return (
    <AuthGuard>
      <div className={`min-h-screen ${themePageBg} flex flex-col transition-colors duration-200`}>
        {/* TOP TOOLBAR HEADER */}
        <header className={`sticky top-0 z-40 ${themeHeaderBg} px-3 sm:px-6 py-2 border-b`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Left: Back & Seal + Diary Name */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/my-diaries">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-current/20 cursor-pointer"
                  title="Return to All Diaries"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link
                href="/my-diaries"
                className="flex items-center gap-2 hover:opacity-85 transition-opacity"
                title="Return to My Diaries"
              >
                <CommonsSealVector size={22} markOnly className="shrink-0 hover:rotate-6 transition-transform" />
                <span className="text-xs font-serif font-bold tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
                  {currentDiary?.name}
                </span>
              </Link>
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
              {/* View Switcher */}
              <div className="inline-flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-full border border-current/15 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView("entry")}
                  className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeView === "entry" ? themeActiveTab : "opacity-70 hover:opacity-100"
                  }`}
                  title="Open Journal Page"
                >
                  <BookMarked className="h-3 w-3" />
                  <span>Journal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("index")}
                  className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeView === "index" ? themeActiveTab : "opacity-70 hover:opacity-100"
                  }`}
                  title="Table of Contents Index"
                >
                  <List className="h-3 w-3" />
                  <span>Index</span>
                  <span className="text-[10px] px-1 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/10">
                    {diaryEntries.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("summary")}
                  className={`h-6 px-2.5 rounded-full text-xs font-serif cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeView === "summary" ? themeActiveTab : "opacity-70 hover:opacity-100"
                  }`}
                  title="Summary Digest"
                >
                  <BarChart3 className="h-3 w-3" />
                  <span>Summary</span>
                </button>
              </div>

              {/* Prev / Next Page Turn */}
              {activeView === "entry" && (
                <div className="flex items-center bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded-full border border-current/15 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (prevEntry) navigateToEntry(prevEntry.id);
                    }}
                    disabled={!prevEntry}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="Turn back page"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>

                  <span className="text-[11px] font-serif italic px-1.5 opacity-90">
                    p. {currentEntry.pageNumber}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (nextEntry) navigateToEntry(nextEntry.id);
                    }}
                    disabled={!nextEntry}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="Turn forward page"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Return to All Books Library */}
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0"
                  title="Return to Books Library"
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="hidden sm:inline">All Books</span>
                </Button>
              </Link>

              {/* Fresh Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewPage}
                className="h-6.5 px-2 text-xs font-serif rounded-full flex items-center gap-1 border-current/20 bg-background/50 shrink-0 cursor-pointer"
                title="Turn to Fresh Blank Page"
              >
                <Plus className="h-3 w-3 text-[#8C3A27] dark:text-[#E59375]" />
                <span className="hidden md:inline">Fresh Page</span>
              </Button>

              {/* Top Save Button */}
              <Button
                size="sm"
                onClick={saveNow}
                disabled={isSaving || !hasUnsavedChanges}
                className={`h-6.5 px-3 rounded-full font-serif font-semibold text-xs shadow-xs gap-1.5 shrink-0 transition-all ${
                  hasUnsavedChanges
                    ? `${themeSaveBtn} cursor-pointer`
                    : "bg-black/5 dark:bg-white/5 text-muted-foreground border border-black/10 dark:border-white/10 opacity-80 cursor-default"
                }`}
                title={hasUnsavedChanges ? "Save changes" : "All changes saved"}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Saved</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* MAIN CANVAS */}
        <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
          {activeView === "entry" && (
            theme === "vintage" ? (
              <ThemeVintageEditor
                currentEntry={currentEntry}
                prevEntry={prevEntry}
                nextEntry={nextEntry}
                onNavigate={navigateToEntry}
                onNewPage={handleNewPage}
                onToggleHeart={handleToggleHeart}
                onDeletePage={() => handleDeletePage()}
                onUpdate={updateDraft}
                onSaveAndApply={saveAndApply}
                onSave={saveNow}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                isDeleting={deleteEntryMutation.isPending}
              />
            ) : theme === "classic" ? (
              <ThemeClassicEditor
                currentEntry={currentEntry}
                prevEntry={prevEntry}
                nextEntry={nextEntry}
                onNavigate={navigateToEntry}
                onNewPage={handleNewPage}
                onToggleHeart={handleToggleHeart}
                onDeletePage={() => handleDeletePage()}
                onUpdate={updateDraft}
                onSaveAndApply={saveAndApply}
                onSave={saveNow}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                isDeleting={deleteEntryMutation.isPending}
              />
            ) : (
              <ThemeModernEditor
                currentEntry={currentEntry}
                prevEntry={prevEntry}
                nextEntry={nextEntry}
                onNavigate={navigateToEntry}
                onNewPage={handleNewPage}
                onToggleHeart={handleToggleHeart}
                onDeletePage={() => handleDeletePage()}
                onUpdate={updateDraft}
                onSaveAndApply={saveAndApply}
                onSave={saveNow}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                isDeleting={deleteEntryMutation.isPending}
              />
            )
          )}

          {activeView === "index" && (
            <EntryIndexView
              currentDiary={currentDiary}
              diaryEntries={diaryEntries}
              currentEntry={currentEntry}
              theme={theme}
              onSelectEntry={(entryId) => {
                navigateToEntry(entryId);
                setActiveView("entry");
              }}
              onDeleteEntry={(entryId) => handleDeletePage(entryId)}
              onNewPage={handleNewPage}
              onClose={() => setActiveView("entry")}
            />
          )}

          {activeView === "summary" && (
            <EntrySummaryView
              currentDiary={currentDiary}
              diaryEntries={diaryEntries}
              theme={theme}
              onClose={() => setActiveView("entry")}
            />
          )}
        </main>

        {/* DELETE PAGE CONFIRMATION MODAL */}
        <DeleteConfirmationDialog
          open={isDeletePageOpen}
          onOpenChange={setIsDeletePageOpen}
          onConfirm={confirmDeletePage}
          title="Tear Out Leaf"
          description="Are you sure you wish to strike out and dissolve this leaf from your chronicle? This inscription cannot be recalled."
          confirmText="Tear Leaf"
          theme={theme}
        />
      </div>
    </AuthGuard>
  );
}
