"use server";

import { db } from "@/lib/db";
import { parseIntent } from "@/lib/intents";
import { executeIntent } from "@/lib/intentExecutor";
import { isLlmConfigured, llmReply } from "@/lib/llmChat";

export async function sendMessage(
  history: { role: "user" | "assistant"; text: string }[],
  familyId: string,
  profileId: string
): Promise<string> {
  if (isLlmConfigured()) {
    const [viewer, allProfiles] = await Promise.all([
      db.profile.findUniqueOrThrow({ where: { id: profileId } }),
      db.profile.findMany({ where: { familyId } }),
    ]);
    return llmReply(
      history,
      familyId,
      profileId,
      viewer.name,
      allProfiles.map((p) => p.name)
    );
  }

  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const intent = parseIntent(lastUserMessage?.text ?? "");
  return executeIntent(intent, familyId, profileId);
}
