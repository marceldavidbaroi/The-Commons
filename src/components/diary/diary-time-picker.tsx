"use client";

import React, { useState } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Clock, Plus, X } from "lucide-react";
import { cn } from "cn";
import type { DiaryTheme } from "@/types/diary";

interface DiaryTimePickerProps {
  startTime?: string | null;
  endTime?: string | null;
  theme: DiaryTheme;
  onTimeChange: (fields: { startTime?: string | null; endTime?: string | null }) => void;
  calculateDuration?: (start: string, end: string) => string;
}

const COMMON_START_TIMES = [
  { label: "06:00 AM", value: "06:00" },
  { label: "08:00 AM", value: "08:00" },
  { label: "09:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "01:00 PM", value: "13:00" },
  { label: "06:00 PM", value: "18:00" },
];

const COMMON_DURATIONS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
  { label: "8h", minutes: 480 },
];

function defaultCalculateDuration(start: string, end: string, theme: DiaryTheme) {
  try {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (theme === "vintage") {
      return `${h}h ${m}m`;
    }
    return `${h} hrs ${m > 0 ? `${m} mins` : ""}`.trim();
  } catch {
    return theme === "vintage" ? "0h 0m" : "8 hrs";
  }
}

function formatTimeTo12Hour(time24: string): string {
  try {
    const [h, m] = (time24 || "").split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return time24;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return time24;
  }
}

function parseTimeToComponents(time24?: string | null): { hour12: number; minute: number; period: "AM" | "PM" } {
  try {
    if (!time24) return { hour12: 9, minute: 0, period: "AM" };
    const [h, m] = time24.split(":").map(Number);
    const validH = isNaN(h) ? 9 : h;
    const validM = isNaN(m) ? 0 : m;
    const period: "AM" | "PM" = validH >= 12 ? "PM" : "AM";
    const hour12 = validH % 12 === 0 ? 12 : validH % 12;
    return { hour12, minute: validM, period };
  } catch {
    return { hour12: 9, minute: 0, period: "AM" };
  }
}

function componentsToTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  const hStr = String(h).padStart(2, "0");
  const mStr = String(minute).padStart(2, "0");
  return `${hStr}:${mStr}`;
}

export function DiaryTimePicker({
  startTime,
  endTime,
  theme,
  onTimeChange,
  calculateDuration,
}: DiaryTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasTime = Boolean(startTime && startTime.trim() !== "");
  const effectiveStart = startTime || "09:00";
  const effectiveEnd = endTime || "17:00";

  const durationStr = hasTime
    ? calculateDuration
      ? calculateDuration(effectiveStart, effectiveEnd)
      : defaultCalculateDuration(effectiveStart, effectiveEnd, theme)
    : null;

  const startComp = parseTimeToComponents(effectiveStart);
  const endComp = parseTimeToComponents(effectiveEnd);

  const updateStartComponent = (updates: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>) => {
    const next = { ...startComp, ...updates };
    const new24 = componentsToTime24(next.hour12, next.minute, next.period);
    onTimeChange({
      startTime: new24,
      endTime: endTime || "17:00",
    });
  };

  const updateEndComponent = (updates: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>) => {
    const next = { ...endComp, ...updates };
    const new24 = componentsToTime24(next.hour12, next.minute, next.period);
    onTimeChange({
      startTime: startTime || "09:00",
      endTime: new24,
    });
  };

  const applyDurationPreset = (minutes: number) => {
    try {
      const [sH, sM] = effectiveStart.split(":").map(Number);
      const totalMinutes = (sH * 60 + sM + minutes) % (24 * 60);
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      const formattedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      onTimeChange({
        startTime: startTime || effectiveStart,
        endTime: formattedEnd,
      });
    } catch {
      // ignore
    }
  };

  const clearTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTimeChange({ startTime: null, endTime: null });
    setIsOpen(false);
  };

  const triggerStyle = {
    modern:
      "group inline-flex items-center gap-1.5 font-sans text-xs sm:text-sm font-medium transition-colors cursor-pointer px-2 py-1 rounded-md",
    classic:
      "group inline-flex items-center gap-1.5 font-serif text-xs sm:text-sm font-semibold transition-colors cursor-pointer px-2 py-1 rounded-md",
    vintage:
      "group inline-flex items-center gap-1.5 font-handwriting text-xs sm:text-sm font-bold transition-colors cursor-pointer px-2 py-1 rounded-md",
  }[theme];

  const triggerColorStyle = hasTime
    ? {
        modern:
          "text-slate-700 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800/60",
        classic:
          "text-[#1E3A5F]/85 dark:text-[#E2ECF7]/85 hover:text-[#D4AF37] hover:bg-[#EDE7D6]/60 dark:hover:bg-[#1A2636]/60",
        vintage:
          "text-[#4A3525] dark:text-[#E8DCC4] hover:text-[#8C3A27] dark:hover:text-amber-300 hover:bg-[#EBE3D0]/70 dark:hover:bg-[#1C2C3E]/70",
      }[theme]
    : {
        modern:
          "text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800",
        classic:
          "text-[#AA8520]/60 dark:text-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#EDE7D6]/40 border border-dashed border-[#D4AF37]/30",
        vintage:
          "text-[#8A735E]/60 dark:text-[#8E9FA8]/50 hover:text-[#8C3A27] dark:hover:text-amber-300 hover:bg-[#EBE3D0]/50 border border-dashed border-[#D5CAA8]/50",
      }[theme];

  const iconStyle = {
    modern: "opacity-50 group-hover:opacity-100 text-sky-500",
    classic: "opacity-50 group-hover:opacity-100 text-[#D4AF37]",
    vintage: "opacity-50 group-hover:opacity-100 text-[#8C3A27] dark:text-amber-300",
  }[theme];

  const popoverStyle = {
    modern:
      "z-50 w-84 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 text-slate-900 dark:text-slate-100 font-sans",
    classic:
      "z-50 w-84 rounded-xl bg-[#FBF9F2] dark:bg-[#121A26] border border-[#D0C5B0] dark:border-[#1E3048] shadow-2xl p-4 text-[#1E3A5F] dark:text-[#E2ECF7] font-serif",
    vintage:
      "z-50 w-84 rounded-xl bg-[#F7F1E1] dark:bg-[#15202B] border border-[#D5CAA8] dark:border-[#2A3B4E] shadow-2xl p-4 text-[#2A1D13] dark:text-[#FAF4EB] font-serif",
  }[theme];

  const inputNumberStyle = {
    modern:
      "w-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-center text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500",
    classic:
      "w-12 bg-[#EDE7D6]/50 dark:bg-[#1A2636] border border-[#D0C5B0] dark:border-[#2A3B4E] rounded-md px-1.5 py-1 text-center text-xs font-serif font-bold text-[#1E3A5F] dark:text-[#E2ECF7] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]",
    vintage:
      "w-12 bg-[#EBE3D0]/60 dark:bg-[#1C2C3E] border border-[#D5CAA8] dark:border-[#2A3B4E] rounded-md px-1.5 py-1 text-center text-xs font-mono font-bold text-[#2A1D13] dark:text-[#FAF4EB] focus:outline-none focus:ring-1 focus:ring-[#8C3A27]",
  }[theme];

  const periodBtnStyle = (isActive: boolean) => cn(
    "px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
    isActive
      ? theme === "modern"
        ? "bg-sky-500 text-white shadow-xs"
        : theme === "classic"
        ? "bg-[#D4AF37] text-[#1E3A5F] shadow-xs"
        : "bg-[#8C3A27] dark:bg-amber-400 text-white dark:text-[#1A2636] shadow-xs"
      : theme === "modern"
      ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
      : theme === "classic"
      ? "bg-[#EDE7D6] hover:bg-[#E3D8BE] text-[#1E3A5F]/70 dark:bg-[#1A2636] dark:text-[#D4AF37]/70"
      : "bg-[#EBE3D0] hover:bg-[#DFCFA8] text-[#4A3525]/70 dark:bg-[#1C2C3E] dark:text-amber-200/70"
  );

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={cn(triggerStyle, triggerColorStyle)}
        title={hasTime ? "Click to edit entry time & duration" : "Optional: Add entry time & duration"}
      >
        {hasTime ? (
          <>
            <span className="truncate">
              {formatTimeTo12Hour(startTime!)} {durationStr ? `(${durationStr})` : ""}
            </span>
            <Clock className={cn("h-3.5 w-3.5 shrink-0 transition-opacity", iconStyle)} />
          </>
        ) : (
          <>
            <Plus className="h-3 w-3 shrink-0 opacity-60" />
            <span className="text-[11px] font-normal">Add Time</span>
          </>
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="center"
          sideOffset={8}
          className="isolate z-50 outline-none"
        >
          <PopoverPrimitive.Popup className={popoverStyle}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 opacity-70" />
                <span className="font-semibold text-sm">Entry Time & Duration</span>
              </div>
              <div className="flex items-center gap-2">
                {durationStr && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-semibold",
                    theme === "modern" && "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono",
                    theme === "classic" && "bg-[#EDE7D6] dark:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37]",
                    theme === "vintage" && "bg-[#EBE3D0] dark:bg-[#1C2C3E] text-[#6B5542] dark:text-amber-200"
                  )}>
                    {durationStr}
                  </span>
                )}
                {hasTime && (
                  <button
                    type="button"
                    onClick={clearTime}
                    className="text-[10px] opacity-60 hover:opacity-100 text-rose-500 hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Remove time from this entry"
                  >
                    <X className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* 12-Hour AM/PM Time Controls */}
            <div className="space-y-3 mb-3.5">
              {/* Start Time row */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                <span className="text-[11px] font-medium opacity-80 min-w-16">
                  Start Time
                </span>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={startComp.hour12}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                      updateStartComponent({ hour12: val });
                    }}
                    className={inputNumberStyle}
                    aria-label="Start hour"
                  />
                  <span className="font-bold opacity-40">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={String(startComp.minute).padStart(2, "0")}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      updateStartComponent({ minute: val });
                    }}
                    className={inputNumberStyle}
                    aria-label="Start minute"
                  />

                  <div className="flex items-center gap-0.5 ml-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => updateStartComponent({ period: "AM" })}
                      className={periodBtnStyle(startComp.period === "AM")}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStartComponent({ period: "PM" })}
                      className={periodBtnStyle(startComp.period === "PM")}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* End Time row */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                <span className="text-[11px] font-medium opacity-80 min-w-16">
                  End Time
                </span>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={endComp.hour12}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                      updateEndComponent({ hour12: val });
                    }}
                    className={inputNumberStyle}
                    aria-label="End hour"
                  />
                  <span className="font-bold opacity-40">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={String(endComp.minute).padStart(2, "0")}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      updateEndComponent({ minute: val });
                    }}
                    className={inputNumberStyle}
                    aria-label="End minute"
                  />

                  <div className="flex items-center gap-0.5 ml-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => updateEndComponent({ period: "AM" })}
                      className={periodBtnStyle(endComp.period === "AM")}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEndComponent({ period: "PM" })}
                      className={periodBtnStyle(endComp.period === "PM")}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Start time quick presets */}
            <div className="mb-3">
              <span className="block text-[11px] font-medium opacity-70 mb-1.5">
                Quick Start Times
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {COMMON_START_TIMES.map((item) => {
                  const isSelected = hasTime && effectiveStart === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onTimeChange({ startTime: item.value, endTime: effectiveEnd })}
                      className={cn(
                        "text-[11px] py-1 px-1.5 rounded-md font-medium transition-all text-center cursor-pointer",
                        isSelected
                          ? theme === "modern"
                            ? "bg-sky-500 text-white font-semibold"
                            : theme === "classic"
                            ? "bg-[#D4AF37] text-[#1E3A5F] font-bold"
                            : "bg-[#8C3A27] dark:bg-amber-400 text-white dark:text-[#1A2636] font-bold"
                          : theme === "modern"
                          ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          : theme === "classic"
                          ? "bg-[#EDE7D6] hover:bg-[#E3D8BE] text-[#1E3A5F] dark:bg-[#1A2636] dark:hover:bg-[#223348] dark:text-[#D4AF37]"
                          : "bg-[#EBE3D0] hover:bg-[#DFCFA8] text-[#4A3525] dark:bg-[#1C2C3E] dark:hover:bg-[#283C52] dark:text-amber-200"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Set duration presets */}
            <div>
              <span className="block text-[11px] font-medium opacity-70 mb-1.5">
                Set Duration from Start Time
              </span>
              <div className="flex items-center gap-1.5">
                {COMMON_DURATIONS.map((dur) => (
                  <button
                    key={dur.label}
                    type="button"
                    onClick={() => applyDurationPreset(dur.minutes)}
                    className={cn(
                      "flex-1 text-[11px] py-1 px-1 rounded-md font-medium transition-all text-center cursor-pointer",
                      theme === "modern" && "bg-slate-100 hover:bg-sky-50 hover:text-sky-600 dark:bg-slate-800 dark:hover:bg-sky-950/60 dark:hover:text-sky-400",
                      theme === "classic" && "bg-[#EDE7D6] hover:bg-[#E3D8BE] text-[#1E3A5F] dark:bg-[#1A2636] dark:hover:bg-[#223348] dark:text-[#D4AF37]",
                      theme === "vintage" && "bg-[#EBE3D0] hover:bg-[#DFCFA8] text-[#4A3525] dark:bg-[#1C2C3E] dark:hover:bg-[#283C52] dark:text-amber-200"
                    )}
                  >
                    +{dur.label}
                  </button>
                ))}
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
