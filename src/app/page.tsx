import { db } from "@/lib/db";
import { getFamily, getViewerId, pickViewer, startOfToday, endOfToday } from "@/lib/family";
import { getLeaderboard, getWeeklyWrapUp } from "@/lib/queries";
import { getBoortWeather, iconBucket } from "@/lib/weather";
import { AudioButton } from "@/components/AudioButton";
import { JobItem } from "@/components/JobItem";
import { ShoppingList } from "@/components/ShoppingList";
import { QuizCard } from "@/components/QuizCard";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { NavBar } from "@/components/NavBar";
import { WeatherIcon } from "@/components/WeatherIcon";
import { BonusPointsForm } from "@/components/BonusPointsForm";

// Every render here depends on live DB state and the per-request viewer
// cookie — never statically pre-render (and never attempt to at build time,
// when the database may not have any seed data yet).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  const tomorrowStart = new Date(startOfToday());
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [jobs, dinner, shoppingItems, quiz, feedPost, tomorrowEvent, leaderboard, wrapUp, weather] = await Promise.all([
    db.job.findMany({
      where: { familyId: family.id, dueDate: { gte: startOfToday(), lte: endOfToday() } },
      include: { assignedTo: true },
      orderBy: { createdAt: "asc" },
    }),
    db.dinnerPlan.findFirst({
      where: { familyId: family.id, date: { gte: startOfToday(), lte: endOfToday() } },
      include: { cook: true, dishes: true },
    }),
    db.shoppingItem.findMany({
      where: { familyId: family.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    db.quizQuestion.findFirst({
      where: { activeDate: { gte: startOfToday(), lte: endOfToday() } },
      include: { responses: { where: { profileId: viewer.id } } },
    }),
    db.feedPost.findFirst({ where: { familyId: family.id }, include: { author: true }, orderBy: { createdAt: "desc" } }),
    db.calendarEvent.findFirst({
      where: { familyId: family.id, startTime: { gte: tomorrowStart } },
      include: { owner: true },
      orderBy: { startTime: "asc" },
    }),
    getLeaderboard(family.id),
    getWeeklyWrapUp(family.id),
    getBoortWeather(),
  ]);

  const doneCount = jobs.filter((j) => j.status === "done").length;
  const openJobs = jobs.filter((j) => j.status !== "done");

  const briefing = [
    `Good morning. ${weather?.summary ?? "The weather update isn't available right now."}`,
    dinner
      ? `${dinner.cook?.name ?? "Someone"} is cooking dinner${dinner.dishes ? `, ${dinner.dishes.name} is on dishes` : ""}.`
      : "No dinner planned yet.",
    openJobs.length > 0
      ? `There ${openJobs.length === 1 ? "is" : "are"} ${openJobs.length} family job${openJobs.length === 1 ? "" : "s"} still outstanding.`
      : "All family jobs are done.",
    tomorrowEvent
      ? `${tomorrowEvent.owner?.name ?? "Someone"} has ${tomorrowEvent.title} tomorrow at ${tomorrowEvent.startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}.`
      : null,
    shoppingItems.length > 0
      ? `There ${shoppingItems.length === 1 ? "is" : "are"} ${shoppingItems.length} item${shoppingItems.length === 1 ? "" : "s"} on the shopping list.`
      : "The shopping list is empty.",
    quiz ? "Today's quiz is ready." : null,
  ]
    .filter(Boolean)
    .join(" ");

  const quizData = quiz
    ? {
        id: quiz.id,
        question: quiz.question,
        category: quiz.category,
        points: quiz.points,
        correctIndex: quiz.correctIndex,
        explanation: quiz.explanation,
        options: [quiz.optionA, quiz.optionB, quiz.optionC, quiz.optionD],
      }
    : null;
  const quizAnswered = quiz?.responses[0]
    ? { chosenIndex: quiz.responses[0].chosenIndex, correct: quiz.responses[0].correct }
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Good afternoon, {viewer.name}</h1>
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>

        <div className="flex flex-col gap-3">
          <section className="card">
            <div className="flex justify-between items-start mb-1">
              <p className="card-title">Today&rsquo;s Weather &middot; Boort</p>
              {weather?.stale && <span className="chip">Updated {weather.ageMinutes}m ago</span>}
            </div>
            {weather ? (
              <>
                <div className="flex items-center gap-3">
                  <WeatherIcon bucket={iconBucket(weather.iconDescriptor)} />
                  <span className="text-4xl font-bold tabular-nums">{Math.round(weather.tempC)}°</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {weather.windKmh !== null && (
                      <>
                        Wind {weather.windKmh} km/h {weather.windDirection}
                        <br />
                      </>
                    )}
                    {weather.rainChance !== null && `${weather.rainChance}% chance of rain`}
                  </span>
                </div>
                <p className="text-sm mt-3" style={{ color: "var(--ink-soft)" }}>
                  {weather.summary}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Weather is unavailable right now — the Bureau of Meteorology API didn&rsquo;t respond.
              </p>
            )}
          </section>

          <section className="card">
            <p className="card-title">Today&rsquo;s Briefing</p>
            <AudioButton idleLabel="Today's Briefing" replayLabel="Replay Today's Briefing" transcript={briefing} />
          </section>

          <section className="card">
            <p className="card-title">Dinner Planner</p>
            {dinner ? (
              <>
                <div className="text-lg font-bold mb-3">{dinner.mealName}</div>
                <div className="flex gap-5">
                  {dinner.cook && (
                    <div className="flex items-center gap-2">
                      <div className="avatar sm" style={{ background: dinner.cook.avatarColor }}>
                        {dinner.cook.avatarInitial}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--muted)" }}>
                          Cook
                        </div>
                        <div className="text-sm font-bold">{dinner.cook.name}</div>
                      </div>
                    </div>
                  )}
                  {dinner.dishes && (
                    <div className="flex items-center gap-2">
                      <div className="avatar sm" style={{ background: dinner.dishes.avatarColor }}>
                        {dinner.dishes.avatarInitial}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--muted)" }}>
                          Dishes
                        </div>
                        <div className="text-sm font-bold">{dinner.dishes.name}</div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No dinner planned yet.
              </p>
            )}
          </section>

          <section className="card">
            <div className="flex justify-between items-start mb-1">
              <p className="card-title">Today&rsquo;s Jobs</p>
              <span className="chip">
                {doneCount} of {jobs.length} done
              </span>
            </div>
            <div className="progress-track mb-3">
              <div
                className="progress-fill"
                style={{ width: jobs.length ? `${(doneCount / jobs.length) * 100}%` : "0%" }}
              />
            </div>
            {jobs.length === 0 && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No jobs today.
              </p>
            )}
            {jobs.map((job) => (
              <JobItem
                key={job.id}
                id={job.id}
                title={job.title}
                points={job.points}
                done={job.status === "done"}
                assigneeInitial={job.assignedTo?.avatarInitial}
                assigneeColor={job.assignedTo?.avatarColor}
              />
            ))}
          </section>

          <section className="card">
            <div className="flex justify-between items-start mb-3">
              <p className="card-title">Shopping List</p>
              <span className="chip">{shoppingItems.length} items</span>
            </div>
            <ShoppingList items={shoppingItems} familyId={family.id} viewerId={viewer.id} />
          </section>

          <section className="card">
            <p className="card-title">Family Feed</p>
            {feedPost ? (
              <>
                <div
                  className="h-28 rounded-2xl mb-3"
                  style={{ background: `linear-gradient(135deg, ${feedPost.photoColor}, #6e4a2b)` }}
                />
                <div className="flex gap-2 items-start">
                  {feedPost.author && (
                    <div className="avatar sm" style={{ background: feedPost.author.avatarColor }}>
                      {feedPost.author.avatarInitial}
                    </div>
                  )}
                  <div>
                    <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                      &ldquo;{feedPost.caption}&rdquo;
                    </p>
                    <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--muted)" }}>
                      {feedPost.author?.name}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No posts yet — add the first one.
              </p>
            )}
          </section>

          <section className="card">
            <p className="card-title">Tomorrow</p>
            {tomorrowEvent ? (
              <div className="job-row" style={{ borderTop: "none", paddingTop: 0 }}>
                <div className="text-xs font-bold tabular-nums w-12 flex-shrink-0" style={{ color: "var(--accent)" }}>
                  {tomorrowEvent.startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {tomorrowEvent.title}
                    {tomorrowEvent.owner ? ` — ${tomorrowEvent.owner.name}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Nothing on tomorrow yet.
              </p>
            )}
          </section>

          {quizData && <QuizCard question={quizData} profileId={viewer.id} alreadyAnswered={quizAnswered} />}

          <section className="card">
            <p className="card-title">Family Points — this week</p>
            {leaderboard.map((row, i) => (
              <div key={row.profile.id} className="flex items-center gap-2.5 py-1.5">
                <span className="text-[11px] font-bold w-3.5 tabular-nums" style={{ color: "var(--muted)" }}>
                  {i + 1}
                </span>
                <span className="text-[13px] font-bold w-16 flex-shrink-0">{row.profile.name}</span>
                <div className="lb-bar">
                  <div style={{ width: `${leaderboard[0].points ? (row.points / leaderboard[0].points) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-bold tabular-nums w-9 text-right">{row.points}</span>
              </div>
            ))}
            {viewer.role === "parent" && <BonusPointsForm actingProfileId={viewer.id} profiles={family.profiles} />}
          </section>

          <section className="card" style={{ background: "linear-gradient(160deg, var(--surface) 60%, var(--gold-soft))" }}>
            <div className="flex justify-between items-start mb-1">
              <p className="card-title">Weekly Wrap-Up</p>
              <span className="chip gold">Ready anytime</span>
            </div>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
              A look back at the week, and what&rsquo;s coming up next. Run it whenever suits.
            </p>
            <AudioButton idleLabel="Weekly Wrap-Up" replayLabel="Replay Weekly Wrap-Up" transcript={wrapUp} gold />
          </section>
        </div>
      </div>
      <NavBar active="/" />
    </div>
  );
}
