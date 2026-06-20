# Manager Dashboard Mobile Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both daily-rate chart cards and SVGs stay within the manager dashboard's mobile content width.

**Architecture:** Preserve the existing SVG chart implementation and coordinate system. Remove the SVG minimum-content constraint and add shrink boundaries to the chart grid and cards so the `viewBox` scales each graph proportionally.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Add the mobile-width regression test

**Files:**
- Modify: `src/app/manager/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("keeps both daily charts within the mobile content width", async () => {
  render(<ManagerPage />);

  const attendanceChart = await screen.findByRole("img", { name: "출근율 일별 차트 그래프" });
  const educationChart = screen.getByRole("img", { name: "안전교육 이수율 일별 차트 그래프" });
  const chartGrid = attendanceChart.closest("[data-chart-grid]");
  const chartCards = screen.getAllByTestId("daily-rate-chart");

  expect(chartGrid).toHaveClass("min-w-0");
  expect(chartCards).toHaveLength(2);
  chartCards.forEach((card) => expect(card).toHaveClass("min-w-0", "max-w-full"));
  [attendanceChart, educationChart].forEach((chart) => {
    expect(chart).toHaveClass("h-auto", "w-full", "max-w-full");
    expect(chart).not.toHaveClass("min-w-[560px]");
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/manager/page.test.tsx`

Expected: FAIL because the chart grid/card markers and responsive SVG classes do not exist.

### Task 2: Remove chart minimum-width constraints

**Files:**
- Modify: `src/app/manager/page.tsx`
- Test: `src/app/manager/page.test.tsx`

- [ ] **Step 1: Implement the minimal responsive classes**

Apply these class changes:

```tsx
<section
  data-testid="daily-rate-chart"
  className="min-w-0 max-w-full rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[24px]"
>
```

```tsx
<div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-[14px] border border-hairline bg-canvas p-3">
```

```tsx
<svg className="h-auto w-full max-w-full" viewBox="0 0 560 180" ...>
```

```tsx
<section data-chart-grid className="grid min-w-0 gap-5 xl:grid-cols-2">
```

- [ ] **Step 2: Verify GREEN**

Run: `npm test -- src/app/manager/page.test.tsx`

Expected: both dashboard tests PASS.

- [ ] **Step 3: Run complete verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npx eslint src/app/manager/page.tsx src/app/manager/page.test.tsx`

Expected: exit code 0.

Run: `npm run build`

Expected: production build completes successfully.

- [ ] **Step 4: Commit and publish**

```bash
git add src/app/manager/page.tsx src/app/manager/page.test.tsx
git commit -m "fix: keep manager dashboard charts within mobile width"
git push origin main
```
