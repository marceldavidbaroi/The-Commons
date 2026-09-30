"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

/**
 * Synchronizes the user's active theme palette and reading typography
 * with the root <html> element attributes without flashing or re-render overhead.
 */
export function ThemeSynchronizer() {
  const themePalette = useUIStore((state) => state.themePalette);
  const readingFont = useUIStore((state) => state.readingFont);

  useEffect(() => {
    const root = document.documentElement;

    // Apply theme palette attribute
    root.setAttribute("data-theme", themePalette || "denim");

    // Toggle dark class when midnight is active for backwards compatibility
    if (themePalette === "midnight") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply reading font attribute
    root.setAttribute("data-reading-font", readingFont || "sans");
  }, [themePalette, readingFont]);

  return null;
}
