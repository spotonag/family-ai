"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { VIEWER_COOKIE, startOfDate } from "@/lib/family";
import { requireAdmin, verifyPin, hashPin } from "@/lib/auth";

const AVATAR_PALETTE = ["#4c8c5b", "#7d5aa6", "#3e7c8c", "#a3760f", "#c1585f", "#3a5a8c", "#8c6f3e", "#5a8c7d"];

export async function switchViewer(profileId: string, pin?: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) return { ok: false, error: "Unknown profile." };

  if (profile.role === "parent") {
    if (!profile.pinHash || !profile.pinSalt) {
      return { ok: false, error: "This profile has no PIN set." };
    }
    if (!pin || !verifyPin(pin, profile.pinHash, profile.pinSalt)) {
      return { ok: false, error: "Incorrect PIN." };
    }
  }

  const store = await cookies();
  store.set(VIEWER_COOKIE, profileId, { path: "/" });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleJob(jobId: string) {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const nowDone = job.status !== "done";

  await db.job.update({
    where: { id: jobId },
    data: {
      status: nowDone ? "done" : "open",
      completedAt: nowDone ? new Date() : null,
    },
  });

  if (nowDone && job.assignedToId) {
    await db.pointsLedger.create({
      data: {
        profileId: job.assignedToId,
        source: "job",
        amount: job.points,
        note: job.title,
      },
    });
  } else if (!nowDone && job.assignedToId) {
    // Job was un-ticked — reverse the most recent matching points entry rather
    // than leaving a stale credit on the ledger.
    const entry = await db.pointsLedger.findFirst({
      where: { profileId: job.assignedToId, source: "job", note: job.title },
      orderBy: { createdAt: "desc" },
    });
    if (entry) await db.pointsLedger.delete({ where: { id: entry.id } });
  }

  revalidatePath("/");
  revalidatePath("/jobs");
}

export async function addShoppingItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const addedById = String(formData.get("addedById") ?? "") || null;
  const familyId = String(formData.get("familyId") ?? "");
  if (!name || !familyId) return;

  await db.shoppingItem.create({
    data: { familyId, name, addedById, addedVia: "type" },
  });

  revalidatePath("/");
  revalidatePath("/shopping");
}

export async function addJob(formData: FormData) {
  const actingProfileId = String(formData.get("actingProfileId") ?? "");
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const title = String(formData.get("title") ?? "").trim();
  const familyId = String(formData.get("familyId") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  const points = Number(formData.get("points") ?? 5) || 5;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  if (!title || !familyId) return;

  const dueDate = dueDateRaw ? startOfDate(dueDateRaw) : new Date();

  await db.job.create({
    data: { familyId, title, assignedToId, points, status: "open", dueDate: Number.isNaN(dueDate.getTime()) ? new Date() : dueDate },
  });

  revalidatePath("/");
  revalidatePath("/jobs");
}

export async function addFamilyMember(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const actingProfileId = String(formData.get("actingProfileId") ?? "");
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const familyId = String(formData.get("familyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "child") === "parent" ? "parent" : "child";
  const pin = String(formData.get("pin") ?? "").trim();

  if (!name || !familyId) return { ok: false, error: "Name is required." };
  if (role === "parent" && !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Parent profiles need a 4-digit PIN." };
  }

  const existingCount = await db.profile.count({ where: { familyId } });
  const avatarColor = AVATAR_PALETTE[existingCount % AVATAR_PALETTE.length];
  const avatarInitial = name[0].toUpperCase();

  const pinFields = role === "parent" ? hashPin(pin) : null;

  await db.profile.create({
    data: {
      familyId,
      name,
      role,
      avatarColor,
      avatarInitial,
      pinHash: pinFields?.hash,
      pinSalt: pinFields?.salt,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileName(
  profileId: string,
  name: string,
  actingProfileId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  await db.profile.update({
    where: { id: profileId },
    data: { name: trimmed, avatarInitial: trimmed[0].toUpperCase() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteJob(jobId: string, actingProfileId: string) {
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.status === "done" && job.assignedToId) {
    const entry = await db.pointsLedger.findFirst({
      where: { profileId: job.assignedToId, source: "job", note: job.title },
      orderBy: { createdAt: "desc" },
    });
    if (entry) await db.pointsLedger.delete({ where: { id: entry.id } });
  }

  await db.job.delete({ where: { id: jobId } });

  revalidatePath("/");
  revalidatePath("/jobs");
}

export async function adjustPoints(formData: FormData) {
  const actingProfileId = String(formData.get("actingProfileId") ?? "");
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const targetProfileId = String(formData.get("targetProfileId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || (amount >= 0 ? "Bonus" : "Adjustment");
  if (!targetProfileId || !amount) return;

  // Points are an append-only ledger (Section 3 of the Functional Spec),
  // not a mutable total — a deduction is a negative-amount entry, same as
  // any other change, which keeps a full audit trail of every adjustment.
  await db.pointsLedger.create({
    data: { profileId: targetProfileId, source: "bonus", amount, note },
  });

  revalidatePath("/");
}

export async function setDinnerPlan(formData: FormData) {
  const actingProfileId = String(formData.get("actingProfileId") ?? "");
  await requireAdmin(actingProfileId); // Parent/Admin only — Functional Spec Section 2

  const familyId = String(formData.get("familyId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const mealName = String(formData.get("mealName") ?? "").trim();
  const cookId = String(formData.get("cookId") ?? "") || null;
  const dishesId = String(formData.get("dishesId") ?? "") || null;
  if (!familyId || !dateRaw || !mealName) return;

  const date = startOfDate(dateRaw);
  if (Number.isNaN(date.getTime())) return;

  await db.dinnerPlan.upsert({
    where: { familyId_date: { familyId, date } },
    create: { familyId, date, mealName, cookId, dishesId },
    update: { mealName, cookId, dishesId },
  });

  revalidatePath("/");
}

export async function addCalendarEvent(formData: FormData) {
  const familyId = String(formData.get("familyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const startTimeRaw = String(formData.get("startTime") ?? "");
  const category = String(formData.get("category") ?? "other");
  const attendeeIds = formData.getAll("attendeeIds").map(String).filter(Boolean);

  if (!familyId || !title || !startTimeRaw) return;
  const startTime = new Date(startTimeRaw);
  if (Number.isNaN(startTime.getTime())) return;

  await db.calendarEvent.create({
    data: {
      familyId,
      title,
      startTime,
      category,
      attendees: attendeeIds.length ? { connect: attendeeIds.map((id) => ({ id })) } : undefined,
    },
  });

  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(eventId: string) {
  await db.calendarEvent.delete({ where: { id: eventId } });
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function markPurchased(itemId: string) {
  await db.shoppingItem.update({
    where: { id: itemId },
    data: { status: "purchased" },
  });
  revalidatePath("/");
  revalidatePath("/shopping");
}

export async function answerQuiz(
  questionId: string,
  profileId: string,
  chosenIndex: number
) {
  const question = await db.quizQuestion.findUniqueOrThrow({ where: { id: questionId } });
  const correct = chosenIndex === question.correctIndex;

  await db.quizResponse.upsert({
    where: { questionId_profileId: { questionId, profileId } },
    update: {},
    create: { questionId, profileId, chosenIndex, correct },
  });

  if (correct) {
    await db.pointsLedger.create({
      data: {
        profileId,
        source: "quiz",
        amount: question.points,
        note: "Question of the Day",
      },
    });
  }

  revalidatePath("/");
}
