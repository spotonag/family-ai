"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseIntent } from "@/lib/intents";
import { startOfToday, endOfToday } from "@/lib/family";

export async function sendMessage(text: string, familyId: string, profileId: string): Promise<string> {
  const intent = parseIntent(text);

  switch (intent.type) {
    case "add_shopping_item": {
      await db.shoppingItem.create({
        data: { familyId, name: intent.item, addedById: profileId, addedVia: "ai" },
      });
      revalidatePath("/");
      revalidatePath("/shopping");
      return `I've added ${intent.item} to the shopping list.`;
    }

    case "remove_shopping_item": {
      const match = await db.shoppingItem.findFirst({
        where: { familyId, status: "pending", name: { contains: intent.item } },
      });
      if (!match) return `I couldn't find ${intent.item} on the list — is it already off?`;
      await db.shoppingItem.update({ where: { id: match.id }, data: { status: "purchased" } });
      revalidatePath("/");
      revalidatePath("/shopping");
      return `Done — ${match.name}'s off the list.`;
    }

    case "list_shopping_items": {
      const items = await db.shoppingItem.findMany({ where: { familyId, status: "pending" } });
      if (items.length === 0) return "The shopping list is empty right now.";
      return `You need: ${items.map((i) => i.name).join(", ")}.`;
    }

    case "get_dinner_plan": {
      const dinner = await db.dinnerPlan.findFirst({
        where: { familyId, date: { gte: startOfToday(), lte: endOfToday() } },
        include: { cook: true, dishes: true },
      });
      if (!dinner) return "There's no dinner planned for tonight yet.";
      const parts = [`Tonight it's ${dinner.mealName}.`];
      if (dinner.cook) parts.push(`${dinner.cook.name} is cooking.`);
      if (dinner.dishes) parts.push(`${dinner.dishes.name}'s on dishes.`);
      return parts.join(" ");
    }

    case "list_jobs": {
      const jobs = await db.job.findMany({
        where: {
          familyId,
          status: "open",
          ...(intent.scope === "mine" ? { assignedToId: profileId } : {}),
        },
      });
      if (jobs.length === 0) return intent.scope === "mine" ? "All done — no open jobs for you." : "No open jobs right now.";
      return `${intent.scope === "mine" ? "You've" : "There are"} ${jobs.length} open: ${jobs.map((j) => `${j.title} (+${j.points})`).join(", ")}.`;
    }

    case "complete_job": {
      const job = await db.job.findFirst({
        where: { familyId, status: "open", title: { contains: intent.title } },
      });
      if (!job) return `I couldn't find an open job called "${intent.title}".`;
      await db.job.update({ where: { id: job.id }, data: { status: "done", completedAt: new Date() } });
      if (job.assignedToId) {
        await db.pointsLedger.create({ data: { profileId: job.assignedToId, source: "job", amount: job.points, note: job.title } });
      }
      revalidatePath("/");
      revalidatePath("/jobs");
      return `Nice one — that's +${job.points} points.`;
    }

    case "get_tomorrow": {
      const tomorrowStart = new Date(startOfToday());
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);
      const events = await db.calendarEvent.findMany({
        where: { familyId, startTime: { gte: tomorrowStart, lte: tomorrowEnd } },
        include: { owner: true },
        orderBy: { startTime: "asc" },
      });
      if (events.length === 0) return "Nothing on tomorrow yet.";
      return events
        .map((e) => `${e.title}${e.owner ? ` (${e.owner.name})` : ""} at ${e.startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`)
        .join(", ");
    }

    case "find_event": {
      const event = await db.calendarEvent.findFirst({
        where: { familyId, title: { contains: intent.query }, startTime: { gte: startOfToday() } },
        orderBy: { startTime: "asc" },
      });
      if (!event) return `I couldn't find anything called "${intent.query}" coming up.`;
      return `${event.title} is at ${event.startTime.toLocaleDateString("en-AU", { weekday: "long" })}, ${event.startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}.`;
    }

    case "get_leaderboard": {
      const profiles = await db.profile.findMany({ where: { familyId } });
      const totals = await Promise.all(
        profiles.map(async (p) => ({
          name: p.name,
          total: (await db.pointsLedger.aggregate({ where: { profileId: p.id }, _sum: { amount: true } }))._sum.amount ?? 0,
        }))
      );
      totals.sort((a, b) => b.total - a.total);
      const top = totals.slice(0, 3);
      return top.map((t, i) => `${i + 1}. ${t.name} — ${t.total}`).join("  ");
    }

    case "unknown":
    default:
      return "I didn't quite catch that. Try things like “We've run out of milk”, “Who's cooking tonight?”, or “What jobs can I do?”";
  }
}
