"use client";

import { useTransition } from "react";
import { deleteCalendarEvent } from "@/app/actions";

type Attendee = { id: string; name: string; avatarColor: string; avatarInitial: string };

export function CalendarEventRow({
  id,
  title,
  category,
  startTime,
  attendees,
}: {
  id: string;
  title: string;
  category: string;
  startTime: Date;
  attendees: Attendee[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="job-row" style={{ opacity: pending ? 0.5 : 1 }}>
      <div className="text-xs font-bold w-16 flex-shrink-0" style={{ color: "var(--accent)" }}>
        {startTime.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })}
        <br />
        {startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {category}
        </div>
      </div>
      {attendees.length > 0 && (
        <div className="flex -space-x-1.5">
          {attendees.map((a) => (
            <div key={a.id} className="avatar sm" title={a.name} style={{ background: a.avatarColor, border: "2px solid var(--surface)" }}>
              {a.avatarInitial}
            </div>
          ))}
        </div>
      )}
      <button
        aria-label={`Remove ${title}`}
        onClick={() => startTransition(() => deleteCalendarEvent(id))}
        style={{ color: "var(--muted)", flexShrink: 0, padding: 2 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M9 6V4h6v2m-8 0 1 14h10l1-14" />
        </svg>
      </button>
    </div>
  );
}
