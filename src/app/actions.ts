"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { VIEWER_COOKIE } from "@/lib/family";

export async function setViewer(profileId: string) {
  const store = await cookies();
  store.set(VIEWER_COOKIE, profileId, { path: "/" });
  revalidatePath("/", "layout");
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
  const title = String(formData.get("title") ?? "").trim();
  const familyId = String(formData.get("familyId") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  const points = Number(formData.get("points") ?? 5) || 5;
  if (!title || !familyId) return;

  await db.job.create({
    data: { familyId, title, assignedToId, points, status: "open", dueDate: new Date() },
  });

  revalidatePath("/");
  revalidatePath("/jobs");
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
