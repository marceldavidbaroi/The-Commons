import React from "react";
import {
  Sun,
  CloudSun,
  CloudRain,
  Moon,
  Heart,
  Trash2,
} from "lucide-react";
import type { DiaryTheme } from "@/types/diary";

export interface WeatherItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  inkNote: string;
}

export const WEATHER_LIST: WeatherItem[] = [
  { id: "sunny", label: "Sunny", icon: Sun, inkNote: "Warm & Clear" },
  { id: "cloudy", label: "Overcast", icon: CloudSun, inkNote: "Misty & Mild" },
  { id: "rainy", label: "Rainy", icon: CloudRain, inkNote: "Soft Rains" },
  { id: "night", label: "Clear Night", icon: Moon, inkNote: "Starlit Sky" },
];

export function PencilHeart({ filled, theme }: { filled: boolean; theme: DiaryTheme }) {
  if (theme === "modern") {
    return (
      <Heart
        className={`w-5 h-5 transition-all ${
          filled
            ? "text-rose-500 fill-rose-500 scale-110"
            : "text-slate-400 hover:text-rose-400"
        }`}
      />
    );
  }

  if (theme === "classic") {
    return (
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {filled ? (
          <path
            d="M16 27 C15.5 26.5 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 26.5 16 27 Z"
            fill="#D4AF37"
            stroke="#AA8520"
            strokeWidth="1.5"
          />
        ) : (
          <path
            d="M16 27 C15.5 26.5 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 26.5 16 27 Z"
            stroke="#D4AF37"
            strokeWidth="1.5"
            className="opacity-70 hover:opacity-100"
          />
        )}
      </svg>
    );
  }

  // Vintage Old Book Theme
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {filled ? (
        <>
          <path
            d="M16 27.5 C15.5 27 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 27 16 27.5 Z"
            fill="#B23A2B"
            opacity="0.85"
          />
          <path
            d="M9 10 L23 10 M8 13 L24 13 M9 16 L23 16 M11 19 L21 19"
            stroke="#731C13"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="1.5 1.5"
            opacity="0.8"
          />
          <path
            d="M16 27.5 C15.5 27 4.5 19.5 4.2 11 C4 6 7.3 3.8 11.3 3.8 C13.7 3.8 15.2 5.1 16 6.1 C16.8 5.1 18.3 3.8 20.7 3.8 C24.7 3.8 28 6 27.8 11 C27.5 19.5 16.5 27 16 27.5 Z"
            stroke="#5A140C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M16 27.2 C15.5 26.8 4.6 19.5 4.3 11 C4.1 6.3 7.4 4.2 11.3 4.2 C13.6 4.2 15.1 5.4 16 6.4 C16.9 5.4 18.4 4.2 20.7 4.2 C24.6 4.2 27.9 6.3 27.7 11 C27.4 19.5 16.5 26.8 16 27.2 Z"
          stroke="#5C4A3A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dark:stroke-[#94A8BA]"
        />
      )}
    </svg>
  );
}

export function PencilDelete({ theme }: { theme: DiaryTheme }) {
  if (theme === "modern") {
    return <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500 transition-colors" />;
  }

  if (theme === "classic") {
    return (
      <svg viewBox="0 0 32 32" className="w-4.5 h-4.5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 10 H26 M12 10 V7 C12 6.2 12.8 5.5 13.6 5.5 H18.4 C19.2 5.5 20 6.2 20 7 V10 M23.5 10 L22.2 24.5 C22.1 25.6 21.2 26.5 20.1 26.5 H11.9 C10.8 26.5 9.9 25.6 9.8 24.5 L8.5 10"
          stroke="#AA8520"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.5 14.5 V21.5 M18.5 14.5 V21.5" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // Vintage handdrawn ink delete/strikeout icon
  return (
    <svg viewBox="0 0 32 32" className="w-4.5 h-4.5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 10.2 C11.5 9.1 19.5 9.1 25.5 10.2 M12.5 9.2 C12.7 6.8 14.2 5.2 16 5.2 C17.8 5.2 19.3 6.8 19.5 9.2"
        stroke="#8C3A27"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-80 group-hover:opacity-100 dark:stroke-[#E59375]"
      />
      <path
        d="M8.8 11 L10.1 25.4 C10.2 26.5 11.2 27.5 12.4 27.5 L19.6 27.5 C20.8 27.5 21.8 26.5 21.9 25.4 L23.2 11"
        stroke="#8C3A27"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-80 group-hover:opacity-100 dark:stroke-[#E59375]"
      />
      <path
        d="M13.2 15 L13.2 22.5 M18.8 15 L18.8 22.5"
        stroke="#5A140C"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.5 2"
        className="opacity-70 group-hover:opacity-100 dark:stroke-[#F1A288]"
      />
    </svg>
  );
}
