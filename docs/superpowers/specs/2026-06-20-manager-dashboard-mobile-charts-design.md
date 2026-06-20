# Manager Dashboard Mobile Charts Design

## Goal

Keep the attendance-rate and safety-education-rate chart sections within the manager dashboard's available width on mobile screens.

## Root Cause

Each chart SVG has `min-w-[560px]`. Although its immediate wrapper permits horizontal scrolling, the fixed minimum width contributes a minimum-content width that can make the chart cards and their parent grid wider than the mobile viewport.

## Design

- Preserve the existing chart data, coordinates, labels, aspect ratio, and desktop two-column breakpoint.
- Allow every grid and card boundary in the chart section to shrink with `min-w-0`.
- Replace the SVG's fixed minimum width with `h-auto w-full max-w-full`, allowing its `viewBox` to scale the chart proportionally to the available card width.
- Keep the chart wrapper clipped to its own width rather than requiring horizontal scrolling.
- Do not change unrelated dashboard sections.

## Testing

- Add a dashboard regression test asserting:
  - the chart grid can shrink;
  - both chart cards can shrink;
  - both chart SVGs use responsive width classes and no fixed 560px minimum width.
- Run the focused dashboard test, all tests, lint for changed files, and the production build.
