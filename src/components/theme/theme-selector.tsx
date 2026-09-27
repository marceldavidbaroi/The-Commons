"use client";

import React, { useState, useRef, useEffect } from "react";
import { Palette, Check, Sparkles, Type } from "lucide-react";
import { useUIStore, ThemePalette, ReadingFont } from "@/stores/ui-store";
import { notify } from "@/lib/notify";

export interface PaletteOption {
  id: ThemePalette;
  name: string;
  tagline: string;
  bgHex: string;
  accentHex: string;
  inkHex: string;
}

export const THEME_PALETTES: PaletteOption[] = [
  {
    id: "paper",
    name: "Warm Linen",
    tagline: "Sepia Parchment • Low Eye Strain",
    bgHex: "#F6F4EE",
    accentHex: "#9E5A3C",
    inkHex: "#2C2825",
  },
  {
    id: "sage",
    name: "Botanical Sage",
    tagline: "Morning Mist • Earthy & Calming",
    bgHex: "#F3F4F1",
    accentHex: "#3A6053",
    inkHex: "#1E2522",
  },
  {
    id: "denim",
    name: "Quiet Denim",
    tagline: "Soft Slate • Gentle Daylight",
    bgHex: "#F6F7F9",
    accentHex: "#415E78",
    inkHex: "#1F2633",
  },
  {
    id: "classic",
    name: "Sanctuary Classic",
    tagline: "Editorial Broadside • Heritage Blue",
    bgHex: "#FAF8F5",
    accentHex: "#3368A0",
    inkHex: "#1E293B",
  },
  {
    id: "midnight",
    name: "Midnight Basalt",
    tagline: "Warm Obsidian • Night Reading",
    bgHex: "#181716",
    accentHex: "#D49B55",
    inkHex: "#EDE8DF",
  },
];

export const READING_FONTS: { id: ReadingFont; name: string; styleClass: string; desc: string }[] = [
  {
    id: "sans",
    name: "Clean Sans",
    styleClass: "font-sans",
    desc: "Modern crisp typography for maximum scanning speed",
  },
  {
    id: "serif",
    name: "Editorial Serif",
    styleClass: "font-serif",
    desc: "Classic literary broadside aesthetic",
  },
  {
    id: "handwriting",
    name: "Handwritten Ink",
    styleClass: "font-kalam font-medium",
    desc: "Organic handwritten script for personal journaling",
  },
];

interface ThemeSelectorProps {
  compact?: boolean;
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themePalette = useUIStore((state) => state.themePalette);
  const setThemePalette = useUIStore((state) => state.setThemePalette);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentTheme = THEME_PALETTES.find((p) => p.id === themePalette) || THEME_PALETTES[0];

  const handleSelectPalette = (palette: PaletteOption) => {
    setThemePalette(palette.id);
    notify.info("Atmosphere Calibrated", `Switched to ${palette.name}.`);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Theme & Typography Atmosphere"
        className={`flex items-center gap-2 rounded-md border border-border bg-card/80 px-2.5 py-1 text-[11px] font-mono transition-all hover:border-primary/50 hover:bg-card cursor-pointer shadow-xs ${
          isOpen ? "ring-1 ring-primary border-primary" : ""
        }`}
      >
        <span
          className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0 shadow-xs"
          style={{ backgroundColor: currentTheme.accentHex }}
        />
        {!compact && <span className="font-semibold">{currentTheme.name}</span>}
        <Palette className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sanctuary Atmosphere</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">Contrast Tuned</span>
          </div>

          {/* Theme Palette List */}
          <div className="mt-3 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
              Color Palette
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {THEME_PALETTES.map((p) => {
                const isSelected = themePalette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPalette(p)}
                    className={`group flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/60 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Color Preview Swatch */}
                      <div
                        className="h-6 w-6 rounded-md border border-border flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: p.bgHex }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.accentHex }}
                        />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold leading-none flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isSelected && (
                            <span className="text-[9px] font-mono bg-primary/20 text-primary px-1.5 py-0.2 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                          {p.tagline}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography System */}
          <div className="mt-3.5 pt-3 border-t border-border/80 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Type className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                Typography
              </span>
            </div>
            <span className="text-[11px] font-semibold text-foreground/90 bg-muted/80 px-2 py-0.5 rounded border border-border/60">
              Plus Jakarta Sans (Unified)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
