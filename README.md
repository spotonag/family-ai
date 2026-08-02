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
| Weather | **Real** — live Bureau of Meteorology data for Boort, VIC. See "Weather data" below for important caveats. |
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
- Weather uses an unofficial API — see "Weather data" above.
- Chat is rule-based, not a real LLM (see above).
- No push notifications.
- Admin-only actions (editing jobs, setting the dinner roster) aren't
  permission-gated — anyone can currently do anything.
