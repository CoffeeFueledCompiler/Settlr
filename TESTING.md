# Testing

## Suites

| Suite | Tool | What it covers | Command |
|---|---|---|---|
| Unit | Vitest | Pure logic: `splitEqually`, `computeSettlements` (incl. a 200-iteration fuzz test on the balance-sum invariant) | `npm test` |
| Integration | Vitest | Real route handlers (`app/api/**/route.ts` imported and invoked directly, not over HTTP) against a real Postgres, with `@/auth` mocked | `npm test` |
| E2E | Playwright | Full browser flows: sign in → create trip → join → add expenses → end trip → settle up | `npm run test:e2e` |

`npm test` runs unit and integration together (Vitest doesn't distinguish — both are `**/*.test.ts`, integration ones live under `tests/integration/` and `lib/*.test.ts` files that touch the DB say so in their `describe` name).

## Test databases are self-contained — nothing to install or configure

Both suites start their own real, throwaway PostgreSQL via [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) (a real Postgres binary, not a service you need to run yourself):

- Vitest: `tests/setup/global-setup.ts` boots one on port `55433`, applies every migration in `prisma/migrations/`, and tears it down after the run. Route handlers under test go through the normal `lib/prisma.ts` singleton — `vitest.setup.ts` points `DATABASE_URL` at this instance before any test file imports a route handler.
- Playwright: `tests/e2e/global-setup.ts` does the same on port `55434`. The app itself runs as a real `next build && next start -p 3100` (not `next dev` — see gotcha below), with `DATABASE_URL` pointed at that instance and `E2E_TESTING=1` set so the test-only sign-in bypass (see below) is active.

Neither touches your dev database (`prisma dev`) or its seed data.

**Why not `prisma dev`'s own local Postgres for tests?** It runs on [PGlite](https://pglite.dev/) (an in-WASM Postgres), which doesn't hold up under the concurrent connections a real test suite makes — it intermittently drops connections under load. `embedded-postgres` runs an actual Postgres binary and doesn't have this problem.

## Auth in tests

- **Vitest**: `tests/setup/mock-auth.ts` mocks `@/auth`'s `auth()` export directly (`mockSignedInAs(userId)` / `mockSignedOut()`). Route handlers are called as plain functions, so there's no real HTTP/cookie layer to fake.
- **Playwright**: real Google OAuth obviously isn't usable in CI. `auth.ts` registers a second, test-only Credentials provider (`id: "e2e-test"`) *only* when `E2E_TESTING=1` — it's structurally absent otherwise, so it can never accidentally ship or be reachable outside a test run. It upserts a `User` by whatever email you submit, no password. Tests drive it through the real `/api/auth/signin` page (`signInAs()` helper in `tests/e2e/trip-flow.spec.ts`), so the actual sign-in UI gets exercised too.

## Running things

```bash
npm test              # unit + integration (Vitest)
npm run test:watch    # Vitest, watch mode
npm run test:e2e      # Playwright e2e (builds the app first, ~30-40s)
```

No env vars to set, no services to start first — both `npm test` and `npm run test:e2e` are single commands.

## Known gaps (not covered yet)

- **Percentage-split expenses**: `PROJECT_PLAN.md` §5 lists this as an optional fast-follow after equal/custom splits, and it hasn't been built, so there's nothing to test yet.
- **`auth.ts`'s Google-specific `signIn`/`jwt` callback wiring** isn't unit-tested directly (the callbacks live inline in the `NextAuth()` config object, not as standalone exports) — it *is* exercised indirectly by every Playwright test via the real sign-in flow (with the e2e provider instead of Google), and was manually verified against real Google OAuth during development (`/api/auth/providers`, sign-in redirect with `callbackUrl` preserved). If this ever regresses, it'll show up as every Playwright test failing at the sign-in step, not silently.
- **Join-via-QR** isn't separately tested from join-via-typed-code — they hit the exact same `/join/[code]` page and `POST /api/groups/join` route, so there's no separate code path to diverge in the first place (QR just encodes the URL to that page).

## Troubleshooting

**`FATAL: pre-existing shared memory block is still in use` or `initdb: error: directory ... exists but is not empty`**
A previous run's embedded Postgres didn't shut down cleanly (seen on Windows — `stop()`'s own directory cleanup can lose a race with the OS releasing file locks). Both global-setup scripts now wipe their data directory (`.vitest-pg-data`, `.playwright-pg-data`) before starting, which should self-heal on the next run. If it still happens, check for and kill a lingering `postgres` process, then delete the relevant `.{vitest,playwright}-pg-data` directory by hand.

**Playwright: `Another next dev server is already running`**
This is why `test:e2e`'s web server runs `next build && next start` instead of `next dev` — Next's dev-server lock is per-project-directory regardless of port, so it collides with any `next dev` you already have running locally. `next start` doesn't have this restriction, and is more representative of production behavior anyway.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, `npm test`, and `npm run test:e2e` on every push/PR. No Postgres service container needed — see above.
