# Rendering Performance Rule: Avoid Blur Effects

## Rule
**Never use CSS blur filters or backdrop-blur in UI components, headers, dialogs, shadows, or overlays.**

### Rationale
- `backdrop-blur-*`, `backdrop-filter: blur()`, and `filter: blur()` force the browser compositor to trigger continuous multi-pass offscreen rasterization and GPU layer blits during scrolling, animations, and modal interactions.
- On standard hardware and mobile devices, backdrop filters degrade frame rates significantly (often dropping from 60/120 FPS down to 15-20 FPS).

### Enforcement Guidelines
1. **Backdrop Overlays & Modals**:
   - Use clean, solid/semi-transparent background colors without blur (e.g. `bg-black/60`, `bg-black/75`, `bg-slate-950/80`).
2. **Sticky Headers & Navigation Bars**:
   - Use solid or opaque theme backgrounds (e.g. `bg-background`, `bg-white dark:bg-slate-900`) with clean hairline borders (`border-b border-border`).
3. **Cards & Surface Containers**:
   - Use crisp solid backgrounds (`bg-card`, `bg-popover`, `bg-background`) with standard utility borders.
4. **Shadows & Elevation**:
   - Use hardware-accelerated CSS `box-shadow` (`shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xl`) instead of stacked SVG `filter: drop-shadow()` or simulated `blur-*` elements.
