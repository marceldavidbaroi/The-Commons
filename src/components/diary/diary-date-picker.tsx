"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Popover as PopoverPrimitive,
} from "@base-ui/react/popover";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "cn";
import type { DiaryEntry, DiaryTheme } from "@/types/diary";

interface DiaryDatePickerProps {
  currentEntry: DiaryEntry;
  theme: DiaryTheme;
  onDateSelect: (payload: {
    entryDate: string;
    dateStr: string;
    dayOfWeek: string;
    yearStr: string;
  }) => void;
  calculateDuration?: (start: string, end: string) => string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseEntryDate(rawDate?: string): Date {
  if (!rawDate) return new Date();
  const parts = rawDate.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DiaryDatePicker({
  currentEntry,
  theme,
  onDateSelect,
}: DiaryDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = useMemo(() => {
    return parseEntryDate(currentEntry.entryDate);
  }, [currentEntry.entryDate]);

  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());

  // Sync viewed month when selected date changes externally
  useEffect(() => {
    if (isOpen) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [isOpen, selectedDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const selectDate = (date: Date) => {
    const raw = formatDateToISO(date);
    const dateStr = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const yearStr = `Anno ${date.getFullYear()}`;

    onDateSelect({
      entryDate: raw,
      dateStr,
      dayOfWeek,
      yearStr,
    });
    setIsOpen(false);
  };

  // Calendar matrix computation
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const prevMonthDaysCount = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  const calendarDays = useMemo(() => {
    const days: Array<{
      day: number;
      monthOffset: -1 | 0 | 1;
      date: Date;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();
    const todayISO = formatDateToISO(today);
    const selectedISO = formatDateToISO(selectedDate);

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const date = new Date(viewYear, viewMonth - 1, d);
      const iso = formatDateToISO(date);
      days.push({
        day: d,
        monthOffset: -1,
        date,
        isToday: iso === todayISO,
        isSelected: iso === selectedISO,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const iso = formatDateToISO(date);
      days.push({
        day: d,
        monthOffset: 0,
        date,
        isToday: iso === todayISO,
        isSelected: iso === selectedISO,
      });
    }

    // Next month filler days (fill up to 35 or 42 grid slots)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const date = new Date(viewYear, viewMonth + 1, d);
      const iso = formatDateToISO(date);
      days.push({
        day: d,
        monthOffset: 1,
        date,
        isToday: iso === todayISO,
        isSelected: iso === selectedISO,
      });
    }

    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDayIndex, prevMonthDaysCount, selectedDate]);

  // Theme-based trigger styling
  const triggerStyle = {
    modern:
      "group inline-flex items-center gap-1.5 font-sans text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight hover:text-sky-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60",
    classic:
      "group inline-flex items-center gap-1.5 font-serif text-sm sm:text-base font-bold text-[#1E3A5F] dark:text-[#E2ECF7] tracking-wide hover:text-[#D4AF37] transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-[#EDE7D6]/60 dark:hover:bg-[#1A2636]/60",
    vintage:
      "group inline-flex items-center gap-1.5 font-handwriting text-sm sm:text-base md:text-lg font-bold text-[#2A1D13] dark:text-[#FAF4EB] tracking-wide hover:text-[#8C3A27] dark:hover:text-amber-300 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-[#EBE3D0]/70 dark:hover:bg-[#1C2C3E]/70",
  }[theme];

  const iconStyle = {
    modern: "opacity-40 group-hover:opacity-100 text-sky-500",
    classic: "opacity-40 group-hover:opacity-100 text-[#D4AF37]",
    vintage: "opacity-40 group-hover:opacity-100 text-[#8C3A27] dark:text-amber-300",
  }[theme];

  // Popover container style per theme
  const popoverStyle = {
    modern:
      "z-50 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 text-slate-900 dark:text-slate-100 font-sans",
    classic:
      "z-50 w-76 rounded-xl bg-[#FBF9F2] dark:bg-[#121A26] border border-[#D0C5B0] dark:border-[#1E3048] shadow-2xl p-3.5 text-[#1E3A5F] dark:text-[#E2ECF7] font-serif",
    vintage:
      "z-50 w-76 rounded-xl bg-[#F7F1E1] dark:bg-[#15202B] border border-[#D5CAA8] dark:border-[#2A3B4E] shadow-2xl p-3.5 text-[#2A1D13] dark:text-[#FAF4EB] font-serif",
  }[theme];

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={triggerStyle}
        title="Click to select entry date"
      >
        <span className="truncate">
          {currentEntry.dayOfWeek}, {currentEntry.dateStr}
        </span>
        <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0 transition-opacity", iconStyle)} />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="center"
          sideOffset={8}
          className="isolate z-50 outline-none"
        >
          <PopoverPrimitive.Popup className={popoverStyle}>
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">
                  {MONTH_NAMES[viewMonth]}
                </span>
                <span className="text-xs opacity-70 font-mono">
                  {viewYear}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className={cn(
                    "p-1 rounded-md transition-colors cursor-pointer",
                    theme === "modern" && "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300",
                    theme === "classic" && "hover:bg-[#EDE7D6] dark:hover:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37]",
                    theme === "vintage" && "hover:bg-[#EBE3D0] dark:hover:bg-[#1C2C3E] text-[#8C3A27] dark:text-amber-300"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className={cn(
                    "p-1 rounded-md transition-colors cursor-pointer",
                    theme === "modern" && "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300",
                    theme === "classic" && "hover:bg-[#EDE7D6] dark:hover:bg-[#1A2636] text-[#1E3A5F] dark:text-[#D4AF37]",
                    theme === "vintage" && "hover:bg-[#EBE3D0] dark:hover:bg-[#1C2C3E] text-[#8C3A27] dark:text-amber-300"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                className={cn(
                  "flex-1 text-[11px] py-1 px-2 rounded-md font-medium transition-all text-center cursor-pointer",
                  theme === "modern" && "bg-slate-100 hover:bg-sky-50 hover:text-sky-600 dark:bg-slate-800 dark:hover:bg-sky-950/60 dark:hover:text-sky-400",
                  theme === "classic" && "bg-[#EDE7D6] hover:bg-[#E3D8BE] text-[#1E3A5F] dark:bg-[#1A2636] dark:hover:bg-[#223348] dark:text-[#D4AF37]",
                  theme === "vintage" && "bg-[#EBE3D0] hover:bg-[#DFCFA8] text-[#4A3525] dark:bg-[#1C2C3E] dark:hover:bg-[#283C52] dark:text-amber-200"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  selectDate(y);
                }}
                className={cn(
                  "flex-1 text-[11px] py-1 px-2 rounded-md font-medium transition-all text-center cursor-pointer",
                  theme === "modern" && "bg-slate-100 hover:bg-sky-50 hover:text-sky-600 dark:bg-slate-800 dark:hover:bg-sky-950/60 dark:hover:text-sky-400",
                  theme === "classic" && "bg-[#EDE7D6] hover:bg-[#E3D8BE] text-[#1E3A5F] dark:bg-[#1A2636] dark:hover:bg-[#223348] dark:text-[#D4AF37]",
                  theme === "vintage" && "bg-[#EBE3D0] hover:bg-[#DFCFA8] text-[#4A3525] dark:bg-[#1C2C3E] dark:hover:bg-[#283C52] dark:text-amber-200"
                )}
              >
                Yesterday
              </button>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_OF_WEEK.map((day) => (
                <span
                  key={day}
                  className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-0.5"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((item, idx) => {
                const isDifferentMonth = item.monthOffset !== 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDate(item.date)}
                    className={cn(
                      "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer relative",
                      isDifferentMonth && "opacity-30 hover:opacity-70",
                      
                      // Modern theme variants
                      theme === "modern" && [
                        !item.isSelected && !isDifferentMonth && "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
                        item.isToday && !item.isSelected && "font-bold text-sky-600 dark:text-sky-400",
                        item.isSelected && "bg-sky-500 text-white font-bold shadow-sm shadow-sky-500/20"
                      ],

                      // Classic theme variants
                      theme === "classic" && [
                        !item.isSelected && !isDifferentMonth && "hover:bg-[#EDE7D6] dark:hover:bg-[#1A2636] text-[#1E3A5F] dark:text-[#E2ECF7]",
                        item.isToday && !item.isSelected && "font-bold text-[#D4AF37]",
                        item.isSelected && "bg-[#D4AF37] text-[#1E3A5F] font-bold shadow-sm"
                      ],

                      // Vintage theme variants
                      theme === "vintage" && [
                        !item.isSelected && !isDifferentMonth && "hover:bg-[#EBE3D0] dark:hover:bg-[#1C2C3E] text-[#2A1D13] dark:text-[#FAF4EB]",
                        item.isToday && !item.isSelected && "font-bold text-[#8C3A27] dark:text-amber-300",
                        item.isSelected && "bg-[#8C3A27] dark:bg-amber-400 text-white dark:text-[#1A2636] font-bold shadow-sm"
                      ]
                    )}
                  >
                    {item.day}
                    {item.isToday && !item.isSelected && (
                      <span className={cn(
                        "absolute bottom-1 w-1 h-1 rounded-full",
                        theme === "modern" && "bg-sky-500",
                        theme === "classic" && "bg-[#D4AF37]",
                        theme === "vintage" && "bg-[#8C3A27] dark:bg-amber-300"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
