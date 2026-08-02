import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

// PIN protects switching "viewing as" into a Parent/Admin profile on a
// shared device — see Functional Spec Section 2 (Roles & Permissions) and
// Section 5.1 (personal devices get "a simple PIN or face/touch ID tied to
// the family account"). This is intentionally lightweight: a 4-digit PIN
// is low entropy by design (something a parent can type one-handed at the
// kitchen bench), so the real protection here is against a curious kid
// clicking the wrong avatar, not a determined attacker. Real accounts with
// real auth are an Open Decision (Functional Spec, Section 13) for whenever
// this moves off a single shared local database.

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPin(pin: string, hash: string, salt: string) {
  const candidate = scryptSync(pin, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export async function requireAdmin(profileId: string) {
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile || profile.role !== "parent") {
    throw new Error("This action needs a Parent/Admin profile.");
  }
  return profile;
}
