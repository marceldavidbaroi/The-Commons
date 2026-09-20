"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "@/hooks/queries/use-tag-queries";
import type { TagCategoryRow } from "@/types/tags";
import { notify } from "@/lib/notify";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6B7280", // Slate
];

const FEATURE_OPTIONS = [
  { value: "general", label: "General (Universal)" },
  { value: "diary", label: "Daily Diary / Chronicles" },
  { value: "document", label: "Documents / Broadsides" },
];

interface TagCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: TagCategoryRow | null;
  defaultFeature?: string;
}

export function TagCategoryFormModal({
  isOpen,
  onClose,
  categoryToEdit,
  defaultFeature = "general",
}: TagCategoryFormModalProps) {
  const [name, setName] = useState("");
  const [feature, setFeature] = useState(defaultFeature);
  const [color, setColor] = useState("#3B82F6");
  const [displayOrder, setDisplayOrder] = useState(0);

  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setFeature(categoryToEdit.feature || "general");
      setColor(categoryToEdit.color || "#3B82F6");
      setDisplayOrder(categoryToEdit.display_order ?? 0);
    } else {
      setName("");
      setFeature(defaultFeature);
      setColor("#3B82F6");
      setDisplayOrder(0);
    }
  }, [categoryToEdit, defaultFeature, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      notify.error("Category name is required");
      return;
    }

    try {
      if (categoryToEdit) {
        await updateCategoryMutation.mutateAsync({
          categoryId: categoryToEdit.id,
          payload: {
            name: trimmedName,
            feature,
            color,
            display_order: Number(displayOrder),
          },
        });
        notify.success("Category updated successfully");
      } else {
        await createCategoryMutation.mutateAsync({
          name: trimmedName,
          feature,
          color,
          display_order: Number(displayOrder),
        });
        notify.success("Category created successfully");
      }
      onClose();
    } catch {
      // Error handled by mutation hook
    }
  };

  const isPending =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {categoryToEdit ? "Edit Tag Category" : "New Tag Category"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className="text-xs font-mono">
              CATEGORY NAME
            </Label>
            <Input
              id="category-name"
              placeholder="e.g. Context, Energy Level, Department"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-feature" className="text-xs font-mono">
              FEATURE SCOPE
            </Label>
            <select
              id="category-feature"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {FEATURE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-mono">ACCENT COLOR</Label>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  style={{ backgroundColor: preset }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color.toLowerCase() === preset.toLowerCase()
                      ? "ring-2 ring-ring ring-offset-2 scale-110"
                      : "hover:scale-105 opacity-80"
                  }`}
                />
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-input p-0"
                />
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {color}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display-order" className="text-xs font-mono">
              DISPLAY ORDER
            </Label>
            <Input
              id="display-order"
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              className="font-mono text-sm w-32"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} size="sm">
              {isPending
                ? "Saving..."
                : categoryToEdit
                ? "Update Category"
                : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
