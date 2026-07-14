# Education Reminder Scheduled Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scheduled reminders reuse the same production Web Push sender as the successful manager action.

**Architecture:** Supabase retains schedule orchestration and run history. It calls an authenticated Vercel cron API that uses the existing Node `web-push` sender and production VAPID credentials.

**Tech Stack:** TypeScript, Next.js Route Handlers, Supabase Edge Functions, Vitest.

---

### Task 1: Add failing authentication and client tests

**Files:**
- Modify: `src/app/api/cron/education-reminders/route.test.ts`
- Create: `supabase/functions/education-reminders/reminder-client.test.ts`

- [ ] Test shared-secret route authentication.
- [ ] Test Edge-to-Vercel request headers and downstream errors.
- [ ] Run focused tests and confirm they fail before implementation.

### Task 2: Implement shared sender client

**Files:**
- Create: `supabase/functions/education-reminders/reminder-client.ts`
- Modify: `src/app/api/cron/education-reminders/route.ts`

- [ ] Accept either Vercel Cron or the configured shared secret.
- [ ] Call the production cron API with `x-cron-secret`.
- [ ] Validate the downstream response.
- [ ] Run focused tests and confirm they pass.

### Task 3: Simplify the Edge Function

**Files:**
- Modify: `supabase/functions/education-reminders/index.ts`
- Modify: `supabase/functions/education-reminders/deno.json`
- Delete: `supabase/functions/education-reminders/push-utils.ts`
- Delete: `supabase/functions/education-reminders/push-utils.test.ts`

- [ ] Preserve scheduling, duplicate prevention, and run history.
- [ ] Replace direct Web Push delivery with `requestEducationReminders`.
- [ ] Remove Edge VAPID dependencies.

### Task 4: Configure and deploy

- [ ] Set `EDUCATION_REMINDER_CRON_SECRET` in Vercel production.
- [ ] Set `EDUCATION_REMINDER_API_URL` in Supabase.
- [ ] Deploy Vercel through the main branch.
- [ ] Deploy the Edge Function.

### Task 5: Verify

- [ ] Run focused tests, TypeScript, full Vitest, lint, and production build.
- [ ] Temporarily include the current minute in the schedule.
- [ ] Invoke the Edge Function with the shared secret.
- [ ] Restore `09:10, 21:40`.
- [ ] Verify a new push run has two successful deliveries and no failures.

### Task 6: Publish

- [ ] Exclude pre-existing `docs/walkthrough.md` and `supabase/.temp/cli-latest` changes.
- [ ] Commit only this fix.
- [ ] Push `main` to `origin/main`.
