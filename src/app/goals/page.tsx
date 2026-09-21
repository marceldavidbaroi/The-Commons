"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Target,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Filter,
  Sparkles,
  Layers,
  Search,
  CheckCircle,
  Compass,
  Flame,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  ListFilter,
  X,
  AlertTriangle,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalStatusMutation,
  useDeleteGoalMutation,
} from "@/hooks/queries/use-goals";
import { useTagCategoriesQuery } from "@/hooks/queries/use-tag-queries";
import type { GoalType, GoalPriority, GoalStatus, GoalWithSubgoalsAndTags } from "@/types/goal.types";
import { calculateDueDateFromHorizon } from "@/types/goal.types";

const GOAL_TYPE_META: Record<
  GoalType,
  { label: string; pillClass: string; icon: string }
> = {
  daily: { label: "Daily Ritual", pillClass: "goal-pill-daily", icon: "☀️" },
  weekly: { label: "Weekly Horizon", pillClass: "goal-pill-weekly", icon: "🗓️" },
  monthly: { label: "Monthly Goal", pillClass: "goal-pill-monthly", icon: "🌙" },
  quarterly: { label: "Quarterly Target", pillClass: "goal-pill-milestone", icon: "🏛️" },
  yearly: { label: "Annual Vision", pillClass: "goal-pill-milestone", icon: "🔭" },
  milestone: { label: "Major Milestone", pillClass: "goal-pill-milestone", icon: "🚩" },
  habit: { label: "Recurring Habit", pillClass: "goal-pill-habit", icon: "🔄" },
};

const PRIORITY_META: Record<
  GoalPriority,
  { label: string; badgeClass: string }
> = {
  critical: {
    label: "Critical",
    badgeClass: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
  },
  high: {
    label: "High",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-muted/40 text-muted-foreground border-border",
  },
  low: {
    label: "Gentle",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  },
};

type DueFilter = "all" | "today" | "tomorrow" | "this_week" | "overdue" | "unscheduled";
type SortOption = "due_date" | "priority" | "newest" | "alphabetical";

function getDueStatus(dueDateStr: string | null | undefined, isCompleted: boolean) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (isCompleted) {
    return {
      status: "completed",
      label: `Due ${due.toLocaleDateString()}`,
      badgeClass: "bg-muted/30 text-muted-foreground border-border/60",
    };
  }
  if (diffDays < 0) {
    return {
      status: "overdue",
      label: `Overdue (${Math.abs(diffDays)}d)`,
      badgeClass: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900 font-semibold",
    };
  }
  if (diffDays === 0) {
    return {
      status: "today",
      label: "Due Today",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900 font-semibold",
    };
  }
  if (diffDays === 1) {
    return {
      status: "tomorrow",
      label: "Due Tomorrow",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900",
    };
  }
  if (diffDays <= 7) {
    return {
      status: "this_week",
      label: `Due in ${diffDays}d`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
    };
  }
  return {
    status: "future",
    label: `Due ${due.toLocaleDateString()}`,
    badgeClass: "bg-muted/40 text-muted-foreground border-border",
  };
}

export default function GoalsPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<GoalWithSubgoalsAndTags | null>(null);

  // Filters State
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "all">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("due_date");

  // Create Form State
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("daily");
  const [priority, setPriority] = useState<GoalPriority>("normal");
  const [dueDate, setDueDate] = useState<string>("");

  // Queries & Mutations
  const { data: goals = [], isLoading } = useGoalsQuery();
  const { data: tagCategories = [] } = useTagCategoriesQuery("goals");
  const createGoalMutation = useCreateGoalMutation();
  const updateStatusMutation = useUpdateGoalStatusMutation();
  const deleteGoalMutation = useDeleteGoalMutation();

  const handleOpenCreate = (defaultType: GoalType = "daily") => {
    setTitle("");
    setGoalType(defaultType);
    setPriority("normal");
    setDueDate(calculateDueDateFromHorizon(defaultType, new Date()));
    setIsCreateOpen(true);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createGoalMutation.mutateAsync({
      title: title.trim(),
      type: goalType,
      priority,
      status: "in_progress",
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });

    setIsCreateOpen(false);
  };

  const handleToggleStatus = (e: React.MouseEvent, goalId: string, currentStatus: GoalStatus) => {
    e.stopPropagation();
    const nextStatus: GoalStatus = currentStatus === "completed" ? "in_progress" : "completed";
    updateStatusMutation.mutate({ id: goalId, status: nextStatus });
  };

  const handleDeleteClick = (e: React.MouseEvent, goal: GoalWithSubgoalsAndTags) => {
    e.stopPropagation();
    setGoalToDelete(goal);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    await deleteGoalMutation.mutateAsync(goalToDelete.id);
    setGoalToDelete(null);
  };

  // Metrics calculation
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Due counts for task badges
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dueCounts = useMemo(() => {
    let todayCount = 0;
    let tomorrowCount = 0;
    let thisWeekCount = 0;
    let overdueCount = 0;
    let unscheduledCount = 0;

    activeGoals.forEach((g) => {
      if (!g.due_date) {
        if (g.type === "daily" || g.type === "habit") {
          todayCount++;
        } else {
          unscheduledCount++;
        }
        return;
      }
      const due = new Date(g.due_date);
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdueCount++;
      } else if (diffDays === 0) {
        todayCount++;
      } else if (diffDays === 1) {
        tomorrowCount++;
      } else if (diffDays <= 7) {
        thisWeekCount++;
      }
    });

    return { todayCount, tomorrowCount, thisWeekCount, overdueCount, unscheduledCount };
  }, [activeGoals, today]);

  // Filtered & Sorted Goals
  const filteredGoals = useMemo(() => {
    return goals
      .filter((g) => {
        const isDone = g.status === "completed";

        // Status Filter
        if (statusFilter === "active" && isDone) return false;
        if (statusFilter === "completed" && !isDone) return false;

        // Due Filter
        if (dueFilter !== "all") {
          if (!g.due_date) {
            if (dueFilter === "today" && (g.type === "daily" || g.type === "habit") && !isDone) {
              // Daily habits count for today
            } else if (dueFilter === "unscheduled") {
              // Unscheduled
            } else {
              return false;
            }
          } else {
            const due = new Date(g.due_date);
            const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
            const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (dueFilter === "today") {
              if (diffDays !== 0 && g.type !== "daily" && g.type !== "habit") return false;
            } else if (dueFilter === "tomorrow") {
              if (diffDays !== 1) return false;
            } else if (dueFilter === "this_week") {
              if (diffDays < 0 || diffDays > 7) return false;
            } else if (dueFilter === "overdue") {
              if (diffDays >= 0 || isDone) return false;
            } else if (dueFilter === "unscheduled") {
              return false;
            }
          }
        }

        // Type Filter
        if (typeFilter !== "all" && g.type !== typeFilter) {
          return false;
        }

        // Priority Filter
        if (priorityFilter !== "all" && g.priority !== priorityFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = g.title.toLowerCase().includes(q);
          const matchDesc = g.description?.toLowerCase().includes(q);
          const matchTags = g.tags?.some((t) => t.tag?.name.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priorityWeights: Record<GoalPriority, number> = {
          critical: 4,
          high: 3,
          normal: 2,
          low: 1,
        };

        if (sortBy === "priority") {
          return priorityWeights[b.priority] - priorityWeights[a.priority];
        }

        if (sortBy === "due_date") {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }

        if (sortBy === "alphabetical") {
          return a.title.localeCompare(b.title);
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [goals, statusFilter, dueFilter, typeFilter, priorityFilter, searchQuery, sortBy, today]);

  const hasActiveFilters =
    dueFilter !== "all" ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "active" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setDueFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setStatusFilter("active");
    setSearchQuery("");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        {/* Top Colophon Navigation */}
        <SanctuaryNav subtitle="HORIZONS & OBJECTIVES COMPASS" />

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
          {/* Top Header & Compact Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Link
                  href="/home"
                  className="hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Sanctuary Desk</span>
                </Link>
                <span>/</span>
                <span className="text-[#3368A0] dark:text-[#66A3BF] font-semibold flex items-center gap-1">
                  <Compass className="h-3 w-3" />
                  Horizon Compass
                </span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Goals & Tasks Ledger
                </h1>
                {/* Compact Progress Badge */}
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-muted/30 border border-border/70 rounded-full px-3 py-1">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-bold text-foreground">{activeGoals.length}</span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">Done:</span>
                  <span className="font-bold text-[#4A7C59] dark:text-[#84A98C]">
                    {completedGoals}
                  </span>
                  <span className="text-border">|</span>
                  <span className="font-bold text-[#3368A0] dark:text-[#66A3BF]">
                    {completionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleOpenCreate("daily")}
                className="bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-xs tracking-wide rounded-md gap-2 h-9 px-4 shadow-xs cursor-pointer transition-all duration-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Inscribe Goal</span>
              </Button>
            </div>
          </div>

          {/* STREAMLINED TASK & DUE DATE FILTER BAR */}
          <div className="space-y-3 bg-card border border-border/80 rounded-xl p-3 sm:p-4">
            {/* Row 1: Day-wise Due Date Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
                <button
                  onClick={() => setDueFilter("all")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                    dueFilter === "all"
                      ? "bg-[#3368A0] text-white border-[#3368A0] font-semibold"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  All ({goals.length})
                </button>

                <button
                  onClick={() => setDueFilter("today")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    dueFilter === "today"
                      ? "bg-[#2C5E3B] text-white border-[#2C5E3B] font-semibold dark:bg-[#1E432A]"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span>☀️ Today</span>
                  {dueCounts.todayCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {dueCounts.todayCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDueFilter("tomorrow")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    dueFilter === "tomorrow"
                      ? "bg-[#1E3A8A] text-white border-[#1E3A8A] font-semibold"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span>Tomorrow</span>
                  {dueCounts.tomorrowCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {dueCounts.tomorrowCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDueFilter("this_week")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    dueFilter === "this_week"
                      ? "bg-[#4A7C59] text-white border-[#4A7C59] font-semibold"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span>This Week</span>
                  {dueCounts.thisWeekCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {dueCounts.thisWeekCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDueFilter("overdue")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    dueFilter === "overdue"
                      ? "bg-red-700 text-white border-red-700 font-semibold"
                      : dueCounts.overdueCount > 0
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span>⚠️ Overdue</span>
                  {dueCounts.overdueCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                      {dueCounts.overdueCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDueFilter("unscheduled")}
                  className={`px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                    dueFilter === "unscheduled"
                      ? "bg-muted text-foreground border-border font-semibold"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  Unscheduled ({dueCounts.unscheduledCount})
                </button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center rounded-md border border-border/80 bg-background p-0.5 text-xs font-mono">
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    statusFilter === "active"
                      ? "bg-[#3368A0] text-white font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    statusFilter === "completed"
                      ? "bg-[#4A7C59] text-white font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    statusFilter === "all"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {/* Row 2: Search & Faceted Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-border/60">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks by title, tag, or description..."
                  className="pl-8 h-8 text-xs font-mono rounded-md border-border bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters & Sort */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                {/* Type Horizon Dropdown */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="all">All Horizons</option>
                  <option value="daily">☀️ Daily Rituals</option>
                  <option value="habit">🔄 Habits</option>
                  <option value="weekly">🗓️ Weekly</option>
                  <option value="monthly">🌙 Monthly</option>
                  <option value="quarterly">🏛️ Quarterly</option>
                  <option value="milestone">🚩 Milestones</option>
                </select>

                {/* Priority Dropdown */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="normal">⚪ Normal</option>
                  <option value="low">🟢 Gentle</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none cursor-pointer"
                >
                  <option value="due_date">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="alphabetical">Sort: A-Z</option>
                </select>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 px-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Goal Cards List */}
          {isLoading ? (
            <div className="py-16 text-center text-xs font-mono text-muted-foreground bg-card border border-border/80 rounded-xl">
              Retrieving objectives from horizon ledger...
            </div>
          ) : filteredGoals.length > 0 ? (
            <div className="space-y-2.5">
              {filteredGoals.map((goal) => {
                const isDone = goal.status === "completed";
                const typeMeta = GOAL_TYPE_META[goal.type] || GOAL_TYPE_META.daily;
                const priorityMeta = PRIORITY_META[goal.priority] || PRIORITY_META.normal;
                const dueInfo = getDueStatus(goal.due_date, isDone);
                const subgoals = goal.subgoals || [];
                const completedSub = subgoals.filter((s) => s.status === "completed").length;
                const subProgress =
                  subgoals.length > 0 ? Math.round((completedSub / subgoals.length) * 100) : 0;

                return (
                  <div
                    key={goal.id}
                    onClick={() => router.push(`/goals/${goal.id}`)}
                    className={`goal-card-surface p-3.5 sm:p-4 flex items-start justify-between gap-3.5 cursor-pointer transition-all hover:border-[#3368A0]/50 ${
                      isDone ? "opacity-75 bg-muted/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox Status Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(e, goal.id, goal.status)}
                        className="mt-0.5 text-muted-foreground hover:text-foreground transition-transform active:scale-95 cursor-pointer shrink-0"
                        title={isDone ? "Mark as active" : "Mark as completed"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-[#4A7C59] dark:text-[#84A98C]" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-[#3368A0]" />
                        )}
                      </button>

                      {/* Main Goal Information */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Title and Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-serif text-base sm:text-lg font-bold text-foreground break-words transition-colors ${
                              isDone ? "line-through text-muted-foreground" : "hover:text-[#3368A0]"
                            }`}
                          >
                            {goal.title}
                          </span>

                          {/* Horizon Pill */}
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium ${typeMeta.pillClass}`}
                          >
                            {typeMeta.icon} {typeMeta.label}
                          </span>

                          {/* Due Date Status Badge */}
                          {dueInfo && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium flex items-center gap-1 ${dueInfo.badgeClass}`}
                            >
                              <Calendar className="h-3 w-3" />
                              {dueInfo.label}
                            </span>
                          )}

                          {/* Priority Badge */}
                          {goal.priority !== "normal" && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium uppercase ${priorityMeta.badgeClass}`}
                            >
                              {priorityMeta.label}
                            </span>
                          )}
                        </div>

                        {/* Description (if present) */}
                        {goal.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 font-serif">
                            {goal.description}
                          </p>
                        )}

                        {/* Milestone Sub-nodes Micro Progress */}
                        {subgoals.length > 0 && (
                          <div className="space-y-1 pt-0.5 max-w-xs">
                            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                              <span>
                                {completedSub}/{subgoals.length} subtasks done
                              </span>
                              <span className="font-semibold">{subProgress}%</span>
                            </div>
                            <div className="w-full h-1 goal-progress-track">
                              <div
                                className="h-full goal-progress-fill"
                                style={{ width: `${subProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Tags & Metadata Footer */}
                        {goal.tags && goal.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {goal.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 border border-border/80 text-foreground"
                              >
                                #{t.tag?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, goal)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Blank Slate */
            <div className="border border-dashed border-border/80 bg-card rounded-xl p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#3368A0]/10 border border-[#3368A0]/20 flex items-center justify-center text-[#3368A0] dark:text-[#66A3BF]">
                <Target className="h-6 w-6" />
              </div>

              <div className="space-y-1 max-w-md">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {hasActiveFilters ? "No Matching Tasks Found" : "No Goals or Tasks Yet"}
                </h3>
                <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                  {hasActiveFilters
                    ? "Try adjusting your filters, due date scope, or search term."
                    : "Inscribe your daily habits, scheduled tasks, or milestones to start executing with clarity."}
                </p>
              </div>

              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="font-mono text-xs rounded-md border-border h-8 px-4 cursor-pointer"
                >
                  Clear All Filters
                </Button>
              ) : (
                <Button
                  onClick={() => handleOpenCreate("daily")}
                  className="bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-xs rounded-md gap-2 h-9 px-4 shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Inscribe First Goal</span>
                </Button>
              )}
            </div>
          )}
        </main>

        {/* ERGONOMIC INSCRIBE GOAL DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md bg-card border border-border shadow-lg rounded-xl p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#3368A0] dark:text-[#66A3BF] font-semibold">
                <Compass className="h-3.5 w-3.5" />
                <span>SANCTUARY COMPASS • INSCRIBE OBJECTIVE</span>
              </div>
              <DialogTitle className="font-serif text-2xl font-bold text-foreground">
                Inscribe New Objective
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-serif">
                Define your task or intention with optional target date and priority.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateGoal} className="space-y-4 pt-1">
              {/* Goal Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-foreground uppercase tracking-wide block">
                  Task / Objective Title <span className="text-[#8C3A27]">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Complete draft review or 30 min reading"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-md border-border font-serif text-sm h-11 focus-visible:ring-1 focus-visible:ring-[#3368A0] bg-background"
                  required
                  autoFocus
                />
              </div>

              {/* Due Date Row with Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider block">
                    Target Due Date
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setDueDate(new Date().toISOString().split("T")[0])}
                      className="text-[#3368A0] dark:text-[#66A3BF] hover:underline cursor-pointer"
                    >
                      Today
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setDueDate(d.toISOString().split("T")[0]);
                      }}
                      className="text-[#3368A0] dark:text-[#66A3BF] hover:underline cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setDueDate(d.toISOString().split("T")[0]);
                      }}
                      className="text-[#3368A0] dark:text-[#66A3BF] hover:underline cursor-pointer"
                    >
                      Next Week
                    </button>
                  </div>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-md border-border font-mono text-xs h-9 bg-background"
                />
              </div>

              {/* Horizon & Priority Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider block">
                    Horizon Scope
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => {
                      const newType = e.target.value as GoalType;
                      setGoalType(newType);
                      setDueDate(calculateDueDateFromHorizon(newType, new Date()));
                    }}
                    className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs font-mono outline-none cursor-pointer"
                  >
                    <option value="daily">☀️ Daily Ritual</option>
                    <option value="habit">🔄 Recurring Habit</option>
                    <option value="weekly">🗓️ Weekly Horizon</option>
                    <option value="monthly">🌙 Monthly Goal</option>
                    <option value="quarterly">🏛️ Quarterly Target</option>
                    <option value="yearly">🔭 Annual Vision</option>
                    <option value="milestone">🚩 Major Milestone</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider block">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as GoalPriority)}
                    className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs font-mono outline-none cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                    <option value="low">Gentle</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="font-mono text-xs rounded-md border-border h-9 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || createGoalMutation.isPending}
                  className="bg-[#3368A0] hover:bg-[#285380] text-white font-serif text-xs rounded-md h-9 px-5 cursor-pointer"
                >
                  {createGoalMutation.isPending ? "Inscribing..." : "Inscribe Goal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CONFIRMATION DIALOG: STRIKE GOAL */}
        <Dialog open={Boolean(goalToDelete)} onOpenChange={(open) => !open && setGoalToDelete(null)}>
          <DialogContent className="sm:max-w-md bg-card border border-border shadow-lg rounded-xl p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>CONFIRM DELETION • SANCTUARY ARCHIVE</span>
              </div>
              <DialogTitle className="font-serif text-xl font-bold text-foreground">
                Strike Objective from Horizon?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-serif leading-relaxed">
                Are you sure you wish to delete <span className="font-semibold text-foreground">"{goalToDelete?.title}"</span>? This will permanently remove it and all associated milestone steps from your private ledger.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoalToDelete(null)}
                className="font-mono text-xs rounded-md border-border h-9 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deleteGoalMutation.isPending}
                onClick={handleConfirmDelete}
                className="bg-red-700 hover:bg-red-800 text-white font-serif text-xs rounded-md h-9 px-5 cursor-pointer shadow-xs"
              >
                {deleteGoalMutation.isPending ? "Striking..." : "Strike from Horizon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Editorial Colophon Footer */}
        <footer className="border-t border-border/80 mt-auto bg-card/40 py-5 px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <div>
              <span className="font-bold text-foreground">THE COMMONS</span> — Sanctuary Horizons & Goals Ledger.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/home" className="hover:text-foreground">Sanctuary Home</Link>
              <span>•</span>
              <Link href="/my-diaries" className="hover:text-foreground">Daily Journal</Link>
              <span>•</span>
              <Link href="/tag-management" className="hover:text-foreground">Taxonomy</Link>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
