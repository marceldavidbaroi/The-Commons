import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UIState {
  readingMode: boolean;
  broadsheetDensity: "compact" | "editorial" | "spacious";
  fontSizeScale: "sm" | "md" | "lg";
  isCommandPaletteOpen: boolean;

  // Actions
  toggleReadingMode: () => void;
  setReadingMode: (enabled: boolean) => void;
  setBroadsheetDensity: (density: "compact" | "editorial" | "spacious") => void;
  setFontSizeScale: (scale: "sm" | "md" | "lg") => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      readingMode: false,
      broadsheetDensity: "editorial",
      fontSizeScale: "md",
      isCommandPaletteOpen: false,

      toggleReadingMode: () => set((state) => ({ readingMode: !state.readingMode })),
      setReadingMode: (readingMode) => set({ readingMode }),
      setBroadsheetDensity: (broadsheetDensity) => set({ broadsheetDensity }),
      setFontSizeScale: (fontSizeScale) => set({ fontSizeScale }),
      setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
    }),
    {
      name: "the-commons-ui-store",
    }
  )
);
