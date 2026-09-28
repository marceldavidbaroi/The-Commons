"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Tag as TagIcon,
  Sparkles,
  Save,
  Check,
  ChevronRight,
  AlertCircle,
  X,
  AlignLeft,
  CornerDownRight,
  RotateCcw,
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
  ListSuffix,
  ListEmpty,
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
  useTaskQuery,
  useUpdateTaskMutation,
  useToggleTaskStatusMutation,
  useDeleteTaskMutation,
  useCreateTaskMutation,
} from "@/hooks/queries/use-tasks";
import { useTagCategoriesQuery } from "@/hooks/queries/use-tag-queries";
import type { TaskPriority, TaskStatus, TaskWithDetails } from "@/types/tasks";

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; class: string }[] = [
  { label: "Urgent", value: "urgent", class: "text-red-500" },
  { label: "High", value: "high", class: "text-amber-500" },
  { label: "Normal", value: "normal", class: "text-muted-foreground" },
  { label: "Low", value: "low", class: "text-emerald-500" },
];

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.taskId === "string" ? params.taskId : "";

  const { data: task, isLoading, isError } = useTaskQuery(taskId);
  const { data: tagCategories = [] } = useTagCategoriesQuery("tasks");

  const updateTaskMutation = useUpdateTaskMutation();
  const toggleStatusMutation = useToggleTaskStatusMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const createSubtaskMutation = useCreateTaskMutation();

  // In-place editable form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [scheduledDate, setScheduledDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [timeEstimate, setTimeEstimate] = useState<string>("");
  const [actualMinutes, setActualMinutes] = useState<string>("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [isSavedFlash, setIsSavedFlash] = useState(false);

  // Tag Modal / Drawer
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Populate local state when task data loads
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "normal");
      setScheduledDate(task.scheduled_date || "");
      setDueDate(task.due_date ? task.due_date.slice(0, 16) : "");
      setTimeEstimate(
        task.time_estimate_minutes !== null ? String(task.time_estimate_minutes) : ""
      );
      setActualMinutes(
        task.actual_minutes !== null ? String(task.actual_minutes) : ""
      );
      setSelectedTagIds(task.tags?.map((t) => t.tag.id) || []);
    }
  }, [task]);

  // Save changes handler
  const handleSaveChanges = async () => {
    if (!taskId || !title.trim()) return;

    await updateTaskMutation.mutateAsync({
      id: taskId,
      payload: {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        scheduled_date: scheduledDate || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        time_estimate_minutes: timeEstimate ? parseInt(timeEstimate, 10) : null,
        actual_minutes: actualMinutes ? parseInt(actualMinutes, 10) : null,
        tag_ids: selectedTagIds,
      },
    });

    setIsSavedFlash(true);
    setTimeout(() => setIsSavedFlash(false), 2000);
  };

  // Add subtask handler
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskInput.trim() || !taskId) return;

    await createSubtaskMutation.mutateAsync({
      title: subtaskInput.trim(),
      parent_id: taskId,
      scheduled_date: scheduledDate || null,
      priority: "normal",
    });

    setSubtaskInput("");
  };

  // Toggle subtask status
  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    const isCompleted = currentStatus === "completed";
    await toggleStatusMutation.mutateAsync({
      id: subtaskId,
      isCompleted: !isCompleted,
    });
  };

  // Delete task handler
  const handleDeleteTask = async () => {
    if (!taskId) return;
    await deleteTaskMutation.mutateAsync(taskId);
    router.push("/tasks");
  };

  const handleToggleTagSelection = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
          <SanctuaryNav subtitle="TASK DETAILS" />
          <main className="max-w-4xl w-full mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-mono text-xs text-muted-foreground">Retrieving task record...</p>
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (isError || !task) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
          <SanctuaryNav subtitle="TASK NOT FOUND" />
          <main className="max-w-4xl w-full mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div className="text-center space-y-1">
              <h2 className="text-lg font-serif font-bold">Task Record Not Found</h2>
              <p className="text-xs font-mono text-muted-foreground">
                This task may have been completed and archived, deleted, or does not exist.
              </p>
            </div>
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="font-mono text-xs cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Return to Task Ledger
              </Button>
            </Link>
          </main>
        </div>
      </AuthGuard>
    );
  }

  const isCompleted = task.status === "completed";
  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter((s) => s.status === "completed").length;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C8DFDB] selection:text-[#193836]">
        {/* Header Colophon */}
        <SanctuaryNav subtitle="TASK DETAILS" />

        <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 py-6 flex-1 space-y-6">
          
          {/* Top Context Breadcrumb & Action Toolbar */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/80">
            <div className="flex items-center gap-2">
              <Link
                href="/tasks"
                className="p-1.5 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Back to Task Ledger"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Link href="/tasks" className="hover:underline">
                  Tasks
                </Link>
                <span>/</span>
                <span className="text-foreground truncate max-w-[200px] sm:max-w-xs font-semibold">
                  {task.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-mono text-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={updateTaskMutation.isPending}
                className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs gap-1.5"
              >
                {isSavedFlash ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main Card Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left 8 Columns: Main Task Details & Checklist */}
            <div className="md:col-span-8 space-y-5">
              
              {/* Title & Status Header Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        id: task.id,
                        isCompleted: !isCompleted,
                      })
                    }
                    className="mt-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                    title={isCompleted ? "Mark incomplete" : "Mark completed"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle className="h-6 w-6 hover:scale-110 transition-transform" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Task title..."
                      className={`w-full font-serif font-bold text-lg sm:text-xl bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 -ml-1 text-foreground ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    />
                    {isCompleted && task.completed_at && (
                      <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        ✓ Completed on {new Date(task.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="space-y-1 pt-2 border-t border-border/60">
                  <label className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5" />
                    <span>Description & Action Notes</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add detailed execution context, links, or notes..."
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background/50 p-3 text-xs sm:text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                  />
                </div>
              </div>

              {/* Subtasks / Checklist Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-serif font-semibold text-sm text-foreground">
                      Subtasks & Checklist
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      ({completedSubtasksCount}/{subtasks.length})
                    </span>
                  </div>

                  {subtasks.length > 0 && (
                    <div className="text-xs font-mono text-muted-foreground">
                      {Math.round((completedSubtasksCount / subtasks.length) * 100)}% done
                    </div>
                  )}
                </div>

                {/* Subtask Inline Add Bar */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CornerDownRight className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      placeholder="Add a subtask step... (Press Enter)"
                      className="w-full h-8 rounded-lg border border-input bg-background/80 pl-8 pr-3 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!subtaskInput.trim()}
                    className="h-8 font-mono text-xs cursor-pointer"
                  >
                    Add Step
                  </Button>
                </form>

                {/* Subtasks List */}
                {subtasks.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground italic py-2">
                    No subtasks added. Break down complex tasks into smaller executable steps.
                  </p>
                ) : (
                  <List variant="bordered" className="divide-y divide-border/60">
                    {subtasks.map((st) => {
                      const stCompleted = st.status === "completed";
                      return (
                        <ListItem
                          key={st.id}
                          variant="bordered"
                          size="sm"
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(st.id, st.status)}
                              className="text-muted-foreground hover:text-primary cursor-pointer shrink-0"
                            >
                              {stCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <span
                              className={`text-xs break-words ${
                                stCompleted
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteTaskMutation.mutate(st.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                            title="Remove subtask"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </div>

            </div>

            {/* Right 4 Columns: Metadata Sidebar (Priority, Schedule, Time, Tags) */}
            <div className="md:col-span-4 space-y-4">
              
              {/* Properties Card */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3.5 text-xs font-mono">
                <h4 className="font-serif font-bold text-sm text-foreground pb-1 border-b border-border/60">
                  Execution Attributes
                </h4>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scheduled Date (Agenda) */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Scheduled Date</span>
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                {/* Hard Due Date */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Hard Due Deadline</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                {/* Time Tracking (Estimate vs Actual) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">Est. (min)</label>
                    <Input
                      type="number"
                      value={timeEstimate}
                      onChange={(e) => setTimeEstimate(e.target.value)}
                      placeholder="e.g. 30"
                      className="h-8 font-mono text-xs"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">Actual (min)</label>
                    <Input
                      type="number"
                      value={actualMinutes}
                      onChange={(e) => setActualMinutes(e.target.value)}
                      placeholder="e.g. 25"
                      className="h-8 font-mono text-xs"
                      min="0"
                    />
                  </div>
                </div>

                {/* Created / Updated Timestamps */}
                <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground space-y-1">
                  <div>Inscribed: {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div>Updated: {new Date(task.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>

              {/* Tag Taxonomy Card */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-1.5 font-serif font-semibold text-sm text-foreground">
                    <TagIcon className="h-3.5 w-3.5 text-primary" />
                    <span>Assigned Tags</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsTagDialogOpen(true)}
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    Edit Tags
                  </Button>
                </div>

                {selectedTagIds.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground italic py-1">
                    No tags assigned. Categorize by Context, Energy, or Domain.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tagCategories
                      .flatMap((c) => c.tags || [])
                      .filter((t) => selectedTagIds.includes(t.id))
                      .map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono"
                          style={{
                            backgroundColor: `${tag.color || "#6B7280"}15`,
                            borderColor: `${tag.color || "#6B7280"}40`,
                            color: tag.color || "#6B7280",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tag.color || "#6B7280" }}
                          />
                          <span>{tag.name}</span>
                        </span>
                      ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </main>

        {/* =========================================================================
            DIALOG: TAG SELECTION MODAL
            ========================================================================= */}
        <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-primary" />
                Assign Universal Tags
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Select semantic tags to classify this task.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3 max-h-72 overflow-y-auto">
              {tagCategories.length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground text-center py-4">
                  No tag categories found for Tasks.
                </p>
              ) : (
                tagCategories.map((category) => (
                  <div key={category.id} className="space-y-1.5">
                    <span
                      className="text-[11px] font-mono font-semibold uppercase tracking-wider block"
                      style={{ color: category.color }}
                    >
                      {category.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(category.tags || []).map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTagSelection(tag.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color || category.color }}
                            />
                            <span>{tag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button
                size="sm"
                onClick={() => {
                  setIsTagDialogOpen(false);
                  handleSaveChanges();
                }}
                className="font-mono text-xs bg-primary text-primary-foreground cursor-pointer"
              >
                Apply & Save Tags
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            DIALOG: DELETE CONFIRMATION MODAL
            ========================================================================= */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Task Record
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Are you sure you want to delete &ldquo;{task.title}&rdquo;? This will permanently remove the task and all nested subtask checklist items.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="font-mono text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteTask}
                disabled={deleteTaskMutation.isPending}
                className="font-mono text-xs cursor-pointer"
              >
                {deleteTaskMutation.isPending ? "Deleting..." : "Permanently Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AuthGuard>
  );
}
