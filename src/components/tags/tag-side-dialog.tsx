"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Edit2, Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "./tag-badge";
import {
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} from "@/hooks/queries/use-tag-queries";
import type { TagCategoryWithTags, TagRow } from "@/types/tags";
import { notify } from "@/lib/notify";

interface TagSideDialogProps {
  category: TagCategoryWithTags | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TagSideDialog({
  category,
  isOpen,
  onClose,
}: TagSideDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>("");
  const [useCustomColor, setUseCustomColor] = useState(false);

  const [editingTag, setEditingTag] = useState<TagRow | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState<string>("");

  const createTagMutation = useCreateTagMutation();
  const updateTagMutation = useUpdateTagMutation();
  const deleteTagMutation = useDeleteTagMutation();

  if (!isOpen || !category) return null;

  const isSystem = category.is_system;

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    if (isSystem) {
      notify.error("Cannot add tags to a locked system category");
      return;
    }

    try {
      await createTagMutation.mutateAsync({
        category_id: category.id,
        name: trimmed,
        color: useCustomColor && newTagColor ? newTagColor : null,
      });
      setNewTagName("");
      setNewTagColor("");
      setUseCustomColor(false);
      notify.success(`Tag "${trimmed}" created`);
    } catch {
      // Handled by mutation hook
    }
  };

  const handleStartEdit = (tag: TagRow) => {
    if (isSystem) return;
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color || category.color);
  };

  const handleSaveEdit = async () => {
    if (!editingTag || !editTagName.trim()) return;

    try {
      await updateTagMutation.mutateAsync({
        tagId: editingTag.id,
        payload: {
          name: editTagName.trim(),
          color: editTagColor || null,
        },
      });
      setEditingTag(null);
      notify.success("Tag updated");
    } catch {
      // Handled by mutation hook
    }
  };

  const handleDeleteTag = async (tagId: number, tagName: string) => {
    if (isSystem) return;
    if (!window.confirm(`Are you sure you want to delete tag "${tagName}"?`)) {
      return;
    }

    try {
      await deleteTagMutation.mutateAsync(tagId);
      notify.success(`Tag "${tagName}" deleted`);
    } catch {
      // Handled by mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 z-10"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <h2 className="text-lg font-bold tracking-tight text-foreground truncate">
                {category.name}
              </h2>
              {isSystem && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="h-2.5 w-2.5" />
                  System Default (Read-only)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>Scope: <strong className="text-foreground uppercase">{category.feature}</strong></span>
              <span>•</span>
              <span>{category.tags?.length || 0} tags</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Category Tags
            </h3>
          </div>

          {(!category.tags || category.tags.length === 0) ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/10 space-y-2">
              <Sparkles className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-mono text-muted-foreground">
                No tags created under this category yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {category.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3"
                >
                  {editingTag?.id === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={editTagColor || category.color}
                        onChange={(e) => setEditTagColor(e.target.value)}
                        className="w-7 h-7 rounded border cursor-pointer shrink-0"
                        title="Custom Color Override"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTag(null)}
                        className="h-8 px-2 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TagBadge
                          name={tag.name}
                          color={tag.color || category.color}
                          size="sm"
                        />
                        {tag.color && (
                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            (custom color)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {isSystem ? (
                          <span
                            title="System Tag (Read-only)"
                            className="text-muted-foreground/50 p-1"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tag)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Edit Tag"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTag(tag.id, tag.name)}
                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete Tag"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Add Tag Form (Disabled on system categories) */}
        {!isSystem ? (
          <div className="p-4 sm:p-6 border-t border-border bg-muted/20 space-y-3">
            <h4 className="text-xs font-mono text-muted-foreground uppercase">
              Add New Tag
            </h4>
            <form onSubmit={handleAddTag} className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tag name (e.g. Deep Work, Research)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-9 text-xs font-mono flex-1 bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={createTagMutation.isPending || !newTagName.trim()}
                  className="h-9 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={useCustomColor}
                    onChange={(e) => setUseCustomColor(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-0"
                  />
                  <span>Custom Accent Color</span>
                </label>

                {useCustomColor && (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <input
                      type="color"
                      value={newTagColor || category.color}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-input p-0"
                    />
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {newTagColor || category.color}
                    </span>
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-border bg-amber-500/5 text-center text-xs font-mono text-amber-700 dark:text-amber-400">
            System defaults cannot be modified.
          </div>
        )}
      </div>
    </div>
  );
}
