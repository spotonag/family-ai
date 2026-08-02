import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { startOfToday, endOfToday } from "@/lib/family";
import type { Intent } from "@/lib/intents";

async function isAdminProfile(profileId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  return profile?.role === "parent";
}

async function findProfileByName(familyId: string, name: string) {
  return db.profile.findFirst({ where: { familyId, name: { contains: name } } });
}

const NOT_ADMIN_REPLY = "Only a parent can do that — ask one of them to switch profiles first.";

// Executes a resolved Intent against the database and returns the reply
// text. Shared by both the rule-based parser (src/lib/intents.ts) and the
// real-LLM tool-use path (src/app/chat/actions.ts) — whichever one
// resolves natural language to an Intent, this is what actually does it.
export async function executeIntent(intent: Intent, familyId: string, profileId: string): Promise<string> {
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

    case "set_dinner_plan": {
      if (!(await isAdminProfile(profileId))) return NOT_ADMIN_REPLY;

      const [cook, dishes] = await Promise.all([
        intent.cookName ? findProfileByName(familyId, intent.cookName) : Promise.resolve(null),
        intent.dishesName ? findProfileByName(familyId, intent.dishesName) : Promise.resolve(null),
      ]);

      await db.dinnerPlan.upsert({
        where: { familyId_date: { familyId, date: startOfToday() } },
        create: {
          familyId,
          date: startOfToday(),
          mealName: intent.mealName,
          cookId: cook?.id,
          dishesId: dishes?.id,
        },
        update: {
          mealName: intent.mealName,
          ...(cook ? { cookId: cook.id } : {}),
          ...(dishes ? { dishesId: dishes.id } : {}),
        },
      });

      revalidatePath("/");
      const parts = [`Done — tonight's dinner is now ${intent.mealName}.`];
      if (cook) parts.push(`${cook.name}'s cooking.`);
      if (dishes) parts.push(`${dishes.name}'s on dishes.`);
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

    case "add_job": {
      if (!(await isAdminProfile(profileId))) return NOT_ADMIN_REPLY;

      const assignee = intent.assigneeName ? await findProfileByName(familyId, intent.assigneeName) : null;
      const points = intent.points ?? 5;

      const job = await db.job.create({
        data: { familyId, title: intent.title, points, assignedToId: assignee?.id, status: "open", dueDate: new Date() },
      });

      revalidatePath("/");
      revalidatePath("/jobs");
      return `Added "${job.title}" (+${points})${assignee ? ` for ${assignee.name}` : ""}.`;
    }

    case "remove_job": {
      if (!(await isAdminProfile(profileId))) return NOT_ADMIN_REPLY;

      const job = await db.job.findFirst({ where: { familyId, title: { contains: intent.title } } });
      if (!job) return `I couldn't find a job called "${intent.title}".`;

      if (job.status === "done" && job.assignedToId) {
        const entry = await db.pointsLedger.findFirst({
          where: { profileId: job.assignedToId, source: "job", note: job.title },
          orderBy: { createdAt: "desc" },
        });
        if (entry) await db.pointsLedger.delete({ where: { id: entry.id } });
      }
      await db.job.delete({ where: { id: job.id } });

      revalidatePath("/");
      revalidatePath("/jobs");
      return `Removed "${job.title}" from the jobs list.`;
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
      const [profiles, grouped] = await Promise.all([
        db.profile.findMany({ where: { familyId } }),
        db.pointsLedger.groupBy({ by: ["profileId"], where: { profile: { familyId } }, _sum: { amount: true } }),
      ]);
      const pointsByProfile = new Map(grouped.map((g) => [g.profileId, g._sum.amount ?? 0]));
      const totals = profiles.map((p) => ({ name: p.name, total: pointsByProfile.get(p.id) ?? 0 }));
      totals.sort((a, b) => b.total - a.total);
      const top = totals.slice(0, 3);
      return top.map((t, i) => `${i + 1}. ${t.name} — ${t.total}`).join("  ");
    }

    case "unknown":
    default:
      return "I didn't quite catch that. Try things like “We've run out of milk”, “Who's cooking tonight?”, or “What jobs can I do?”";
  }
}
