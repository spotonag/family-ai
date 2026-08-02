# Family AI

Phase 1 MVP of the Family AI app, built from the Design Brief and Functional
Specification. Home screen, Shopping, Jobs, Calendar, live Boort weather,
and an AI chat, all backed by a real database.

**Live at https://family-ai-k3zp.onrender.com** — real Supabase/Postgres,
real Claude, real BOM weather, deployed on Render. Local dev in this repo
still defaults to SQLite (see "Getting started"); the deployed instance is
the one running against the real stack end to end.

## What's real vs. stubbed

| Area | Status |
|---|---|
| Data model, database, server actions | Real — SQLite locally by default; the deployed instance runs on Supabase/Postgres. See "Moving to Supabase" below for the connection details and a couple of hard-won gotchas. |
| Home screen (Weather, Briefing, Dinner, Jobs, Shopping, Feed, Tomorrow, Quiz, Points, Weekly Wrap-Up) | Real, reading/writing the database |
| Shopping / Jobs / Calendar full screens | Real |
| AI chat | **Real Claude, with a rule-based fallback.** If `ANTHROPIC_API_KEY` is set, chat runs through actual Claude with tool use — understands natural phrasing, asks clarifying questions, handles multi-part requests. With no key, it automatically falls back to matching the exact example phrases from the Functional Spec's intent map (Section 6) with regex. See "AI chat" below. |
| Weather | **Real** — live Bureau of Meteorology data for Boort, VIC. See "Weather data" below for important caveats. |
| Auth / roles | **Lightweight PIN gate, real enforcement.** Switching "viewing as" into a Parent profile needs that parent's 4-digit PIN (children switch freely, per spec Section 5.1). Admin-only actions (adding a job, giving bonus points) are checked server-side, not just hidden in the UI. See "Auth / roles" below for what this is and isn't. |
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
Use the avatar row top-right to switch who you're "viewing as." Katherine is
the only Parent/Admin profile; her PIN is **1234** (printed by `db:seed`
too) — the rest are Child profiles and switch to instantly, no PIN.

`npm run db:seed` wipes and re-creates all demo data — re-run it any time
you want a clean slate.

## Project structure

```
prisma/schema.prisma      Data model (Section 3 of the Functional Spec)
prisma/seed.ts            Demo data
src/lib/db.ts              Prisma client
src/lib/family.ts           Current family / viewer helpers
src/lib/queries.ts          Leaderboard + weekly wrap-up text
src/lib/weather.ts          Live BOM weather + cache/fallback
src/lib/intents.ts          Rule-based NLU (fallback chat mode)
src/lib/intentExecutor.ts   Executes a resolved Intent against the database — shared by both chat modes
src/lib/llmChat.ts          Real Claude tool-use loop (active chat mode)
src/lib/auth.ts             PIN hashing/verification + requireAdmin() permission check
src/app/page.tsx            Home screen
src/app/shopping /jobs /calendar /chat   Full screens
src/app/actions.ts           Server actions (toggle job, add shopping item, answer quiz, …)
src/app/chat/actions.ts      Picks LLM vs. rule-based mode, calls the right one
src/components/             UI pieces shared across screens
```

## Weather data

The Weather card pulls live data for **Boort, VIC** from the Bureau of
Meteorology — the same data that powers the official BOM Weather app.
Important caveats, worth knowing before relying on this:

- **This is an unofficial API.** `api.weather.bom.gov.au` has no public
  developer program or terms of service for third-party apps — it's been
  reverse-engineered from BOM's own website/app traffic. The Bureau's own
  copyright notice on every response says not to use, copy, or share the
  API without their permission. This is fine for a personal/family
  prototype; it is **not** something to ship to app stores or rely on
  commercially without first getting BOM's actual sign-off (contact
  https://www.bom.gov.au/other/copyright.shtml) — or switching to a
  licensed provider (Weatherzone/DTN, or a standard provider like
  OpenWeatherMap) at that point.
- **It can break without notice** — there's no changelog or deprecation
  window since it isn't a real product.
- **Nearest station, not on-site.** BOM doesn't have an automatic weather
  station in Boort itself, so live observations (current temp, wind) come
  from the nearest one — currently Charlton, about 39 km away. The daily
  forecast (today's max, rain chance, conditions text) is BOM's actual
  forecast *for Boort specifically*, which is the more accurate number for
  "what's the weather doing here today."
- **Caching & fallback**: `src/lib/weather.ts` caches the last successful
  fetch in the `WeatherCache` table and re-fetches at most every 15
  minutes. If the API is down, the card falls back to that last-known
  reading with an "Updated Xm ago" chip, matching the error-state behaviour
  specified in the Functional Spec, Section 11. If there's no cached
  reading at all (e.g. first run with the API down), the card says so
  rather than showing stale or fake numbers.
- To point this at a different town, change `FORECAST_GEOHASH` in
  `src/lib/weather.ts` — resolve a new one by hitting
  `https://api.weather.bom.gov.au/v1/locations?search=<town name>`.

## AI chat

Add your Anthropic API key to `.env` (copy `.env.example`, uncomment
`ANTHROPIC_API_KEY`, paste a key from https://console.anthropic.com) and
restart the dev server. The `/chat` page's badge switches from "AI:
rule-based demo" to "AI: Claude" automatically — there's no other config
needed, and nothing else in the app changes.

How it works (`src/lib/llmChat.ts`): each message goes to Claude with a
system prompt naming the current viewer, the family, and whether the
viewer is a parent/admin, plus twelve tools — one per action the assistant
can take (add/remove a shopping item, check or change the dinner plan,
list/complete/add/remove a job, look up tomorrow or a specific event,
check the leaderboard). Claude decides which tool(s) to call rather than us
guessing from regex, so it handles phrasing the rule-based parser can't —
multi-item requests, follow-ups, "actually, make that two," clarifying
questions when something's ambiguous. Tool calls run through
`executeIntent()` in `src/lib/intentExecutor.ts` — the *same* function the
rule-based fallback uses — so both chat modes touch the database identically
and can't drift apart. Results go back to Claude, which composes the final
reply in its own words rather than reciting a canned string.

Model defaults to `claude-sonnet-5`; override with `ANTHROPIC_MODEL` in
`.env` (e.g. a Haiku model for lower cost, since this runs on every chat
message). With no key set, `chat/actions.ts` falls back to
`src/lib/intents.ts`'s regex parser — a pure `parseIntent(text) => Intent`
function with no framework code in it, matching the exact example phrases
from the Functional Spec's intent map (Section 6). The app is fully usable
either way; the fallback exists so a clone of this repo works out of the
box with zero setup.

## Auth / roles

What's actually enforced now, not just hidden in the UI:

- Switching "viewing as" into a **Parent** profile requires that profile's
  PIN (`src/components/ProfileSwitcher.tsx`), checked against a salted hash
  via Node's built-in `scrypt` (`src/lib/auth.ts`) — the plaintext PIN is
  never stored. Switching into a **Child** profile needs nothing, per
  Functional Spec Section 5.1 ("children do not need their own login
  credentials on shared devices").
- Every admin-only server action (`addJob`, `deleteJob`, `addBonusPoints`,
  `addFamilyMember` in `src/app/actions.ts`) calls
  `requireAdmin(actingProfileId)` and throws if the acting profile isn't a
  Parent — this runs server-side regardless of what the UI shows, so it's a
  real check, not just a hidden button. The same actions reached via AI
  chat (changing the dinner plan, adding/removing a job) go through a
  softer version of the same check in `src/lib/intentExecutor.ts` — it
  replies "only a parent can do that" instead of throwing, since a thrown
  error mid-conversation would be a worse experience than a clear no.
- The UI also hides these controls from Child viewers (no "Add a job" form,
  no delete button on jobs, no "Give bonus points" button, no add-member
  form on Settings) so the server check is a backstop, not the first line
  of defense a kid runs into.
- **Adding family members** (like Steve) goes through `/settings`, visible
  only to Parent viewers — name, role, and a PIN if they're a parent. No
  edit or remove yet, just add; see "Known gaps" below.

What this **isn't**: real accounts. There's no signup, no email, no
password reset, no session expiry — just one shared cookie naming who
you're "viewing as," gated by a 4-digit PIN for Parent profiles. That's a
reasonable match for a single trusted household on a local database, and
explicitly not something to rely on once this moves to Supabase with
multiple real devices — at that point, Supabase Auth (real accounts,
sessions, and row-level security tied to family/profile) should replace
this entirely rather than sit alongside it. New Parent profiles created
after the seed (there's no UI for this yet — Section 5.1's onboarding flow
isn't built) would need a PIN set directly via `hashPin()` from
`src/lib/auth.ts`.

## Moving to Supabase

**Status: connected and live** — the Render deployment runs against a real
Supabase Postgres project (`rhlhzsmzpzpnaqhiukgh`). This repo's own
`prisma/schema.prisma` defaults to `provider = "postgresql"` (matching
production); local dev needs it switched to `"sqlite"` plus a local
`DATABASE_URL` to run against the bundled SQLite file instead — see
"Getting started" above for that local setup, since developing against a
live shared database isn't what you want day to day.

This was built and originally connected from a sandboxed environment with
no outbound raw TCP (HTTPS-through-proxy only), so the schema was generated
offline (`prisma/supabase/001_init.sql`, still in the repo as a reference/
bootstrap artifact) and the actual connection + seeding was done from
Render's own Shell, which does have normal network access. Two things that
tripped this up, worth knowing if you're setting this up somewhere new:

- **The pooler connection string needs `?pgbouncer=true&connection_limit=1`
  appended**, or every query fails with `"prepared statement already
  exists"` — Supabase's pooler runs PgBouncer in transaction mode, which
  doesn't support Prisma's default prepared-statement usage. Full
  connection string shape is in `prisma/supabase/README.md`.
- **`next build` tries to statically pre-render every page by default.**
  Every page here depends on live DB state and a per-request viewer
  cookie, so none of them should be pre-rendered — each `page.tsx` exports
  `export const dynamic = "force-dynamic"` to make that explicit. Without
  it, a fresh deploy against an empty (unseeded) database fails the build
  entirely, since the pre-render attempt throws before the app ever serves
  a real request.

Supabase also gives you real-time subscriptions and auth for free, which
would cover the "all devices stay synced" and "each family member has an
account" requirements from the Design Brief — both still using the
lightweight approach described in "Auth / roles" above, not yet Supabase's
own versions of either.

## Known gaps vs. the Functional Spec

These are the honest gaps against Phase 1 in the spec's MVP Phasing
(Section 12) — worth knowing before treating this as further along than it
is:

- Auth is a PIN gate, not real accounts — see "Auth / roles" above.
- Weather uses an unofficial API — see "Weather data" above.
- Chat needs an API key to use real Claude — without one it's rule-based (see "AI chat" above).
- No push notifications.
- `/settings` covers adding a family member (Section 5.8) but not editing
  or removing one, and there's no way to change a PIN after creation short
  of a code-level operation.
- No dedicated UI for editing the dinner roster beyond asking the AI to
  change it — same for jobs, which can be added/removed via chat or the
  Jobs page, but there's no bulk/recurring job editor.
