"use client";

import { useRef, useState, useTransition } from "react";
import { deleteCalendarEvent, updateCalendarEvent } from "@/app/actions";
import { AttendeePicker } from "@/components/AttendeePicker";
import { FAMILY_TIMEZONE, utcToWallTimeLocal } from "@/lib/timezone";

type Profile = { id: string; name: string; avatarColor: string; avatarInitial: string };

const CATEGORIES = [
  { value: "school", label: "School" },
  { value: "sport", label: "Sport" },
  { value: "appointment", label: "Appointment" },
  { value: "other", label: "Other" },
];

export function CalendarEventRow({
  id,
  title,
  category,
  startTime,
  attendees,
  profiles,
}: {
  id: string;
  title: string;
  category: string;
  startTime: Date;
  attendees: Profile[];
  profiles: Profile[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(attendees.map((a) => a.id)));
  const formRef = useRef<HTMLFormElement>(null);

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function cancelEdit() {
    setSelected(new Set(attendees.map((a) => a.id)));
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        ref={formRef}
        action={(formData) => {
          formData.set("eventId", id);
          selected.forEach((profileId) => formData.append("attendeeIds", profileId));
          startTransition(async () => {
            await updateCalendarEvent(formData);
            setEditing(false);
          });
        }}
        className="flex flex-col gap-2 py-2.5"
        style={{ opacity: pending ? 0.6 : 1, borderTop: "1px solid var(--border)" }}
      >
        <input
          type="text"
          name="title"
          defaultValue={title}
          required
          className="text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px", color: "var(--ink)" }}
        />
        <div className="flex gap-2">
          <input
            type="datetime-local"
            name="startTime"
            defaultValue={utcToWallTimeLocal(startTime, FAMILY_TIMEZONE)}
            required
            className="flex-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 10px", color: "var(--ink)" }}
          />
          <select
            name="category"
            defaultValue={category}
            className="text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 10px", color: "var(--ink)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <AttendeePicker profiles={profiles} selected={selected} onToggle={toggle} />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="text-xs font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 10, padding: "7px 14px" }}>
            Save
          </button>
          <button type="button" onClick={cancelEdit} className="text-xs font-semibold" style={{ color: "var(--muted)", padding: "7px 4px" }}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="job-row" style={{ opacity: pending ? 0.5 : 1 }}>
      <div className="text-xs font-bold w-16 flex-shrink-0" style={{ color: "var(--accent)" }}>
        {startTime.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", timeZone: FAMILY_TIMEZONE })}
        <br />
        {startTime.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: FAMILY_TIMEZONE })}
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
        aria-label={`Edit ${title}`}
        onClick={() => setEditing(true)}
        style={{ color: "var(--muted)", flexShrink: 0, padding: 2 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
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
