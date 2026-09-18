"use client";

import React, { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, X, Loader2, Flame, BookOpen } from "lucide-react";
import { DiaryTheme } from "@/types/diary";

export type DeleteDialogTheme = DiaryTheme | "default" | "magazine";

export interface DeleteConfirmationDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isPending?: boolean;
  theme?: DeleteDialogTheme;
  itemType?: "entry" | "diary" | "leaf" | "tome" | "item";
  itemName?: string;
}

export function DeleteConfirmationDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  isPending = false,
  theme = "default",
  itemType = "item",
  itemName,
}: DeleteConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isPending || internalLoading;

  const isControlledOpen = Boolean(open ?? isOpen ?? false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    }
    if (!nextOpen && onClose) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      handleOpenChange(false);
    } catch (error) {
      console.error("Deletion confirmation action failed:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  // Helper defaults based on item type and theme
  const isDiary = itemType === "diary" || itemType === "tome";

  // Dynamic default titles and descriptions
  const resolvedTitle =
    title ||
    (theme === "vintage"
      ? isDiary
        ? "Strike Out Chronicle Tome?"
        : "Strike Out Diary Leaf?"
      : theme === "classic"
      ? isDiary
        ? "Delete Leather Journal?"
        : "Delete Diary Page?"
      : theme === "modern"
      ? isDiary
        ? "Delete Notebook?"
        : "Delete Page?"
      : isDiary
      ? "Delete Chronicle?"
      : "Confirm Deletion");

  const resolvedDescription =
    description ||
    (theme === "vintage"
      ? isDiary
        ? `Are you sure you wish to permanently burn "${itemName || "this chronicle tome"}" and dissolve all of its inscribed pages? This action cannot be undone.`
        : `Are you sure you wish to strike out and delete ${itemName ? `"${itemName}"` : "this diary leaf"}? The ink will be erased permanently.`
      : theme === "classic"
      ? isDiary
        ? `Are you sure you want to delete "${itemName || "this journal"}" and all associated entries? This record will be permanently purged.`
        : `Are you sure you want to remove ${itemName ? `"${itemName}"` : "this entry"} from your journal archive?`
      : isDiary
      ? `Permanently delete "${itemName || "this diary"}" and all nested pages? This action is irreversible.`
      : `Are you sure you want to delete ${itemName ? `"${itemName}"` : "this item"}? This cannot be undone.`);

  const resolvedConfirmText =
    confirmText ||
    (theme === "vintage"
      ? isDiary
        ? "Burn & Delete Tome"
        : "Strike Out Leaf"
      : theme === "classic"
      ? isDiary
        ? "Delete Journal"
        : "Delete Page"
      : theme === "modern"
      ? "Delete"
      : "Delete Permanently");

  const resolvedCancelText =
    cancelText ||
    (theme === "vintage"
      ? "Preserve Entry"
      : theme === "classic"
      ? "Keep in Archive"
      : "Cancel");

  return (
    <DialogPrimitive.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop / Overlay with contextual ambiance */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 transition-all duration-200",
            theme === "vintage" &&
              "bg-black/70 dark:bg-black/85",
            theme === "classic" &&
              "bg-[#0A1828]/75 dark:bg-black/85",
            theme === "modern" &&
              "bg-slate-950/80",
            (theme === "default" || theme === "magazine") &&
              "bg-black/60"
          )}
        />

        {/* Modal Content */}
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none duration-200 animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            // VINTAGE THEME: Tactile Aged Deckled Parchment & Crimson Wax/Ink
            theme === "vintage" &&
              "old-paper-bg rounded-2xl border-2 border-[#8C3A27]/40 p-6 shadow-2xl text-[#3D261A] dark:text-[#E8DFC8]",
            // CLASSIC THEME: Navy Leather, Gold Leaf & Ivory Cloth
            theme === "classic" &&
              "bg-[#FBF9F4] dark:bg-[#121E2C] border-2 border-[#AA8520]/50 dark:border-[#AA8520]/30 rounded-xl p-6 shadow-2xl text-[#1E293B] dark:text-[#E0EFF6]",
            // MODERN THEME: Sleek Minimalist & Cyber Crimson
            theme === "modern" &&
              "bg-slate-900 dark:bg-slate-950 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 ring-1 ring-rose-500/20",
            // DEFAULT / MAGAZINE THEME: Refined editorial style
            (theme === "default" || theme === "magazine") &&
              "bg-background border border-border rounded-xl p-6 shadow-2xl text-foreground"
          )}
        >
          {/* Close button top right */}
          <DialogPrimitive.Close
            className={cn(
              "absolute top-4 right-4 rounded-full p-1.5 transition-colors focus:outline-none",
              theme === "vintage" &&
                "text-[#8C3A27]/70 hover:text-[#8C3A27] hover:bg-[#8C3A27]/10 dark:text-[#E59375]/70 dark:hover:text-[#E59375]",
              theme === "classic" &&
                "text-[#AA8520] hover:text-[#8C6D14] hover:bg-[#AA8520]/10 dark:text-[#D4AF37]",
              theme === "modern" &&
                "text-slate-400 hover:text-slate-100 hover:bg-slate-800/80",
              (theme === "default" || theme === "magazine") &&
                "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            disabled={loading}
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Dialog Header with Themed Badges & Icons */}
          <div className="flex items-start gap-4">
            {/* Themed Icon Container */}
            <div
              className={cn(
                "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-xs",
                theme === "vintage" &&
                  "bg-[#8C3A27]/15 border border-[#8C3A27]/40 text-[#8C3A27] dark:text-[#E59375] dark:bg-[#8C3A27]/30",
                theme === "classic" &&
                  "bg-[#AA8520]/15 border border-[#AA8520]/40 text-[#AA8520] dark:text-amber-300 dark:bg-[#AA8520]/25",
                theme === "modern" &&
                  "bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]",
                (theme === "default" || theme === "magazine") &&
                  "bg-destructive/10 text-destructive border border-destructive/20"
              )}
            >
              {theme === "vintage" ? (
                isDiary ? (
                  <Flame className="w-5 h-5 animate-pulse text-[#8C3A27] dark:text-[#F1A288]" />
                ) : (
                  <svg
                    viewBox="0 0 32 32"
                    className="w-6 h-6 fill-none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.5 10.2 C11.5 9.1 19.5 9.1 25.5 10.2 M12.5 9.2 C12.7 6.8 14.2 5.2 16 5.2 C17.8 5.2 19.3 6.8 19.5 9.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.8 11 L10.1 25.4 C10.2 26.5 11.2 27.5 12.4 27.5 L19.6 27.5 C20.8 27.5 21.8 26.5 21.9 25.4 L23.2 11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13.2 15 L13.2 22.5 M18.8 15 L18.8 22.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeDasharray="1.5 2"
                    />
                  </svg>
                )
              ) : theme === "classic" ? (
                isDiary ? (
                  <BookOpen className="w-5 h-5 text-[#AA8520] dark:text-amber-300" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#AA8520] dark:text-amber-300" />
                )
              ) : theme === "modern" ? (
                <Trash2 className="w-5 h-5 text-rose-400" />
              ) : (
                <Trash2 className="w-5 h-5 text-destructive" />
              )}
            </div>

            {/* Header Text */}
            <div className="flex-1 pr-4">
              {/* Optional Theme Kicker */}
              {theme === "modern" && (
                <div className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-semibold mb-1 flex items-center gap-1">
                  <span>Irreversible Action</span>
                </div>
              )}
              {theme === "vintage" && (
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#8C3A27] dark:text-[#E59375] font-semibold mb-1">
                  📜 Tome Inscription Removal
                </div>
              )}
              {theme === "classic" && (
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#AA8520] dark:text-amber-300/80 font-semibold mb-1">
                  ⚜ Archive Confirmation
                </div>
              )}

              <DialogPrimitive.Title
                className={cn(
                  "text-lg font-semibold leading-tight",
                  theme === "vintage" &&
                    "font-serif text-[#4A180E] dark:text-amber-100 tracking-tight",
                  theme === "classic" &&
                    "font-serif text-[#1E3A5F] dark:text-sky-200 tracking-tight",
                  theme === "modern" &&
                    "font-sans font-bold text-white tracking-tight",
                  (theme === "default" || theme === "magazine") &&
                    "font-heading text-foreground"
                )}
              >
                {resolvedTitle}
              </DialogPrimitive.Title>
            </div>
          </div>

          {/* Dialog Description / Content */}
          <div className="mt-3.5">
            <DialogPrimitive.Description
              className={cn(
                "text-sm leading-relaxed",
                theme === "vintage" &&
                  "font-serif text-[#5C4A3A] dark:text-[#D4C3A3] italic",
                theme === "classic" &&
                  "font-serif text-slate-700 dark:text-slate-300",
                theme === "modern" &&
                  "font-sans text-slate-300",
                (theme === "default" || theme === "magazine") &&
                  "text-muted-foreground"
              )}
            >
              {resolvedDescription}
            </DialogPrimitive.Description>
          </div>

          {/* Footer Action Buttons */}
          <div
            className={cn(
              "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4",
              theme === "vintage" && "border-t border-[#8C3A27]/20 dark:border-[#8C3A27]/40",
              theme === "classic" && "border-t border-[#AA8520]/25 dark:border-[#AA8520]/20",
              theme === "modern" && "border-t border-slate-800",
              (theme === "default" || theme === "magazine") && "border-t border-border/80"
            )}
          >
            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleOpenChange(false)}
              className={cn(
                "cursor-pointer transition-all",
                theme === "vintage" &&
                  "border-[#8C3A27]/30 bg-transparent text-[#6B2818] hover:bg-[#8C3A27]/10 dark:text-[#E8DFC8] dark:border-[#8C3A27]/50 font-serif text-xs",
                theme === "classic" &&
                  "border-[#1E3A5F]/30 bg-transparent text-[#1E3A5F] hover:bg-[#1E3A5F]/10 dark:text-[#C5D8EB] dark:border-sky-800 font-serif text-xs",
                theme === "modern" &&
                  "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white font-sans text-xs",
                (theme === "default" || theme === "magazine") &&
                  "text-xs"
              )}
            >
              {resolvedCancelText}
            </Button>

            {/* Confirm / Delete Button */}
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className={cn(
                "cursor-pointer font-medium transition-all shadow-md flex items-center justify-center gap-1.5",
                theme === "vintage" &&
                  "bg-[#8C3A27] hover:bg-[#732B1C] text-white font-serif text-xs shadow-[#8C3A27]/25",
                theme === "classic" &&
                  "bg-rose-700 hover:bg-rose-800 text-white font-serif text-xs shadow-rose-900/20",
                theme === "modern" &&
                  "bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs shadow-rose-900/40 font-semibold",
                (theme === "default" || theme === "magazine") &&
                  "bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resolvedConfirmText}</span>
                </>
              )}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
