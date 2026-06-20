# Manager Mobile Hamburger Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manager page's small-screen horizontal navigation with an accessible upper-right hamburger button and right-side drawer.

**Architecture:** Keep the manager layout server-rendered and contain all interactive mobile navigation state in `ManagerSidebar`. Render the mobile trigger as a fixed small-screen control aligned with the existing manager header, while preserving the current `lg` desktop sidebar.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library

---

### Task 1: Specify mobile drawer behavior

**Files:**
- Modify: `src/app/manager/layout.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

Add `userEvent`, verify the trigger starts collapsed, click it, assert the dialog and mobile links appear, then close it and assert the dialog disappears.

```tsx
it("opens and closes the mobile manager menu from the header button", async () => {
  const user = userEvent.setup();
  render(
    <ManagerLayout>
      <div>관리자 본문</div>
    </ManagerLayout>,
  );

  const openButton = screen.getByRole("button", { name: "관리자 메뉴 열기" });
  expect(openButton).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("dialog", { name: "관리자 메뉴" })).not.toBeInTheDocument();

  await user.click(openButton);

  expect(openButton).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("dialog", { name: "관리자 메뉴" })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "교육자료관리" })).toHaveLength(2);

  await user.click(screen.getByRole("button", { name: "관리자 메뉴 닫기" }));

  expect(screen.queryByRole("dialog", { name: "관리자 메뉴" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/app/manager/layout.test.tsx`

Expected: FAIL because the `관리자 메뉴 열기` button does not exist.

### Task 2: Implement the hamburger trigger and drawer

**Files:**
- Modify: `src/app/manager/manager-sidebar.tsx`
- Modify: `src/app/manager/layout.tsx`
- Test: `src/app/manager/layout.test.tsx`

- [ ] **Step 1: Implement the minimal interactive drawer**

Replace the horizontal mobile menu with:

- a `lg:hidden` fixed hamburger trigger using Lucide `Menu`;
- a conditional fixed backdrop and right-side dialog;
- a close control using Lucide `X`;
- vertically rendered menu groups and child links;
- close behavior for the close control, backdrop, Escape key, and links;
- body scroll locking while open.

Adjust the manager header from `top-[44px]` to `top-0` because the user's current change removed the 44px black navigation bar.

- [ ] **Step 2: Update existing menu assertions**

At rest, assert against the desktop copy of each link. In the interaction test, assert that opening the drawer creates the second mobile copy.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `npm test -- src/app/manager/layout.test.tsx`

Expected: all manager layout tests PASS.

- [ ] **Step 4: Run static verification**

Run: `npm run lint`

Expected: exit code 0 with no new lint errors.

Run: `npm run build`

Expected: production build completes successfully.

- [ ] **Step 5: Commit implementation**

```bash
git add src/app/manager/layout.tsx src/app/manager/manager-sidebar.tsx src/app/manager/layout.test.tsx
git commit -m "feat: add manager mobile hamburger menu"
```

### Task 3: Publish

**Files:**
- Verify only

- [ ] **Step 1: Review the final diff and repository status**

Run: `git diff HEAD~2 --check && git status --short --branch`

Expected: no whitespace errors and no uncommitted requested changes.

- [ ] **Step 2: Push the current branch**

Run: `git push origin main`

Expected: the remote `main` branch advances to the implementation commit.
