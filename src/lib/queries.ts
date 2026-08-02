import { db } from "@/lib/db";
import { startOfWeek } from "@/lib/family";

export async function getLeaderboard(familyId: string) {
  const since = startOfWeek();

  // One grouped query instead of one aggregate per profile — matters more
  // than it looks under a pooled connection with a small connection limit,
  // where N parallel queries just queue up waiting for a free connection.
  const [profiles, grouped] = await Promise.all([
    db.profile.findMany({ where: { familyId } }),
    db.pointsLedger.groupBy({
      by: ["profileId"],
      where: { profile: { familyId }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const pointsByProfile = new Map(grouped.map((g) => [g.profileId, g._sum.amount ?? 0]));

  const entries = profiles.map((p) => ({ profile: p, points: pointsByProfile.get(p.id) ?? 0 }));
  entries.sort((a, b) => b.points - a.points);
  return entries;
}

export async function getWeeklyWrapUp(familyId: string) {
  const since = startOfWeek();
  const [leaderboard, jobsThisWeek, tomorrowDinner] = await Promise.all([
    getLeaderboard(familyId),
    db.job.findMany({ where: { familyId, dueDate: { gte: since } } }),
    db.dinnerPlan.findFirst({
      where: { familyId, date: { gt: new Date() } },
      orderBy: { date: "asc" },
      include: { cook: true, dishes: true },
    }),
  ]);

  const done = jobsThisWeek.filter((j) => j.status === "done").length;
  const undone = jobsThisWeek.length - done;
  const top = leaderboard[0];

  const lines: string[] = [];
  if (top && top.points > 0) {
    lines.push(`${top.profile.name} has the most points this week, with ${top.points}.`);
  } else {
    lines.push("No points logged yet this week.");
  }
  lines.push(
    undone === 0
      ? `All ${done} jobs done this week — nice work.`
      : `${done} job${done === 1 ? "" : "s"} done, ${undone} still open this week.`
  );
  if (tomorrowDinner) {
    lines.push(
      `Next up: ${tomorrowDinner.mealName}${tomorrowDinner.cook ? ` — cook is ${tomorrowDinner.cook.name}` : ""}.`
    );
  }
  return lines.join(" ");
}
