# Family AI

Phase 1 MVP of the Family AI app, built from the Design Brief and Functional
Specification. Home screen, Shopping, Jobs, Calendar, and a rule-based AI
chat, all backed by a real (local) database — no mock data on screen except
the weather.

## What's real vs. stubbed

| Area | Status |
|---|---|
| Data model, database, server actions | Real — SQLite via Prisma locally, translates directly to Postgres/Supabase |
| Home screen (Weather, Briefing, Dinner, Jobs, Shopping, Feed, Tomorrow, Quiz, Points, Weekly Wrap-Up) | Real, reading/writing the database |
| Shopping / Jobs / Calendar full screens | Real |
| AI chat | **Rule-based placeholder.** Matches the exact example phrases from the Functional Spec's intent map (Section 6) with regex — not a real language model. See "Swapping in a real AI model" below. |
| Weather | **Mocked** — hardcoded 17°C/showers. No weather API wired up yet (Open Decision in the spec). |
| Auth / roles | **None yet.** Anyone can switch "viewing as" any family member via the avatar row — there's no login and no enforcement of the Parent/Admin vs. Child permissions from the spec's Section 2. Fine for a single-family local demo, not for a real deployment. |
| Voice | Not built yet — this milestone is text/click only. |
| Push notifications | Not built yet. |

## Getting started

```bash
npm install
npm run db:seed   # (re)creates prisma/dev.db with one demo family
npm run dev
```

Open http://localhost:3000. The database already has one seeded family
(Katherine, Victoria, Anna, Lucy, Juliet) with jobs, a dinner plan, a
shopping list, and today's quiz question — matching the Home screen mockup.
Use the avatar row top-right to switch who you're "viewing as."

`npm run db:seed` wipes and re-creates all demo data — re-run it any time
you want a clean slate.

## Project structure

```
prisma/schema.prisma   Data model (Section 3 of the Functional Spec)
prisma/seed.ts         Demo data
src/lib/db.ts           Prisma client
src/lib/family.ts        Current family / viewer helpers
src/lib/queries.ts       Leaderboard + weekly wrap-up text
src/lib/intents.ts       Rule-based NLU for the chat placeholder
src/app/page.tsx         Home screen
src/app/shopping /jobs /calendar /chat   Full screens
src/app/actions.ts        Server actions (toggle job, add shopping item, answer quiz, …)
src/app/chat/actions.ts   Chat message handling
src/components/          UI pieces shared across screens
```

## Swapping in a real AI model

`src/lib/intents.ts` is intentionally isolated: it's a pure function,
`parseIntent(text) => Intent`, with no database or framework code in it.
`src/app/chat/actions.ts` calls it once and then executes the resulting
intent against the database.

To wire up a real model (e.g. Claude), replace the body of `sendMessage` in
`chat/actions.ts` with a call to the model — give it the family's current
state (today's jobs, shopping list, dinner plan) as context and a tool
definition matching the `Intent` union already defined in `intents.ts`, so
the rest of the app (the switch statement that executes each intent) doesn't
need to change. You'll need an API key from whichever provider the family
chooses (see the Functional Spec, Section 13, Open Decisions).

## Moving to Supabase

The schema was written to translate cleanly:

1. Create a Supabase project, copy its Postgres connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"` under `datasource db`.
3. Set `DATABASE_URL` in `.env` to the Supabase connection string.
4. Run `npx prisma migrate dev` to apply the schema to Postgres.
5. `npm run db:seed` to load demo data (or write a real onboarding flow —
   see Functional Spec Section 5.1).

Supabase also gives you real-time subscriptions and auth for free, which
covers the "all devices stay synced" and "each family member has an
account" requirements from the Design Brief — both currently missing here.

## Known gaps vs. the Functional Spec

These are the honest gaps against Phase 1 in the spec's MVP Phasing
(Section 12) — worth knowing before treating this as further along than it
is:

- No authentication — see "Auth / roles" above.
- No real weather provider.
- Chat is rule-based, not a real LLM (see above).
- No push notifications.
- Admin-only actions (editing jobs, setting the dinner roster) aren't
  permission-gated — anyone can currently do anything.
