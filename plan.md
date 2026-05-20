# 직원명부관리 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `screen-design.md`의 `직원명부관리` 화면을 독립 라우트로 만들고, 관리자 메뉴에서 바로 이동할 수 있게 연결한다.

**Architecture:** 기존 `Phase1App`의 bootstrap 기반 데이터 흐름을 그대로 재사용한다. 새 라우트 `/manager/employee/employees`는 전용 page 파일에서 `Phase1App`의 새 manager view를 렌더링하고, 목록 필터링은 클라이언트 상태에서만 처리한다. 메뉴 링크는 기존 관리자 사이드바의 직원 관리 섹션에 추가해 진입점을 명확하게 만든다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, existing `/api/bootstrap` route, Vitest + Testing Library.

---

### Task 1: Add the employee roster route and view

**Files:**
- Create: `src/app/manager/employee/employees/page.tsx`
- Modify: `src/app/phase1-app.tsx`
- Test: `src/app/phase1-app.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that renders the new roster route and verifies:
- the page heading is `吏곸썝紐낅?愿由?`
- the `직원등록` action links to `/manager/employee/employees/new`
- the employee list shows rows from the bootstrap payload

```tsx
it("renders the employee roster page", async () => {
  render(<EmployeeRosterPage />);

  expect(await screen.findByRole("heading", { name: "吏곸썝紐낅?愿由?" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "吏곸썝?깅줉" })).toHaveAttribute(
    "href",
    "/manager/employee/employees/new",
  );
  expect(await screen.findByText("?띻만??/ 010-1234-5678")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/phase1-app.test.tsx`
Expected: FAIL because `EmployeeRosterPage` and the new manager view do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/manager/employee/employees/page.tsx`:

```tsx
import { Phase1App } from "../../../../phase1-app";

export default function EmployeeRosterPage() {
  return <Phase1App mode="manager" managerView="employeeList" />;
}
```

Update `src/app/phase1-app.tsx`:
- extend `Phase1AppProps.managerView` to include `"employeeList"`
- add title and description text for the roster view
- add a client-side search input for name/phone filtering
- render a table or list of employees with a register button linking to `/manager/employee/employees/new`
- keep the existing overview, registration, and guard flows unchanged

- [ ] **Step 4: Run test to verify it passes**

Run:
`npm test -- src/app/phase1-app.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/manager/employee/employees/page.tsx src/app/phase1-app.tsx src/app/phase1-app.test.tsx plan.md
git commit -m "feat: add employee roster page"
```

### Task 2: Link the new page from the manager menu

**Files:**
- Modify: `src/app/phase1-app.tsx`
- Test: `src/app/phase1-app.test.tsx`

- [ ] **Step 1: Write the failing test**

Add an assertion on the manager navigation that the employee management section includes a link to `/manager/employee/employees` labeled `吏곸썝紐낅?愿由?`.

```tsx
expect(screen.getByRole("link", { name: "吏곸썝紐낅?愿由?" })).toHaveAttribute(
  "href",
  "/manager/employee/employees",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/phase1-app.test.tsx`
Expected: FAIL because the menu does not yet expose the roster route.

- [ ] **Step 3: Write minimal implementation**

Update the employee management menu group in `src/app/phase1-app.tsx` so the roster item points to `/manager/employee/employees`. Keep the existing links for `직원등록`, `작업장등록`, and `작업장배정`.

- [ ] **Step 4: Run test to verify it passes**

Run:
`npm test -- src/app/phase1-app.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/phase1-app.tsx src/app/phase1-app.test.tsx
git commit -m "feat: link employee roster in menu"
```

### Task 3: Verify the route and publish to `main`

**Files:**
- Modify: none if Tasks 1-2 pass cleanly

- [ ] **Step 1: Run the focused test suite**

Run:
`npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:
`npm run lint`

Expected: no ESLint errors.

- [ ] **Step 3: Verify the route in a browser**

Open `http://localhost:3000/manager/employee/employees` and confirm:
- the roster heading renders
- the search/filter controls appear
- the `직원등록` link navigates to `/manager/employee/employees/new`

- [ ] **Step 4: Push to GitHub main**

Run:
```bash
git push origin main
```

Expected: remote `main` advances with the roster page and menu link changes.
