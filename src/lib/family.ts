import { cookies } from "next/headers";
import { db } from "@/lib/db";

const VIEWER_COOKIE = "familyai_viewer";

export async function getFamily() {
  const family = await db.family.findFirst({
    include: { profiles: { orderBy: { createdAt: "asc" } } },
  });
  if (!family) {
    throw new Error("No family found — run `npm run db:seed` first.");
  }
  return family;
}

export function pickViewer<T extends { id: string; name: string }>(
  profiles: T[],
  requestedId?: string
): T {
  if (requestedId) {
    const found = profiles.find((p) => p.id === requestedId);
    if (found) return found;
  }
  return profiles.find((p) => p.name === "Anna") ?? profiles[0];
}

export async function getViewerId() {
  const store = await cookies();
  return store.get(VIEWER_COOKIE)?.value;
}

export { VIEWER_COOKIE };

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = startOfToday();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek() {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}
