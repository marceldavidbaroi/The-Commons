"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Target,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Tag as TagIcon,
  Sparkles,
  Save,
  Check,
  ChevronRight,
  Compass,
  TrendingUp,
  FileText,
  ListOrdered,
  ArrowUpRight,
  X,
  AlertTriangle,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  List,
  ListItem,
  ListPrefix,
  ListContent,
  ListText,
  ListSuffix,
  ListEmpty,
} from "@/components/ui/list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGoalQuery,
  useUpdateGoalMutation,
  useUpdateGoalStatusMutation,
  useDeleteGoalMutation,
  useCreateGoalMutation,
  useSyncGoalTagsMutation,
} from "@/hooks/queries/use-goals";
import {
  useTagCategoriesQuery,
  useProvisionFeatureTagsMutation,
} from "@/hooks/queries/use-tag-queries";
import type { GoalType, GoalPriority, GoalStatus } from "@/types/goal.types";
import { calculateDueDateFromHorizon } from "@/types/goal.types";

const GOAL_TYPE_OPTIONS: { label: string; value: GoalType; icon: string }[] = [
  { label: "Daily Ritual", value: "daily", icon: "☀️" },
  { label: "Weekly Horizon", value: "weekly", icon: "🗓️" },
  { label: "Monthly Goal", value: "monthly", icon: "🌙" },
  { label: "Quarterly Target", value: "quarterly", icon: "🏛️" },
  { label: "Annual Vision", value: "yearly", icon: "🔭" },
  { label: "Major Milestone", value: "milestone", icon: "🚩" },
  { label: "Recurring Habit", value: "habit", icon: "🔄" },
];

const PRIORITY_OPTIONS: { label: string; value: GoalPriority }[] = [
  { label: "Normal Priority", value: "normal" },
  { label: "High Priority", value: "high" },
  { label: "Critical Priority", value: "critical" },
  { label: "Gentle Priority", value: "low" },
];

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = typeof params?.goalId === "string" ? params.goalId : "";

  const { data: goal, isLoading, isError } = useGoalQuery(goalId);
  const { data: tagCategories = [] } = useTagCategoriesQuery("goals");

  const updateGoalMutation = useUpdateGoalMutation();
  const updateStatusMutation = useUpdateGoalStatusMutation();
  const deleteGoalMutation = useDeleteGoalMutation();
  const createSubgoalMutation = useCreateGoalMutation();
  const syncTagsMutation = useSyncGoalTagsMutation();
  const provisionMutation = useProvisionFeatureTagsMutation();

  // In-place editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("daily");
  const [priority, setPriority] = useState<GoalPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [subgoalInput, setSubgoalInput] = useState("");
  const [isSavedFlash, setIsSavedFlash] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

  // Deletion Confirmation Dialog States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subgoalToDelete, setSubgoalToDelete] = useState<{ id: string; title: string } | null>(null);

  // Sync state when goal data is loaded
  useEffect(() => {
    if (goal) {
      setTitle(goal.title || "");
      setDescription(goal.description || "");
      setGoalType(goal.type || "daily");
      setPriority(goal.priority || "normal");
      setDueDate(goal.due_date ? goal.due_date.split("T")[0] : "");
    }
  }, [goal]);

  const allTags = tagCategories.flatMap((cat) => cat.tags || []);
  const goalCategories = tagCategories.filter(
    (cat) =>
      cat.feature === "goals" ||
      cat.feature === "goal" ||
      cat.feature === "all" ||
      cat.feature === "general" ||
      !cat.feature
  );
  const currentAssignedTagIds = (goal?.tags || []).map((t) => t.tag?.id).filter(Boolean) as number[];
  const assignedGoalTags = (goal?.tags || []).map((t) => t.tag).filter(Boolean);

  // Save changes
  const handleSaveDetails = async () => {
    if (!goal || !title.trim()) return;

    await updateGoalMutation.mutateAsync({
      id: goal.id,
      payload: {
        title: title.trim(),
        description: description.trim() || null,
        type: goalType,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      },
    });

    setIsSavedFlash(true);
    setTimeout(() => setIsSavedFlash(false), 2000);
  };

  const handleToggleStatus = (currentStatus: GoalStatus) => {
    if (!goal) return;
    const nextStatus: GoalStatus = currentStatus === "completed" ? "in_progress" : "completed";
    updateStatusMutation.mutate({ id: goal.id, status: nextStatus });
  };

  const handleConfirmDeleteGoal = async () => {
    if (!goal) return;
    await deleteGoalMutation.mutateAsync(goal.id);
    setIsDeleteDialogOpen(false);
    router.push("/goals");
  };

  const handleAddSubgoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !subgoalInput.trim()) return;

    await createSubgoalMutation.mutateAsync({
      title: subgoalInput.trim(),
      parent_id: goal.id,
      type: "daily",
      priority: "normal",
      status: "in_progress",
    });

    setSubgoalInput("");
  };

  const handleToggleSubgoal = (subId: string, currentStatus: GoalStatus) => {
    const nextStatus: GoalStatus = currentStatus === "completed" ? "in_progress" : "completed";
    updateStatusMutation.mutate({ id: subId, status: nextStatus });
  };

  const handleConfirmDeleteSubgoal = async () => {
    if (!subgoalToDelete) return;
    await deleteGoalMutation.mutateAsync(subgoalToDelete.id);
    setSubgoalToDelete(null);
  };

  const handleToggleTag = (tagId: number) => {
    if (!goal) return;
    const isAssigned = currentAssignedTagIds.includes(tagId);
    const newTagIds = isAssigned
      ? currentAssignedTagIds.filter((id) => id !== tagId)
      : [...currentAssignedTagIds, tagId];

    syncTagsMutation.mutate({ goalId: goal.id, tagIds: newTagIds });
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
          <SanctuaryNav subtitle="HORIZON DOSSIER PAGE" />
          <div className="max-w-4xl w-full mx-auto px-6 py-24 text-center font-mono text-xs text-muted-foreground">
            Retrieving page from sanctuary horizon ledger...
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (isError || !goal) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
          <SanctuaryNav subtitle="HORIZON DOSSIER PAGE" />
          <div className="max-w-4xl w-full mx-auto px-6 py-20 text-center space-y-4">
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Objective Dossier Not Found
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              The requested goal could not be found in your private ledger.
            </p>
            <Link href="/goals">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium text-xs rounded-md cursor-pointer">
                Return to Goals Compass
              </Button>
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const isCompleted = goal.status === "completed";
  const subgoals = goal.subgoals || [];
  const completedSubgoals = subgoals.filter((s) => s.status === "completed").length;
  const progressPercent =
    subgoals.length > 0 ? Math.round((completedSubgoals / subgoals.length) * 100) : isCompleted ? 100 : 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        {/* Top Colophon Navigation */}
        <SanctuaryNav subtitle="HORIZON OBJECTIVE PAGE" />

        <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
          {/* Top Page Breadcrumb & Global Save Toolbar */}
          <div className="flex items-center justify-between gap-4 text-xs font-mono text-muted-foreground pb-2">
            <div className="flex items-center gap-2">
              <Link
                href="/goals"
                className="hover:text-foreground transition-colors flex items-center gap-1.5 text-primary font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Goals Compass</span>
              </Link>
              {goal.parent_id && (
                <>
                  <ChevronRight className="h-3 w-3 text-border" />
                  <Link
                    href={`/goals/${goal.parent_id}`}
                    className="hover:text-foreground transition-colors text-muted-foreground hover:underline"
                  >
                    Parent Objective
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isSavedFlash && (
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-1 animate-in fade-in font-medium">
                  <Check className="h-3.5 w-3.5" />
                  Changes Saved
                </span>
              )}

              <Button
                onClick={handleSaveDetails}
                disabled={updateGoalMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium text-xs rounded-md h-8 px-4 gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{updateGoalMutation.isPending ? "Saving..." : "Save Page"}</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border border-border bg-card"
                title="Delete Objective"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* =========================================================================
              THE PAGE DOCUMENT SHEET (SINGLE COHESIVE FOLIO PAGE)
              ========================================================================= */}
          <article className="bg-card border border-border/90 rounded-2xl shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
            {/* Folio Page Masthead Line */}
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/80 pb-3">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Compass className="h-3.5 w-3.5" />
                <span>HORIZON DOSSIER • LEAF § {goal.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div>
                <span>INSCRIBED {new Date(goal.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Page Header: Checkbox & Editable Title */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {/* Big status toggle checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(goal.status)}
                  className="mt-1 text-muted-foreground hover:text-foreground transition-transform active:scale-95 cursor-pointer shrink-0"
                  title={isCompleted ? "Mark as in progress" : "Mark as completed"}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="h-7 w-7 text-muted-foreground hover:text-primary" />
                  )}
                </button>

                {/* In-place Title Input */}
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter objective title..."
                    className={`font-editorial text-2xl sm:text-3xl font-bold bg-transparent border-transparent hover:border-border/60 focus:border-primary px-2 py-1 h-auto rounded-md tracking-tight ${
                      isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  />
                  <div className="flex items-center gap-2 px-2 text-xs font-mono text-muted-foreground">
                    <span>STATUS:</span>
                    <span
                      className={`font-semibold uppercase ${
                        isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-primary"
                      }`}
                    >
                      {goal.status.replace("_", " ")}
                    </span>
                    <span className="text-border">•</span>
                    <span>PROGRESS: {progressPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full h-1.5 goal-progress-track">
                <div
                  className="h-full goal-progress-fill transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Meta Attributes Strip: Horizon Type, Priority, Target Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/20 border border-border/80 rounded-xl">
              {/* 1. Horizon Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Timeframe Horizon
                </label>
                <select
                  value={goalType}
                  onChange={(e) => {
                    const newType = e.target.value as GoalType;
                    setGoalType(newType);
                    const baseDate = goal?.updated_at || new Date();
                    setDueDate(calculateDueDateFromHorizon(newType, baseDate));
                  }}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none cursor-pointer"
                >
                  {GOAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Priority Level */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Priority Weight
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as GoalPriority)}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Target Due Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Target Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono"
                />
              </div>
            </div>

            {/* Section A: Inscription / Notes */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Intention & Strategic Notes</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write reflection notes, motivations, and guidelines for this objective..."
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-background/50 p-4 font-reading text-sm sm:text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-all resize-y"
              />
            </div>

            {/* Section B: Milestones & Sub-tasks */}
            <div className="space-y-4 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                  <ListOrdered className="h-3.5 w-3.5 text-primary" />
                  <span>Actionable Milestone Steps ({completedSubgoals} / {subgoals.length})</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Add Subgoal Input Form */}
              <form onSubmit={handleAddSubgoal} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Add a milestone step (e.g., Draft outline, schedule interview)..."
                  value={subgoalInput}
                  onChange={(e) => setSubgoalInput(e.target.value)}
                  className="h-9 text-xs font-sans bg-background border-border rounded-md flex-1"
                />
                <Button
                  type="submit"
                  disabled={!subgoalInput.trim() || createSubgoalMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans font-medium text-xs rounded-md h-9 px-4 gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Step</span>
                </Button>
              </form>

              {/* Subgoals List */}
              {subgoals.length > 0 ? (
                <List variant="default">
                  {subgoals.map((sub) => {
                    const isSubDone = sub.status === "completed";
                    return (
                      <ListItem
                        key={sub.id}
                        state={isSubDone ? "completed" : "idle"}
                        className="py-2.5 px-3"
                      >
                        <ListPrefix className="mr-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSubgoal(sub.id, sub.status)}
                            className="text-muted-foreground hover:text-foreground transition-transform active:scale-95 cursor-pointer shrink-0"
                            title={isSubDone ? "Mark in progress" : "Mark completed"}
                          >
                            {isSubDone ? (
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className="h-4.5 w-4.5 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                        </ListPrefix>

                        <ListContent>
                          <ListText completed={isSubDone}>
                            {sub.title}
                          </ListText>
                        </ListContent>

                        <ListSuffix className="ml-2">
                          <Link
                            href={`/goals/${sub.id}`}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            title="Open sub-node dossier"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubgoalToDelete({ id: sub.id, title: sub.title });
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete sub-node"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ListSuffix>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <ListEmpty
                  description="No milestone steps added yet. Add simple actionable steps above to build momentum."
                />
              )}
            </div>

            {/* Section C: Taxonomy Categories & Tags */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                  <TagIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Associated Taxonomy Tags</span>
                </div>

                {/* Dialog to pick/add tags from Goal categories */}
                <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                  <DialogTrigger
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border hover:border-primary text-xs font-mono text-muted-foreground hover:text-foreground bg-background hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span>Add Tags</span>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 font-mono text-base">
                        <TagIcon className="h-4 w-4 text-primary" />
                        Select Taxonomy Tags
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Click tags to attach them to this goal. Selected tags will be highlighted.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[360px] overflow-y-auto space-y-4 py-2 pr-1">
                      {goalCategories.length === 0 ? (
                        <div className="text-center py-6 text-xs font-mono text-muted-foreground border border-dashed border-border/80 rounded-lg p-4 space-y-3">
                          <p>No goal tag categories found in your account yet.</p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={provisionMutation.isPending}
                              onClick={() => provisionMutation.mutate("goals")}
                              className="text-xs font-mono gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>{provisionMutation.isPending ? "Seeding..." : "Seed Default Goal Tags"}</span>
                            </Button>
                            <Link
                              href="/tag-management"
                              className="text-xs text-primary hover:underline"
                            >
                              Open Tag Management
                            </Link>
                          </div>
                        </div>
                      ) : (
                        goalCategories.map((cat) => (
                          <div key={cat.id} className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                              <span
                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: cat.color || "var(--primary)" }}
                              />
                              <span>{cat.name}</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {cat.tags && cat.tags.length > 0 ? (
                                cat.tags.map((tag) => {
                                  const isAssigned = currentAssignedTagIds.includes(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => handleToggleTag(tag.id)}
                                      className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                                        isAssigned
                                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                                          : "bg-muted/40 hover:bg-muted text-foreground border-border hover:border-foreground"
                                      }`}
                                    >
                                      <span>#{tag.name}</span>
                                      {isAssigned && <Check className="h-3 w-3" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="text-[11px] font-mono text-muted-foreground italic">
                                  No tags in this category
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Display tags assigned to this goal on the page with remove button */}
              {assignedGoalTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assignedGoalTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border bg-primary/10 border-primary/30 text-foreground font-medium group"
                    >
                      <span className="text-primary font-semibold">#{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
                        title={`Remove #${tag.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border border-dashed border-border/80 rounded-lg text-xs font-mono text-muted-foreground bg-muted/10 flex items-center justify-between">
                  <span>No taxonomy tags assigned to this goal yet.</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTagDialogOpen(true)}
                    className="h-6 text-xs text-primary hover:underline p-0 cursor-pointer"
                  >
                    Select tags +
                  </Button>
                </div>
              )}
            </div>

            {/* Folio Bottom Signature Bar */}
            <div className="border-t border-border/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
              <span>LEAF REVISION: {new Date(goal.updated_at).toLocaleString()}</span>
              <span>THE COMMONS SANCTUARY ARCHIVE</span>
            </div>
          </article>
        </main>

        {/* CONFIRMATION DIALOG: STRIKE GOAL */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                Are you sure you wish to delete <span className="font-semibold text-foreground">"{goal.title}"</span>? This will permanently remove the objective, its strategic notes, and all milestone steps from your private ledger.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="font-mono text-xs rounded-md border-border h-9 px-4 cursor-pointer"
              >
                Keep Objective
              </Button>
              <Button
                type="button"
                disabled={deleteGoalMutation.isPending}
                onClick={handleConfirmDeleteGoal}
                className="bg-red-700 hover:bg-red-800 text-white font-serif text-xs rounded-md h-9 px-5 cursor-pointer shadow-xs"
              >
                {deleteGoalMutation.isPending ? "Striking..." : "Strike from Horizon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONFIRMATION DIALOG: DELETE SUBGOAL */}
        <Dialog open={Boolean(subgoalToDelete)} onOpenChange={(open) => !open && setSubgoalToDelete(null)}>
          <DialogContent className="sm:max-w-md bg-card border border-border shadow-lg rounded-xl p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>CONFIRM SUB-TASK DELETION</span>
              </div>
              <DialogTitle className="font-serif text-lg font-bold text-foreground">
                Remove Milestone Step?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-serif leading-relaxed">
                Are you sure you wish to remove <span className="font-semibold text-foreground">"{subgoalToDelete?.title}"</span> from this objective?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubgoalToDelete(null)}
                className="font-mono text-xs rounded-md border-border h-9 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deleteGoalMutation.isPending}
                onClick={handleConfirmDeleteSubgoal}
                className="bg-red-700 hover:bg-red-800 text-white font-serif text-xs rounded-md h-9 px-5 cursor-pointer shadow-xs"
              >
                {deleteGoalMutation.isPending ? "Removing..." : "Remove Step"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Colophon Footer */}
        <footer className="border-t border-border/80 mt-auto bg-card/40 py-6 px-6">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <div>
              <span className="font-bold text-foreground">THE COMMONS</span> — Sanctuary Horizons & Goals Dossier.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/home" className="hover:text-foreground">Sanctuary Home</Link>
              <span>•</span>
              <Link href="/goals" className="hover:text-foreground">Goals Compass</Link>
              <span>•</span>
              <Link href="/my-diaries" className="hover:text-foreground">Daily Journal</Link>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
