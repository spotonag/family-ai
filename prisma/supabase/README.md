# Supabase — ready to apply, not yet connected

`001_init.sql` is the full Postgres schema for this app, generated offline
from `prisma/schema.prisma` (`npx prisma migrate diff --from-empty
--to-schema-datamodel prisma/schema.prisma --script` with the datasource
provider temporarily set to `postgresql`). It creates every table, index,
and foreign key — nothing else needed to bootstrap a fresh Supabase project.

## Why this exists as a static file instead of just running `prisma migrate`

This app was built in a sandboxed Claude Code session with no outbound raw
TCP — only HTTPS through a proxy. Postgres' wire protocol needs a raw TCP
socket (port 5432 or 6543), so neither Supabase's direct connection nor its
connection pooler is reachable from that sandbox, regardless of which
connection string you use. That's an environment limitation, not a Supabase
config problem. Generating the migration SQL offline sidesteps needing a
live connection at all; applying it needs a real one, from somewhere that
has actual network access — your own machine, CI, or a deployment.

## Applying it

**Option A — Supabase SQL Editor (easiest, no local setup):**
Open your project's SQL Editor in the Supabase dashboard, paste the
contents of `001_init.sql`, run it. Done — tables exist.

**Option B — Prisma, from a machine with real network access:**
```bash
# in prisma/schema.prisma, change:
#   datasource db { provider = "sqlite" ... }
# to:
#   datasource db { provider = "postgresql" ... }

# in .env, uncomment the Supabase DATABASE_URL (pooler line is more portable
# than the direct connection, which is IPv6-only)

npx prisma db push   # creates every table directly from schema.prisma — no
                      # migration history needed, equivalent to running
                      # 001_init.sql by hand
npm run db:seed      # load demo data
npm run dev          # now pointed at Supabase
```
Once you're connected and want proper migration history going forward
(rather than the one-shot `db push` above), run `npx prisma migrate dev
--create-only` right after to baseline it, then use `prisma migrate dev`
for every change after that.

## After this point

Any future schema change should go through the normal Prisma flow once
you're actually connected (`npx prisma migrate dev`) — this file is a
one-time bootstrap, not something to hand-maintain going forward.
