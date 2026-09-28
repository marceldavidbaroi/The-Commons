"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Filter,
  Sparkles,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  Inbox,
  CalendarDays,
  X,
  Tag as TagIcon,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ListFilter,
  ListFilterSearch,
  ListFilterGroup,
  ListFilterChip,
  ListFilterCount,
} from "@/components/ui/list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useTasksQuery,
  useCreateTaskMutation,
  useToggleTaskStatusMutation,
  useDeleteTaskMutation,
} from "@/hooks/queries/use-tasks";
import { useTagCategoriesQuery } from "@/hooks/queries/use-tag-queries";
import type { TaskPriority, TaskStatus, TaskWithDetails } from "@/types/tasks";

type ViewTab = "all" | "today" | "upcoming" | "unscheduled" | "completed";
type PriorityFilter = "all" | TaskPriority;

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dotClass: "bg-red-500",
  },
  high: {
    label: "High",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-muted/40 text-muted-foreground border-border",
    dotClass: "bg-muted-foreground/50",
  },
  low: {
    label: "Low",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
};

export default function TasksListPage() {
  const router = useRouter();

  // Queries & Mutations
  const { data: tasks = [], isLoading } = useTasksQuery({ include_subtasks: true });
  const { data: tagCategories = [] } = useTagCategoriesQuery("tasks");
  const createTaskMutation = useCreateTaskMutation();
  const toggleStatusMutation = useToggleTaskStatusMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  // Unified Filter State
  const [activeTab, setActiveTab] = useState<ViewTab>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  // Quick Inscribe Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("normal");
  const [newScheduledDate, setNewScheduledDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newTimeEstimate, setNewTimeEstimate] = useState<string>("");
  const [newTagIds, setNewTagIds] = useState<number[]>([]);

  // Fast Quick-Add Inline Input
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter root tasks (subtasks are rendered under parent in details)
  const rootTasks = useMemo(() => {
    return tasks.filter((t) => !t.parent_id);
  }, [tasks]);

  // Tab counts
  const counts = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let unscheduled = 0;
    let completed = 0;

    for (const t of rootTasks) {
      if (t.status === "completed") {
        completed++;
      } else {
        if (!t.scheduled_date) {
          unscheduled++;
        } else if (t.scheduled_date <= todayStr) {
          today++;
        } else {
          upcoming++;
        }
      }
    }

    return {
      all: rootTasks.length,
      today,
      upcoming,
      unscheduled,
      completed,
    };
  }, [rootTasks, todayStr]);

  // Filtered task results
  const filteredTasks = useMemo(() => {
    return rootTasks.filter((task) => {
      // 1. Tab filter
      if (activeTab === "today") {
        if (task.status === "completed") return false;
        if (!task.scheduled_date || task.scheduled_date > todayStr) return false;
      } else if (activeTab === "upcoming") {
        if (task.status === "completed") return false;
        if (!task.scheduled_date || task.scheduled_date <= todayStr) return false;
      } else if (activeTab === "unscheduled") {
        if (task.status === "completed") return false;
        if (task.scheduled_date) return false;
      } else if (activeTab === "completed") {
        if (task.status !== "completed") return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 3. Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // 4. Tag filter
      if (selectedTagId !== null) {
        const hasTag = task.tags?.some((t) => t.tag && t.tag.id === selectedTagId);
        if (!hasTag) return false;
      }

      return true;
    });
  }, [rootTasks, activeTab, todayStr, searchQuery, priorityFilter, selectedTagId]);

  // Handle Quick Inline Add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    await createTaskMutation.mutateAsync({
      title: quickAddTitle.trim(),
      scheduled_date: activeTab === "unscheduled" ? null : todayStr,
      priority: "normal",
    });

    setQuickAddTitle("");
  };

  // Handle Full Creation Form
  const handleFullCreate = async () => {
    if (!newTitle.trim()) return;

    await createTaskMutation.mutateAsync({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      priority: newPriority,
      scheduled_date: newScheduledDate || null,
      due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      time_estimate_minutes: newTimeEstimate ? parseInt(newTimeEstimate, 10) : null,
      tag_ids: newTagIds.length > 0 ? newTagIds : undefined,
    });

    setIsCreateOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewPriority("normal");
    setNewScheduledDate(todayStr);
    setNewDueDate("");
    setNewTimeEstimate("");
    setNewTagIds([]);
  };

  const handleToggleTag = (tagId: number) => {
    setNewTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        {/* Navigation Header */}
        <SanctuaryNav subtitle="TASK LEDGER" />

        <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 flex-1 space-y-4">
          
          {/* =========================================================================
              TIER 1: COMPACT HEADER & PRIMARY CTA (~40-44px)
              ========================================================================= */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9] dark:text-[#38BDF8] flex items-center justify-center">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-serif font-bold tracking-tight text-foreground flex items-center gap-2">
                  Task Ledger
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {rootTasks.length} tasks
                  </Badge>
                </h1>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Inscribe Task</span>
            </Button>
          </div>

          {/* =========================================================================
              TIER 2: UNIFIED TOOLBAR (Tabs, Inline Search, Filter Selectors) (~36-40px)
              ========================================================================= */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-card/60 border border-border/70 rounded-xl p-2 shadow-xs">
            {/* Filter Tabs with Embedded Counts */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("today")}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "today"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>Today</span>
                <span className="text-[10px] px-1 rounded-full bg-background/20 font-sans">{counts.today}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "upcoming"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>Upcoming</span>
                <span className="text-[10px] px-1 rounded-full bg-background/20 font-sans">{counts.upcoming}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unscheduled")}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "unscheduled"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>Inbox</span>
                <span className="text-[10px] px-1 rounded-full bg-background/20 font-sans">{counts.unscheduled}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>All Active</span>
                <span className="text-[10px] px-1 rounded-full bg-background/20 font-sans">{counts.all}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "completed"
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>Completed</span>
                <span className="text-[10px] px-1 rounded-full bg-background/20 font-sans">{counts.completed}</span>
              </button>
            </div>

            {/* Inline Search & Priority Quick Filter */}
            <div className="flex items-center gap-2">
              <ListFilterSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tasks..."
                className="w-full md:w-52"
              />

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="h-8 rounded-lg border border-input bg-background/80 px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Quick Add Inline Bar */}
          <form onSubmit={handleQuickAdd} className="relative">
            <div className="flex items-center gap-2 p-1.5 bg-card border border-border/80 rounded-xl shadow-xs">
              <div className="pl-2.5 text-muted-foreground">
                <Plus className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder={`Quick add task to ${activeTab === "unscheduled" ? "Inbox" : "Today"}... (Press Enter)`}
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={!quickAddTitle.trim()}
                className="text-xs font-mono text-primary hover:text-primary hover:bg-primary/10 h-7 px-3 cursor-pointer"
              >
                Add
              </Button>
            </div>
          </form>

          {/* Active Tag Filter Pills (if tags exist) */}
          {tagCategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs font-mono scrollbar-none">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
                <TagIcon className="h-3 w-3" />
                <span>Tags:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTagId(null)}
                className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                  selectedTagId === null
                    ? "bg-secondary text-secondary-foreground border-secondary font-medium"
                    : "bg-background/60 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                All
              </button>
              {tagCategories.flatMap((c) => c.tags || []).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                  className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors flex items-center gap-1 ${
                    selectedTagId === tag.id
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-background/60 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* =========================================================================
              TASK LIST PRINTS (Editorial Broadside List)
              ========================================================================= */}
          {filteredTasks.length === 0 ? (
            <ListEmpty
              icon={<CheckSquare className="h-8 w-8 text-muted-foreground" />}
              title="No Tasks Found"
              description={
                searchQuery
                  ? "No tasks match your active filters or search terms."
                  : activeTab === "today"
                  ? "Your agenda for today is clear. Inscribe a new task or enjoy your focus."
                  : activeTab === "upcoming"
                  ? "No upcoming scheduled tasks on your horizon."
                  : activeTab === "unscheduled"
                  ? "Inbox zero achieved! No unscheduled backlog items."
                  : "No completed tasks yet."
              }
              action={
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="font-mono text-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Inscribe First Task
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-1 divide-y divide-border/60 overflow-hidden shadow-xs">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const isOverdue =
                  !isCompleted &&
                  task.scheduled_date &&
                  task.scheduled_date < todayStr;
                const priorityInfo = PRIORITY_META[task.priority] || PRIORITY_META.normal;
                const subtasksCount = task.subtasks?.length || 0;
                const completedSubtasks =
                  task.subtasks?.filter((s) => s.status === "completed").length || 0;

                return (
                  <div
                    key={task.id}
                    className="group relative flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/40 transition-colors select-none"
                  >
                    {/* Left: Tactile Checkbox Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatusMutation.mutate({
                          id: task.id,
                          isCompleted: !isCompleted,
                        });
                      }}
                      className="shrink-0 mr-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title={isCompleted ? "Mark incomplete" : "Mark completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 hover:scale-110 transition-transform" />
                      )}
                    </button>

                    {/* Middle: Clickable Link to Task Details Page */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex-1 min-w-0 flex flex-col gap-0.5 cursor-pointer pr-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                            isCompleted
                              ? "line-through text-muted-foreground font-normal"
                              : "text-foreground group-hover:text-primary transition-colors"
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        {task.priority !== "normal" && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono py-0 px-1.5 ${priorityInfo.badgeClass}`}
                          >
                            {priorityInfo.label}
                          </Badge>
                        )}

                        {/* Overdue Alert */}
                        {isOverdue && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono py-0 px-1.5 bg-red-500/10 text-red-500 border-red-500/30 flex items-center gap-1"
                          >
                            <AlertCircle className="h-2.5 w-2.5" />
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {/* Subtitle / Description / Metadata */}
                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground flex-wrap">
                        {task.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {task.scheduled_date === todayStr
                                ? "Today"
                                : new Date(task.scheduled_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                            </span>
                          </span>
                        )}

                        {task.time_estimate_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.time_estimate_minutes}m</span>
                          </span>
                        )}

                        {subtasksCount > 0 && (
                          <span className="text-[10px] bg-muted/80 px-1.5 py-0.2 rounded font-mono">
                            {completedSubtasks}/{subtasksCount} subtasks
                          </span>
                        )}

                        {/* Associated Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {task.tags.map((t) => (
                              <span
                                key={t.tag.id}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px]"
                                style={{
                                  backgroundColor: `${t.tag.color || "#6B7280"}20`,
                                  color: t.tag.color || "#6B7280",
                                }}
                              >
                                #{t.tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Right: Quick Action Chevron */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

        </main>

        {/* =========================================================================
            DIALOG: FULL INSCRIBE TASK MODAL
            ========================================================================= */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#0EA5E9]" />
                Inscribe New Task
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Add an actionable task to your daily agenda or backlog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">
                  Task Title *
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Review PRD & draft migration script..."
                  className="font-sans text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">
                  Description / Notes
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add context, links, or checklist instructions..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-foreground">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-foreground">
                    Estimated Time (Minutes)
                  </label>
                  <Input
                    type="number"
                    value={newTimeEstimate}
                    onChange={(e) => setNewTimeEstimate(e.target.value)}
                    placeholder="e.g. 25"
                    className="font-mono text-xs"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-foreground">
                    Scheduled Date (Agenda)
                  </label>
                  <Input
                    type="date"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-foreground">
                    Hard Due Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Tag Selector */}
              {tagCategories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-foreground">
                    Assign Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/80 bg-muted/20 max-h-32 overflow-y-auto">
                    {tagCategories.flatMap((c) => c.tags || []).map((tag) => {
                      const isSelected = newTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={`px-2 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-semibold"
                              : "bg-background text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color || "#6B7280" }}
                          />
                          <span>{tag.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="font-mono text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFullCreate}
                disabled={!newTitle.trim() || createTaskMutation.isPending}
                className="font-mono text-xs bg-primary text-primary-foreground cursor-pointer"
              >
                {createTaskMutation.isPending ? "Inscribing..." : "Inscribe Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AuthGuard>
  );
}
