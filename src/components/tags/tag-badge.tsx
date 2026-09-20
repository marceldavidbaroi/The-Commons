"use client";

import React from "react";
import { X } from "lucide-react";
import { LockIcon } from "./tag-icons";

export interface TagBadgeProps {
  name: string;
  color?: string | null;
  categoryName?: string;
  isSystem?: boolean;
  size?: "xs" | "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

/**
 * Computes whether black or white text has higher contrast against a hex background color.
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6 && hex.length !== 3) return "#1F2937";

  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Perceptive luminance formula (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#0F172A" : "#F8FAFC";
}

export function TagBadge({
  name,
  color = "#6B7280",
  categoryName,
  isSystem = false,
  size = "sm",
  onRemove,
  onClick,
  isSelected = false,
  className = "",
}: TagBadgeProps) {
  const safeColor = color || "#6B7280";
  const textColor = getContrastColor(safeColor);

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-sm px-2.5 py-1 gap-2",
  };

  const badgeContent = (
    <span
      onClick={onClick}
      style={{
        backgroundColor: isSelected ? safeColor : `${safeColor}1F`, // ~12% opacity background when unselected
        borderColor: safeColor,
        color: isSelected ? textColor : "inherit",
      }}
      className={`inline-flex items-center rounded-md font-mono border transition-all select-none ${
        sizeClasses[size]
      } ${
        onClick
          ? "cursor-pointer hover:opacity-90 active:scale-95"
          : "cursor-default"
      } ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: safeColor }}
      />

      {categoryName && (
        <span className="opacity-60 text-[10px] uppercase font-sans font-semibold">
          {categoryName}:
        </span>
      )}

      <span className="font-medium tracking-tight truncate max-w-[140px]">
        {name}
      </span>

      {isSystem && (
        <span
          title="System Default Tag"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <LockIcon className="h-2.5 w-2.5" />
        </span>
      )}

      {onRemove && !isSystem && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 -mr-0.5 transition-colors cursor-pointer"
          title={`Remove tag ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );

  return badgeContent;
}
