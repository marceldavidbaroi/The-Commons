"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Calendar, 
  Target, 
  BookOpen,
  Circle, 
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Badge } from "@/components/ui/badge";
import {
  List,
  ListItem,
  ListPrefix,
  ListContent,
  ListText,
  ListDescription,
  ListSuffix,
  ListEmpty,
} from "@/components/ui/list";
import { useAuthStore } from "@/stores/auth-store";
import { useDiariesOverview, useDiaryEntries } from "@/hooks/queries/use-diaries";
import { useGoalsQuery } from "@/hooks/queries/use-goals";
import { 
  DailyDiaryBookSvg, 
  GoalsCompassSvg, 
  CitizenPassportSvg, 
  TagsIndexPlateSvg 
} from "@/components/brand/magazine-illustrations";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  // Live queries for desk state
  const { data: diaries = [] } = useDiariesOverview();
  const defaultDiary = diaries[0];
  const { data: recentEntries = [] } = useDiaryEntries(defaultDiary?.id);
  const { data: goals = [] } = useGoalsQuery();

  const activeGoals = goals.filter((g) => g.status === "in_progress" || g.status === "pending");

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const displayName = profile?.username || user?.email?.split("@")[0] || "Citizen";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">

        {/* Top Minimalist Colophon Bar */}
        <SanctuaryNav subtitle="SANCTUARY DESK" />

        {/* Main Clean Workspace Canvas */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
          
          {/* 1. SIMPLE HEADER GREETING (No CTAs) */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-border/80">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
                Good day, {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 font-mono">
                <Calendar className="h-3.5 w-3.5 text-[#3368A0]" />
                <span>{todayDate}</span>
                <span className="text-border">•</span>
                <span className="italic font-serif text-muted-foreground/80">Littera Scripta Manet</span>
              </p>
            </div>
            
            <div className="text-xs font-mono text-muted-foreground hidden sm:block">
              Sanctuary Broadside Desk
            </div>
          </div>

          {/* 2. MODERN MINIMALIST TILES (Smaller, Modern Card Design) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Daily Journal */}
            <Link 
              href="/my-diaries" 
              className="group relative p-4 rounded-xl border border-border/80 bg-card hover:border-[#8C3A27]/50 hover:bg-[#8C3A27]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-xs cursor-pointer overflow-hidden"
            >
              <div className="h-10 w-10 rounded-lg bg-[#8C3A27]/10 text-[#8C3A27] dark:text-[#E59375] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <DailyDiaryBookSvg className="w-5 h-5" />
              </div>
              <span className="font-serif font-semibold text-xs sm:text-sm text-foreground group-hover:text-[#8C3A27] dark:group-hover:text-[#E59375] transition-colors text-center">
                Daily Journal
              </span>
            </Link>

            {/* Card 2: Goals & Roadmap */}
            <Link 
              href="/goals" 
              className="group relative p-4 rounded-xl border border-border/80 bg-card hover:border-[#3368A0]/50 hover:bg-[#3368A0]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-xs cursor-pointer overflow-hidden"
            >
              <div className="h-10 w-10 rounded-lg bg-[#3368A0]/10 text-[#3368A0] dark:text-[#66A3BF] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <GoalsCompassSvg className="w-5 h-5" />
              </div>
              <span className="font-serif font-semibold text-xs sm:text-sm text-foreground group-hover:text-[#3368A0] dark:group-hover:text-[#66A3BF] transition-colors text-center">
                Goals & Roadmap
              </span>
            </Link>

            {/* Card 3: Tag Taxonomy */}
            <Link 
              href="/tag-management" 
              className="group relative p-4 rounded-xl border border-border/80 bg-card hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-xs cursor-pointer overflow-hidden"
            >
              <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A78BFA] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <TagsIndexPlateSvg className="w-5 h-5" />
              </div>
              <span className="font-serif font-semibold text-xs sm:text-sm text-foreground group-hover:text-[#8B5CF6] dark:group-hover:text-[#A78BFA] transition-colors text-center">
                Tag Taxonomy
              </span>
            </Link>

            {/* Card 4: Citizen Passport */}
            <Link 
              href="/citizen-passport" 
              className="group relative p-4 rounded-xl border border-border/80 bg-card hover:border-[#6B8E23]/50 hover:bg-[#6B8E23]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-xs cursor-pointer overflow-hidden"
            >
              <div className="h-10 w-10 rounded-lg bg-[#6B8E23]/10 text-[#6B8E23] dark:text-[#A3C95A] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <CitizenPassportSvg className="w-5 h-5" />
              </div>
              <span className="font-serif font-semibold text-xs sm:text-sm text-foreground group-hover:text-[#6B8E23] dark:group-hover:text-[#A3C95A] transition-colors text-center">
                Citizen Passport
              </span>
            </Link>

          </section>

          {/* 3. WORKING DESK SPLIT: ACTIVE OBJECTIVES & RECENT LEAFS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            
            {/* Left 7 Cols: Active Milestones & Goals */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#3368A0]" />
                  <h2 className="font-serif font-bold text-base text-foreground">Active Milestones & Tasks</h2>
                  <span className="text-xs font-mono text-muted-foreground">({activeGoals.length})</span>
                </div>
                <Link href="/goals" className="text-xs font-mono text-[#3368A0] dark:text-[#66A3BF] hover:underline flex items-center gap-1">
                  <span>View Ledger</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {activeGoals.length === 0 ? (
                <ListEmpty
                  icon={<Target className="h-6 w-6" />}
                  title="No Active Goals"
                  description="Your horizon is clear. Open the ledger to view milestones."
                />
              ) : (
                <List variant="default" className="space-y-1.5">
                  {activeGoals.slice(0, 5).map((goal) => (
                    <Link key={goal.id} href={`/goals/${goal.id}`} className="block">
                      <ListItem variant="interactive" size="sm">
                        <ListPrefix>
                          <Circle className="h-3.5 w-3.5 text-[#3368A0]" />
                        </ListPrefix>
                        <ListContent>
                          <div className="flex items-center gap-2 flex-wrap">
                            <ListText>{goal.title}</ListText>
                            {goal.due_date && (
                              <span className="text-[10px] font-mono text-[#C48C28]">
                                Due {new Date(goal.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </ListContent>
                        <ListSuffix>
                          {goal.subgoals && goal.subgoals.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {goal.subgoals.filter((s) => s.status === "completed").length}/{goal.subgoals.length} subtasks
                            </Badge>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </ListSuffix>
                      </ListItem>
                    </Link>
                  ))}
                </List>
              )}
            </div>

            {/* Right 5 Cols: Recent Journal Leaves */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#8C3A27] dark:text-[#E59375]" />
                  <h2 className="font-serif font-bold text-base text-foreground">Recent Journal Leafs</h2>
                </div>
                <Link href="/my-diaries" className="text-xs font-mono text-[#8C3A27] dark:text-[#E59375] hover:underline flex items-center gap-1">
                  <span>All Tomes</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {recentEntries.length === 0 ? (
                <ListEmpty
                  icon={<BookOpen className="h-6 w-6" />}
                  title="No Leaves Inscribed"
                  description="Open your daily diary to view your journal history."
                />
              ) : (
                <List variant="bordered" className="divide-y divide-border/60">
                  {recentEntries.slice(0, 4).map((entry) => (
                    <Link 
                      key={entry.id} 
                      href={`/my-diaries/${entry.diaryId}/pages/${entry.id}`}
                      className="block"
                    >
                      <ListItem variant="bordered" size="sm" className="hover:bg-[#FAF6EE]/50 dark:hover:bg-muted/40">
                        <ListContent>
                          <div className="flex items-center justify-between">
                            <ListText className="font-serif font-medium">
                              {entry.title || `Leaf No. ${entry.pageNumber || "•"}`}
                            </ListText>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(entry.entryDate || entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          {entry.description && (
                            <ListDescription className="line-clamp-1 text-[11px]">
                              {entry.description}
                            </ListDescription>
                          )}
                        </ListContent>
                      </ListItem>
                    </Link>
                  ))}
                </List>
              )}
            </div>

          </section>

          {/* 4. TACTILE FOOTNOTE BULLETIN */}
          <div className="py-3 px-4 rounded-xl bg-muted/20 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#C48C28]" />
              <span className="font-serif italic text-foreground">
                &ldquo;The habit of writing every day creates an unshakeable anchor for the restless mind.&rdquo;
              </span>
            </div>
            <span className="text-[10px] tracking-wider uppercase text-[#3368A0] dark:text-[#66A3BF]">
              The Commons Sanctuary Desk
            </span>
          </div>

        </main>

        {/* Minimalist Colophon Footer */}
        <footer className="border-t border-border mt-auto bg-muted/20 py-4 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <div>THE COMMONS • CITIZEN SANCTUARY</div>
            <div className="flex items-center gap-4">
              <Link href="/my-diaries" className="hover:text-foreground">Diaries</Link>
              <span>•</span>
              <Link href="/goals" className="hover:text-foreground">Goals</Link>
              <span>•</span>
              <Link href="/tag-management" className="hover:text-foreground">Tags</Link>
              <span>•</span>
              <Link href="/citizen-passport" className="hover:text-foreground">Passport</Link>
              <span>•</span>
              <Link href="/settings" className="hover:text-foreground">Settings</Link>
            </div>
          </div>
        </footer>

      </div>
    </AuthGuard>
  );
}
