# Guard Name Local Storage Design

## Goal

When a guard successfully authenticates from `/guard`, save the authenticated guard name in browser local storage. When the guard screen is shown again with a fresh or reset form, prefill the guard name field with the saved name.

## Current Flow

`src/app/guard/page.tsx` renders `Phase1App` with `mode="guard"`. The guard form lives in `src/app/phase1-app.tsx` and submits through `handleGuardAuth`, which posts `name` and `phone` to `/api/guard/auth`. On success it stores the returned `GuardSession` in React state and shows guard action buttons. On failure it clears the guard session and shows an alert.

## Proposed Approach

Use a small local storage helper around one storage key, `ollbareun.guard.name`. Read the value on client mount and store it in `savedGuardName`. Render the guard name input as an uncontrolled field with `defaultValue={savedGuardName}` so it matches the existing `FormData` submit pattern. On successful authentication, write `session.employee.name` to local storage and update `savedGuardName` to the same value.

Authentication failures do not update local storage. This prevents failed attempts, retired employees, or typoed names from replacing the last verified guard name.

## Components And Data Flow

- `Phase1App` owns a new `savedGuardName` string state.
- Initial client effect reads `window.localStorage.getItem("ollbareun.guard.name")`.
- `handleGuardAuth` posts the submitted form values as it does today.
- On successful response, `handleGuardAuth` persists `session.employee.name`.
- The guard name input receives `defaultValue={savedGuardName}`.

## Error Handling

Local storage access is guarded by `typeof window !== "undefined"` and `try/catch`. If local storage is unavailable, blocked, or throws, the app keeps working with an empty default value. API authentication errors continue through the current alert and error message path.

## Testing

Add a focused React test in `src/app/phase1-app.test.tsx` that:

1. Clears local storage.
2. Authenticates successfully as `홍길동`.
3. Verifies `localStorage["ollbareun.guard.name"]` is `홍길동`.
4. Unmounts and renders the guard screen again.
5. Verifies the `경비원 이름` input defaults to `홍길동`.

The existing retired-employee test continues to prove failed authentication does not log the guard in.
