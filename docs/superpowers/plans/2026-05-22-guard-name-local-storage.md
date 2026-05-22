# Guard Name Local Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the authenticated guard name in browser local storage and use it as the default guard name on later guard screen loads.

**Architecture:** Keep the existing `Phase1App` guard form as a `FormData`-based uncontrolled form. Add a single local storage key and client-only helper functions in `src/app/phase1-app.tsx`; load the stored name after mount and write only after successful guard authentication.

**Tech Stack:** Next.js App Router client component, React state/effects, Vitest, React Testing Library, jsdom localStorage.

---

### Task 1: Persist And Prefill Guard Name

**Files:**
- Modify: `src/app/phase1-app.test.tsx`
- Modify: `src/app/phase1-app.tsx`

- [x] **Step 1: Write the failing test**

Add this test inside the existing `describe("guard page", () => { ... })` block in `src/app/phase1-app.test.tsx`, after the test named `shows the guard action buttons only after login succeeds`:

```tsx
  it("saves the authenticated guard name and uses it as the next default name", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({
          employees: [],
          worksites: [],
          assignments: [],
          attendance: [],
          summary: { totalEmployees: 0, currentlyClockedIn: 0 },
        });
      }
      if (init?.method === "POST" && url.endsWith("/api/guard/auth")) {
        return Response.json({
          employee: {
            id: "emp-1",
            name: "홍길동",
            phone: "010-1234-5678",
            phone_normalized: "01012345678",
            is_retired: false,
          },
          assignment: null,
          worksite: null,
          attendance: null,
        });
      }
      return Response.json({}, { status: 404 });
    });

    const { unmount } = render(<Phase1App mode="guard" />);

    await user.type(screen.getByLabelText("경비원 이름"), "홍길동");
    await user.type(screen.getByLabelText("경비원 연락처"), "010-1234-5678");
    await user.click(screen.getByRole("button", { name: "경비원 인증" }));

    expect(localStorage.getItem("ollbareun.guard.name")).toBe("홍길동");

    unmount();
    render(<Phase1App mode="guard" />);

    expect(await screen.findByLabelText("경비원 이름")).toHaveValue("홍길동");
  });
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/app/phase1-app.test.tsx
```

Expected: the new test fails because `localStorage.getItem("ollbareun.guard.name")` is `null`.

- [x] **Step 3: Write minimal implementation**

In `src/app/phase1-app.tsx`, add a storage key near the existing constants:

```tsx
const guardNameStorageKey = "ollbareun.guard.name";
```

Inside `Phase1App`, add state:

```tsx
  const [savedGuardName, setSavedGuardName] = useState("");
```

Add a client-only effect after the existing bootstrap loading effect:

```tsx
  useEffect(() => {
    try {
      const storedGuardName = window.localStorage.getItem(guardNameStorageKey);
      if (storedGuardName) {
        setSavedGuardName(storedGuardName);
      }
    } catch {
      setSavedGuardName("");
    }
  }, []);
```

In `handleGuardAuth`, after `setGuard(session);`, persist the authenticated name:

```tsx
      setSavedGuardName(session.employee.name);
      try {
        window.localStorage.setItem(guardNameStorageKey, session.employee.name);
      } catch {
        // Keep authentication usable when storage is unavailable.
      }
```

Update the guard name input:

```tsx
                    <input className="field" defaultValue={savedGuardName} id="guard-name" name="name" placeholder="이름을 입력하세요." required />
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/app/phase1-app.test.tsx
```

Expected: all tests in `src/app/phase1-app.test.tsx` pass.

- [x] **Step 5: Run broader verification**

Run:

```bash
npm test
npm run lint
```

Expected: both commands pass.

- [x] **Step 6: Commit implementation**

```bash
git add src/app/phase1-app.tsx src/app/phase1-app.test.tsx docs/superpowers/plans/2026-05-22-guard-name-local-storage.md
git commit -m "feat: persist guard name locally"
```
