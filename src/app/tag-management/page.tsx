"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  ChevronRight,
  Filter,
} from "lucide-react";
import { SanctuaryNav } from "@/components/navigation/sanctuary-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tags/tag-badge";
import { TagSideDialog } from "@/components/tags/tag-side-dialog";
import { TagCategoryFormModal } from "@/components/tags/tag-category-form-modal";
import {
  useTagCategoriesQuery,
  useDeleteCategoryMutation,
  useProvisionFeatureTagsMutation,
} from "@/hooks/queries/use-tag-queries";
import type { TagCategoryWithTags, TagCategoryRow } from "@/types/tags";
import { notify } from "@/lib/notify";

const FEATURE_TABS = [
  { id: "all", label: "All Features" },
  { id: "goals", label: "Horizons & Goals" },
  { id: "diary", label: "Daily Diary" },
  { id: "document", label: "Documents" },
  { id: "general", label: "General" },
];

export default function TagManagementPage() {
  const [selectedFeature, setSelectedFeature] = useState<string>("all");
  const [selectedCategoryForDrawer, setSelectedCategoryForDrawer] =
    useState<TagCategoryWithTags | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<TagCategoryRow | null>(null);

  // TanStack Queries
  const { data: allCategories = [], isLoading } = useTagCategoriesQuery(
    selectedFeature === "all" ? undefined : selectedFeature
  );

  const deleteCategoryMutation = useDeleteCategoryMutation();
  const provisionMutation = useProvisionFeatureTagsMutation();

  // Filter categories client-side if "all" is active, or use query result
  const categories = useMemo(() => {
    if (selectedFeature === "all") return allCategories;
    return allCategories.filter((c) => c.feature === selectedFeature);
  }, [allCategories, selectedFeature]);

  // Handle drawer sync when query cache updates
  const activeDrawerCategory = useMemo(() => {
    if (!selectedCategoryForDrawer) return null;
    return (
      allCategories.find((c) => c.id === selectedCategoryForDrawer.id) ||
      selectedCategoryForDrawer
    );
  }, [selectedCategoryForDrawer, allCategories]);

  const handleDeleteCategory = async (cat: TagCategoryWithTags) => {
    if (cat.is_system) {
      notify.error("System categories cannot be deleted");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete category "${cat.name}" and all its tags?`
      )
    ) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync(cat.id);
      if (selectedCategoryForDrawer?.id === cat.id) {
        setSelectedCategoryForDrawer(null);
      }
      notify.success(`Category "${cat.name}" deleted`);
    } catch {
      // Handled by mutation hook
    }
  };

  const handleOpenEdit = (cat: TagCategoryWithTags) => {
    if (cat.is_system) {
      notify.error("System categories cannot be edited");
      return;
    }
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleOpenNew = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleQuickProvision = async (featureKey: string) => {
    try {
      const res = await provisionMutation.mutateAsync(featureKey);
      if (res.provisioned) {
        notify.success(`Initialized tags for ${featureKey}`);
      } else {
        notify.info(`Tags already exist for ${featureKey}`);
      }
    } catch {
      // Handled by mutation hook
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SanctuaryNav subtitle="TAXONOMY & TAG DIRECTORY" />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          {/* Back & Breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sanctuary</span>
            </Link>
          </div>

          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">
                  Tag Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Organize your knowledge base and chronicles with custom taxonomy categories and color-coded tags.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenNew}
                size="sm"
                className="gap-1.5 font-mono text-xs shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Category</span>
              </Button>
            </div>
          </div>

          {/* Feature Tabs & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1 text-xs font-mono">
              {FEATURE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFeature(tab.id)}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    selectedFeature === tab.id
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Feature Init Trigger */}
            {selectedFeature !== "all" && categories.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickProvision(selectedFeature)}
                disabled={provisionMutation.isPending}
                className="text-xs font-mono gap-1 border-dashed"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Initialize {selectedFeature} Categories</span>
              </Button>
            )}
          </div>

          {/* Categories Grid / List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-36 rounded-xl border border-border/60 bg-muted/10 animate-pulse"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-semibold">No categories found</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedFeature === "all"
                    ? "Get started by creating your first tag category."
                    : `No categories found for the "${selectedFeature}" feature scope.`}
                </p>
              </div>
              <Button
                onClick={handleOpenNew}
                size="sm"
                variant="outline"
                className="text-xs font-mono gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Category</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setSelectedCategoryForDrawer(category)}
                  className="group relative flex flex-col justify-between p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer shadow-xs"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3 className="font-bold text-base tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {category.feature}
                        </span>

                        {category.is_system && (
                          <span
                            title="System Default"
                            className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          >
                            <Lock className="h-2.5 w-2.5 mr-0.5" />
                            System
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags Preview Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1 min-h-[32px]">
                      {category.tags && category.tags.length > 0 ? (
                        <>
                          {category.tags.slice(0, 5).map((tag) => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              color={tag.color || category.color}
                              size="xs"
                            />
                          ))}
                          {category.tags.length > 5 && (
                            <span className="text-[10px] font-mono text-muted-foreground self-center px-1">
                              +{category.tags.length - 5} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground/60 italic self-center">
                          No tags yet. Click to add tags.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60 text-xs font-mono text-muted-foreground">
                    <span>{category.tags?.length || 0} total tags</span>

                    <div className="flex items-center gap-1">
                      {!category.is_system && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(category);
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category);
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}

                      <span className="inline-flex items-center gap-0.5 text-primary font-medium pl-2 group-hover:translate-x-0.5 transition-transform">
                        <span>Open</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Side Drawer Dialog */}
        <TagSideDialog
          category={activeDrawerCategory}
          isOpen={Boolean(activeDrawerCategory)}
          onClose={() => setSelectedCategoryForDrawer(null)}
        />

        {/* Category Create/Edit Modal */}
        <TagCategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categoryToEdit={categoryToEdit}
          defaultFeature={selectedFeature === "all" ? "general" : selectedFeature}
        />
      </div>
    </AuthGuard>
  );
}
