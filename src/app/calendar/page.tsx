import { db } from "@/lib/db";
import { getFamily, getViewerId, pickViewer, startOfToday } from "@/lib/family";
import { CalendarEventForm } from "@/components/CalendarEventForm";
import { CalendarEventRow } from "@/components/CalendarEventRow";
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
    include: { attendees: true },
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

        <section className="card mb-3">
          <p className="card-title">Add to calendar</p>
          <CalendarEventForm familyId={family.id} profiles={family.profiles} />
        </section>

        <section className="card">
          <p className="card-title">Upcoming</p>
          {events.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nothing scheduled yet.
            </p>
          )}
          {events.map((event) => (
            <CalendarEventRow
              key={event.id}
              id={event.id}
              title={event.title}
              category={event.category}
              startTime={event.startTime}
              attendees={event.attendees}
              profiles={family.profiles}
            />
          ))}
        </section>
      </div>
      <NavBar active="/calendar" />
    </div>
  );
}
