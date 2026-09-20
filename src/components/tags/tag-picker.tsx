"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Search, Check, Sparkles, X } from "lucide-react";
import { TagBadge } from "./tag-badge";
import {
  useTagCategoriesQuery,
  useEntityTagsQuery,
  useAssignTagMutation,
  useRemoveTagMutation,
  useCreateTagMutation,
} from "@/hooks/queries/use-tag-queries";
import type { EntityType, TagRow } from "@/types/tags";
import { notify } from "@/lib/notify";

interface TagPickerProps {
  entityType: EntityType;
  entityId: string;
  feature?: string;
  className?: string;
}

export function TagPicker({
  entityType,
  entityId,
  feature = "diary",
  className = "",
}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // TanStack Queries & Mutations
  const { data: categories = [] } = useTagCategoriesQuery(feature);
  const { data: assignedTags = [] } = useEntityTagsQuery(entityType, entityId);

  const assignTagMutation = useAssignTagMutation();
  const removeTagMutation = useRemoveTagMutation();
  const createTagMutation = useCreateTagMutation();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const assignedTagIdSet = useMemo(
    () => new Set<number>(assignedTags.map((t) => t.id)),
    [assignedTags]
  );

  const handleToggleTag = async (tag: TagRow) => {
    if (assignedTagIdSet.has(tag.id)) {
      await removeTagMutation.mutateAsync({
        entityType,
        entityId,
        tagId: tag.id,
      });
    } else {
      await assignTagMutation.mutateAsync({
        entityType,
        entityId,
        tag,
      });
    }
  };

  const handleCreateAndAssign = async (categoryId: number, name: string) => {
    try {
      const createdTag = await createTagMutation.mutateAsync({
        category_id: categoryId,
        name: name.trim(),
      });
      await assignTagMutation.mutateAsync({
        entityType,
        entityId,
        tag: createdTag,
      });
      setSearchQuery("");
      notify.success(`Created & assigned tag "${name}"`);
    } catch {
      // Handled by mutation hook
    }
  };

  // Filtered categories based on searchQuery
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        tags: (cat.tags || []).filter((t) => t.name.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.tags.length > 0 || cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  return (
    <div className={`relative flex items-center flex-wrap gap-1.5 ${className}`} ref={popoverRef}>
      {/* Assigned Tags Badges */}
      {assignedTags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          size="sm"
          onRemove={() =>
            removeTagMutation.mutate({
              entityType,
              entityId,
              tagId: tag.id,
            })
          }
        />
      ))}

      {/* Add Tag Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md border border-dashed border-border hover:border-primary hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none"
      >
        <Plus className="h-3 w-3" />
        <span>Tag</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 max-h-80 bg-background border border-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2 border-b border-border bg-muted/20 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search or add tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Grouped Tags List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-muted-foreground space-y-2">
                <p>No matching tags found.</p>
                {categories.length > 0 && searchQuery.trim() && (
                  <div className="pt-1">
                    <p className="text-[10px] text-muted-foreground/70 mb-1">
                      Create &quot;{searchQuery.trim()}&quot; under:
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCreateAndAssign(cat.id, searchQuery)}
                          className="px-2 py-0.5 text-[10px] font-mono rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer"
                        >
                          + {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-muted-foreground/80 tracking-wider">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>

                  <div className="space-y-0.5">
                    {(cat.tags || []).map((tag) => {
                      const isAssigned = assignedTagIdSet.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`w-full flex items-center justify-between px-2.5 py-1 rounded text-xs font-mono text-left transition-colors cursor-pointer ${
                            isAssigned
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="truncate">{tag.name}</span>
                          {isAssigned && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
