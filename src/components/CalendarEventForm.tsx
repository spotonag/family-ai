"use client";

import { useRef, useState, useTransition } from "react";
import { addCalendarEvent } from "@/app/actions";
import { AttendeePicker } from "@/components/AttendeePicker";

type Profile = { id: string; name: string; avatarColor: string; avatarInitial: string };

const CATEGORIES = [
  { value: "school", label: "School" },
  { value: "sport", label: "Sport" },
  { value: "appointment", label: "Appointment" },
  { value: "other", label: "Other" },
];

export function CalendarEventForm({ familyId, profiles }: { familyId: string; profiles: Profile[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        selected.forEach((id) => formData.append("attendeeIds", id));
        startTransition(() => addCalendarEvent(formData));
        formRef.current?.reset();
        setSelected(new Set());
      }}
      className="flex flex-col gap-2"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <input type="hidden" name="familyId" value={familyId} />

      <input
        type="text"
        name="title"
        placeholder="What's happening?"
        required
        className="text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px", color: "var(--ink)" }}
      />

      <div className="flex gap-2">
        <input
          type="datetime-local"
          name="startTime"
          required
          className="flex-1 text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 10px", color: "var(--ink)" }}
        />
        <select
          name="category"
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

      <div>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
          Who's this for? (pick as many as you want, or none for the whole family)
        </p>
        <AttendeePicker profiles={profiles} selected={selected} onToggle={toggle} />
      </div>

      <button
        type="submit"
        className="text-sm font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12, padding: "10px 16px" }}
      >
        Add to calendar
      </button>
    </form>
  );
}
