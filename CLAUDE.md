# Settlr

Group trip expense tracker. Members log payments as they happen; when the trip ends, the app nets everyone's balances down to the minimum number of actual payments — like a bank clearing a ledger instead of moving money per transaction.

Full technical plan: `PROJECT_PLAN.md` (read this first — data model, algorithm, API surface, build order).

## Stack

Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma + Auth.js (Google only) + Tailwind. Money is always stored as integer cents, never float/Decimal. See `PROJECT_PLAN.md` §3 for why.

## Subagents

This project uses scoped subagents in `.claude/agents/`. Each owns one slice of the system and should stay inside it — cross-cutting changes (e.g. a schema change that affects three features) should be called out explicitly rather than made silently by whichever agent notices first.

- `database-schema-agent` — Prisma schema, migrations, seed data
- `auth-agent` — Google OAuth, sessions, route protection
- `groups-agent` — group creation, join codes, QR generation/scanning, membership
- `payments-agent` — expenses, splits, expense feed UI
- `settlement-agent` — the netting algorithm, End trip flow, settle-up screen
- `frontend-ui-agent` — shared neumorphic component library and visual polish
- `testing-agent` — writes and runs unit/integration/e2e tests against every other agent's work; treat its failures as blocking, not advisory

## Framework version notes (read before writing route handlers or DB code)

This project is on Next.js 16 and Prisma 7 — both newer than most training data assumes:

- **Route handler / page `params` are async.** `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`. Same for `searchParams`. Forgetting `await` is a silent type error, not a runtime crash you'll notice immediately.
- **Prisma Client requires an explicit driver adapter** — there is no more implicit connection from `schema.prisma`'s `url = env(...)`. Always import the shared singleton from `lib/prisma.ts` (`PrismaClient` + `PrismaPg` adapter) rather than instantiating `PrismaClient` directly. The generated client lives at `app/generated/prisma` (gitignored), not `node_modules/@prisma/client` — import types from there if you need them directly.
- Prisma CLI config lives in `prisma7.config.ts` (not `prisma.config.ts` — that's this Prisma version's actual expected filename, confirmed via `prisma validate`, not a typo).
- Local dev DB: `npx prisma dev --name settlr --detach` runs a disposable local Postgres; `DATABASE_URL` in `.env` already points at it. Swap to real Neon/Supabase for anything beyond local dev.
- Auth is `next-auth@beta` (Auth.js v5 — the `latest` npm tag is still v4, always install `@beta`). Env vars are `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` (v5's `AUTH_<PROVIDER>_ID|SECRET` auto-inference), not the `GOOGLE_CLIENT_ID`/`NEXTAUTH_*` names in `PROJECT_PLAN.md` §6/§9 — those predate the v5 convention. Config lives in `auth.ts` at the project root; `getSessionUserOrThrow()` in `lib/session.ts` is the shared 401 check every mutating route handler should use.
- **`middleware.ts` is deprecated in Next 16 — use `proxy.ts`** (same API, default export or a `proxy` named export, `matcher` config unchanged). This isn't cosmetic: the deprecated `middleware.ts` convention still defaults to the Edge runtime, which can't load the generated Prisma client (`node:url`/`node:path` aren't available there) — it'll build but silently mis-warn until it breaks. `proxy.ts` defaults to the Node.js runtime, which is what route protection here needs since `auth.ts` touches the DB.
- Testing: `npm test` (Vitest, unit+integration) / `npm run test:e2e` (Playwright) — both are single commands, no external Postgres or manual setup needed (each spins up its own real, throwaway Postgres via `embedded-postgres`, not `prisma dev`'s PGlite, which can't handle concurrent test connections). `auth.ts` has a test-only Credentials provider gated behind `E2E_TESTING=1` for Playwright — it doesn't exist otherwise. See `TESTING.md`.

## Conventions

- All money fields are `Int` cents in the DB and in API payloads. Format to currency only at the render layer with `Intl.NumberFormat`.
- Validate every API route's input with a Zod schema; reuse the same schema on the client form.
- Server components for read-heavy pages (dashboard, expense feed); client components only where interactivity is required (forms, the QR scanner, the settle-up confirmation).
- Every route handler that mutates data must check the caller is a member of the group in question — never trust a `groupId` in the body/path alone.
- Design tokens: base `#CBCBCB`, ink `#4A4A4A`, cream `#FFFFE3`, slate accent `#6D8196`, defined once in `app/globals.css` (Tailwind v4 `@theme` + `@utility shadow-raised`/`shadow-pressed`/etc. — use `@utility`, not a plain CSS class, or variants like `active:`/`focus:` silently compile to nothing). Shared components live in `components/ui/` (`Card`, `Button`/`LinkButton`, `Avatar`, `NavBar`, `StatBlock`, `CategoryChip`/`FilterChip`, `TextInput`) — compose these, don't hand-roll new shadow/color values or one-off buttons/inputs in feature code. The dark ledger-panel treatment (`shadow-raised-ink`, `bg-ink`) is reserved for the settle-up screen only.

## Definition of done for any feature

1. Route handlers have Zod validation and a membership/ownership check.
2. Prisma schema changes have a migration committed, not just a schema edit.
3. `testing-agent` has added coverage for the new behavior and it passes.
4. UI uses the shared neumorphic component classes, not one-off styles.
