// The family this app serves lives in Boort, VIC — Australia/Sydney follows
// the same AEST/AEDT rules as Victoria, so this one constant is correct for
// every date/time shown or entered anywhere in the app.
//
// This file has no server-only imports (unlike src/lib/family.ts, which
// pulls in next/headers) so it's safe to import from client components too —
// needed because converting a picked date/time correctly has to happen the
// same way on both sides: once when a form submits it, again whenever it's
// displayed back.
export const FAMILY_TIMEZONE = "Australia/Sydney";

function partsOf(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) out[part.type] = part.value;
  return out;
}

// Converts a wall-clock string with no timezone of its own — "YYYY-MM-DD"
// or "YYYY-MM-DDTHH:mm", exactly what <input type="date"/"datetime-local">
// produce — into the actual UTC instant that wall-clock time represents in
// `timeZone`. This has to be timezone-aware rather than a plain
// `new Date(str)`, because that constructor interprets the string using
// whatever timezone the *code executing it* happens to be running in — the
// server's (UTC on Render), not the family's — which silently shifted every
// saved event by however many hours those two zones differ, and by a whole
// day near midnight.
export function wallTimeToUtc(wallClock: string, timeZone: string = FAMILY_TIMEZONE): Date {
  const withTime = wallClock.includes("T") ? wallClock : `${wallClock}T00:00`;
  const withSeconds = withTime.length === 16 ? `${withTime}:00` : withTime;
  const guess = new Date(`${withSeconds}Z`); // first pass: treat the literal digits as UTC
  if (Number.isNaN(guess.getTime())) return guess;

  // Ask what wall-clock time that guess reads as in `timeZone`, then correct
  // by the difference. Driven off the actual instant (not a fixed offset),
  // so it resolves daylight saving correctly too.
  const p = partsOf(guess, timeZone);
  const asIfLocal = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second)
  );
  const diff = guess.getTime() - asIfLocal;
  return new Date(guess.getTime() + diff);
}

// The inverse — formats a UTC instant back into the "YYYY-MM-DDTHH:mm"
// shape <input type="datetime-local"> expects, as wall-clock time in
// `timeZone`, for pre-filling an edit form with an event's current time.
export function utcToWallTimeLocal(date: Date, timeZone: string = FAMILY_TIMEZONE): string {
  const p = partsOf(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
