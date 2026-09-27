import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePalette = "paper" | "sage" | "denim" | "classic" | "midnight";
export type ReadingFont = "sans" | "serif" | "handwriting";

export interface UIState {
  readingMode: boolean;
  broadsheetDensity: "compact" | "editorial" | "spacious";
  fontSizeScale: "sm" | "md" | "lg";
  isCommandPaletteOpen: boolean;
  themePalette: ThemePalette;
  readingFont: ReadingFont;

  // Actions
  toggleReadingMode: () => void;
  setReadingMode: (enabled: boolean) => void;
  setBroadsheetDensity: (density: "compact" | "editorial" | "spacious") => void;
  setFontSizeScale: (scale: "sm" | "md" | "lg") => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setThemePalette: (palette: ThemePalette) => void;
  setReadingFont: (font: ReadingFont) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      readingMode: false,
      broadsheetDensity: "editorial",
      fontSizeScale: "md",
      isCommandPaletteOpen: false,
      themePalette: "paper",
      readingFont: "sans",

      toggleReadingMode: () => set((state) => ({ readingMode: !state.readingMode })),
      setReadingMode: (readingMode) => set({ readingMode }),
      setBroadsheetDensity: (broadsheetDensity) => set({ broadsheetDensity }),
      setFontSizeScale: (fontSizeScale) => set({ fontSizeScale }),
      setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
      setThemePalette: (themePalette) => set({ themePalette }),
      setReadingFont: (readingFont) => set({ readingFont }),
    }),
    {
      name: "the-commons-ui-store",
    }
  )
);
