# Education Reminder Scheduled Delivery Design

## Problem

The manager education-reminder button succeeds from the Next.js server, while the scheduled Supabase Edge Function receives HTTP 403 from the push service.

Production diagnostics exposed the exact push-service response: the VAPID credentials used by the Edge Function do not correspond to the credentials used to create the browser subscriptions.

## Root Cause

The browser subscriptions were created with the VAPID public key embedded in the Vercel production client. The matching private key is a sensitive Vercel environment variable and cannot be exported through the CLI. The Edge Function held a separate key pair, so its direct Web Push requests were rejected.

Maintaining two independent Web Push senders also allowed their runtime, credentials, and behavior to drift.

## Design

1. Keep scheduling, duplicate prevention, and run-history recording in the Supabase Edge Function.
2. Move actual scheduled delivery through the existing Next.js server sender used by the working manager button.
3. Add shared-secret authentication to the Next.js cron route while preserving Vercel Cron user-agent support.
4. Configure the Edge Function with the stable production cron API URL and call it with `x-cron-secret`.
5. Remove VAPID and Web Push implementation details from the Edge Function.

## Error Handling

- The Edge Function rejects requests without its cron secret.
- The Next.js cron route rejects requests that are neither Vercel Cron nor authenticated with the shared secret.
- Non-success downstream responses become failed push-run records with the HTTP status and returned error.
- Successful downstream results are stored unchanged in `push_notification_runs`.

## Testing

- Route test for Vercel Cron authentication.
- Route test for shared-secret authentication.
- Route test for unauthorized requests.
- Client tests for request headers, result parsing, and downstream failure details.
- TypeScript, full Vitest, lint, and production build checks.
- Production invocation through the Supabase Edge Function with temporary schedule restoration and database verification.

## Deployment

The same `EDUCATION_REMINDER_CRON_SECRET` is configured in Vercel production and Supabase. Supabase also receives `EDUCATION_REMINDER_API_URL=https://ollbareun.vercel.app/api/cron/education-reminders`. The Vercel deployment must complete before the final Edge Function production test.
