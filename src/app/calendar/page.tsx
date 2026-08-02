import { db } from "@/lib/db";
import { getFamily, getViewerId, pickViewer, startOfToday } from "@/lib/family";
import { NavBar } from "@/components/NavBar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  const events = await db.calendarEvent.findMany({
    where: { familyId: family.id, startTime: { gte: startOfToday() } },
    include: { owner: true },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4">
        <header className="flex items-center justify-between mb-5">
          <div>
            <Link href="/" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-1">Calendar</h1>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>

        <section className="card">
          <p className="card-title">Upcoming</p>
          {events.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nothing scheduled yet.
            </p>
          )}
          {events.map((event) => (
            <div key={event.id} className="job-row">
              <div className="text-xs font-bold w-24 flex-shrink-0" style={{ color: "var(--accent)" }}>
                {event.startTime.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })}
                <br />
                {event.startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
              </div>
              <div>
                <div className="text-sm font-semibold">{event.title}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {event.owner?.name ?? "Family"} · {event.category}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
      <NavBar active="/calendar" />
    </div>
  );
}
