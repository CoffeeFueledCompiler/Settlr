# Settlr — technical plan

Group trip expense tracker that lets a group log every payment as it happens, then settle everyone up in one shot — like a bank clearing a ledger — instead of tracking who-owes-who transaction by transaction.

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Route handlers for API, server components for data-heavy pages |
| Language | TypeScript | strict mode on |
| Database | PostgreSQL | hosted on Neon or Supabase for easy branching |
| ORM | Prisma | migrations + type-safe client |
| Auth | Auth.js (NextAuth) v5, Google provider only | no email/password |
| Styling | Tailwind CSS + a small neumorphic component layer | matches the approved mock UI (base #CBCBCB, ink #4A4A4A, cream #FFFFE3, slate #6D8196) |
| QR codes | `qrcode` (server-side SVG/PNG generation) + `@zxing/browser` or device camera input for scanning | |
| Validation | Zod | shared schemas between client forms and API route handlers |
| Testing | Vitest (unit/integration) + Playwright (e2e) | see `testing-agent.md` |
| Hosting | Vercel | pairs cleanly with Neon/Supabase Postgres |

## 2. Core concept

1. A user signs in with Google.
2. They create a **group** (a trip). The group gets a unique **6-character alphanumeric join code** and a **QR code** that encodes a join link.
3. Other users join the group either by scanning the QR or by typing in the 6-character code.
4. Members log **payments** (expenses) into the group as they happen — no running balance is shown as gospel, expenses just accumulate. Each expense records who paid and how it's split across members.
5. When the trip is over, any member (or just the creator — see open question below) taps **End trip**.
6. The server computes each member's **net balance** (what they paid in, minus their share of everything), then runs a **debt-simplification algorithm** to reduce all the raw IOUs into the minimum number of actual payments needed to zero everyone out — the same principle a bank uses when it nets out obligations at settlement rather than moving money for every individual transaction.
7. The group is locked (`ACTIVE` → `SETTLED`); no more expenses can be added; the final payment list is shown and members can mark individual settlements as paid.

## 3. Data model

```prisma
enum GroupStatus {
  ACTIVE
  SETTLED
}

enum SettlementStatus {
  PENDING
  PAID
}

model User {
  id              String         @id @default(cuid())
  googleId        String         @unique
  email           String         @unique
  name            String
  avatarUrl       String?
  createdAt       DateTime       @default(now())

  memberships     GroupMember[]
  createdGroups   Group[]        @relation("GroupCreator")
  expensesPaid    Expense[]      @relation("ExpensePaidBy")
  splits          ExpenseSplit[]
  settlementsFrom Settlement[]   @relation("SettlementFrom")
  settlementsTo   Settlement[]   @relation("SettlementTo")
}

model Group {
  id          String        @id @default(cuid())
  name        String
  joinCode    String        @unique // 6 chars, uppercase, unambiguous alphabet
  createdById String
  createdBy   User          @relation("GroupCreator", fields: [createdById], references: [id])
  status      GroupStatus   @default(ACTIVE)
  createdAt   DateTime      @default(now())
  settledAt   DateTime?

  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id       String   @id @default(cuid())
  groupId  String
  userId   String
  joinedAt DateTime @default(now())

  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Expense {
  id          String         @id @default(cuid())
  groupId     String
  paidById    String
  amountCents Int            // store money as integer minor units, never float
  description String
  category    String?        // "stays" | "food" | "transport" | "activities" | "other"
  createdAt   DateTime       @default(now())

  group       Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy      User           @relation("ExpensePaidBy", fields: [paidById], references: [id])
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id              String  @id @default(cuid())
  expenseId       String
  userId          String
  shareCents      Int     // that member's share of this expense, integer minor units

  expense         Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user            User    @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
}

model Settlement {
  id          String            @id @default(cuid())
  groupId     String
  fromUserId  String
  toUserId    String
  amountCents Int
  status      SettlementStatus  @default(PENDING)
  createdAt   DateTime          @default(now())

  group       Group             @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromUser    User              @relation("SettlementFrom", fields: [fromUserId], references: [id])
  toUser      User              @relation("SettlementTo", fields: [toUserId], references: [id])
}
```

**Why integer cents, not `Decimal`/`float`:** debt-simplification math involves repeated subtraction across many users; floating point drift is exactly the kind of bug that erodes trust in a money app. Store `amountCents`, format with `Intl.NumberFormat` only at render time.

## 4. Join code and QR

- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (36 chars minus `0/O/1/I/L` to avoid visual ambiguity when read off a phone screen).
- Generate 6 random characters from that alphabet, check uniqueness against `Group.joinCode`, retry on collision (collisions are rare enough that a simple retry loop is fine — no need for a sequence table).
- QR payload is a full deep link: `https://<domain>/join/<CODE>`, not just the bare code — so scanning it with any phone camera (not just inside the app) opens the join page directly.
- `/join/[code]` page: if the user isn't signed in, send them through Google sign-in first, then auto-submit the join once authenticated, so scanning the QR is a true one-tap join.

## 5. Settlement (debt-simplification) algorithm

1. For every member, compute `net = totalPaid - totalOwed` in cents.
2. Split members into creditors (`net > 0`) and debtors (`net < 0`).
3. Greedily match the largest creditor with the largest debtor; transfer `min(|debtor|, creditor)`; record that as one `Settlement` row; reduce both balances by the transferred amount; drop anyone who hits zero; repeat until both lists are empty.
4. This is the same greedy approach Splitwise-style apps use — it doesn't guarantee the mathematically absolute minimum number of transactions in every case (that's NP-hard in general), but for realistic group sizes (2–15 people) it consistently produces a small, sensible payment list and runs in `O(n log n)`.
5. Sum of all settlement amounts must equal sum of all positive net balances; add this as an invariant check in tests, not just a hope.

## 6. API surface (Next.js route handlers)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js Google OAuth |
| `/api/groups` | POST | create a group, generates join code |
| `/api/groups` | GET | list current user's groups |
| `/api/groups/[id]` | GET | group detail (members, running total) |
| `/api/groups/join` | POST | body `{ code }`, joins the caller to that group |
| `/api/groups/[id]/qr` | GET | returns QR as SVG for the join link |
| `/api/groups/[id]/expenses` | POST | add an expense + splits |
| `/api/groups/[id]/expenses` | GET | list expenses |
| `/api/groups/[id]/end-trip` | POST | locks group, runs settlement engine, returns settlements |
| `/api/groups/[id]/settlements` | GET | list settlements for a settled group |
| `/api/settlements/[id]` | PATCH | mark a settlement `PAID` |

## 7. Pages

- `/` — dashboard: list of the signed-in user's groups (active + past)
- `/groups/new` — create a group
- `/join/[code]` — join flow (also reachable by scanning a QR)
- `/groups/[id]` — trip dashboard (matches "Screen 1" of the approved mock: total spend, category breakdown, recent activity, member avatars)
- `/groups/[id]/expenses` — full expense feed + add-expense form (matches "Screen 2")
- `/groups/[id]/settle` — settle-up screen with the raw-IOUs → final-payments visualization and the **End trip** action (matches "Screen 3")

## 8. Build order

1. **Scaffold** — Next.js + TypeScript + Tailwind + Prisma + Postgres connection, base layout.
2. **Auth** — Google sign-in, session, protected routes.
3. **Groups** — create/join, join-code generation, QR generation + scan flow.
4. **Expenses** — add/list expenses with splits (equal split first, custom split as a fast-follow).
5. **Settlement engine** — netting algorithm + End trip flow + settle-up screen.
6. **UI polish** — apply the neumorphic design system across all screens.
7. **Testing** — the testing agent works continuously from step 2 onward, not just at the end; see `testing-agent.md`.

## 9. Open questions to confirm before/while building

- Who can tap **End trip** — any member, or only the group creator? (Plan defaults to: any member can trigger it, since trips are informal, but it's a one-line permission check to restrict later.)
- Should a member be able to leave a group before it's settled?
- Do we need push/email notifications when someone is added or a trip is settled, or is in-app only fine for v1?
- Multi-currency trips — v1 assumes one currency per group; flag if that's wrong.

## 10. How to use the `.claude/agents/` files

Each file in `.claude/agents/` is a Claude Code subagent scoped to one part of the system. Claude Code will pick the right one automatically based on its `description`, or you can invoke one explicitly (e.g. "use the settlement-agent to build the netting engine"). Suggested order: `database-schema-agent` → `auth-agent` → `groups-agent` → `payments-agent` → `settlement-agent` → `frontend-ui-agent`, with `testing-agent` running after every feature agent finishes its slice, not just at the end.
