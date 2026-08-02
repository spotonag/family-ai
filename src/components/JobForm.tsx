"use client";

import { useRef, useTransition } from "react";
import { addJob } from "@/app/actions";

type Profile = { id: string; name: string };

export function JobForm({ familyId, profiles }: { familyId: string; profiles: Profile[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(() => addJob(formData));
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <input type="hidden" name="familyId" value={familyId} />
      <div className="flex gap-2">
        <input
          type="text"
          name="title"
          placeholder="New job…"
          required
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px 12px",
            color: "var(--ink)",
          }}
        />
        <input
          type="number"
          name="points"
          defaultValue={5}
          min={1}
          className="w-16 text-sm text-center"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px",
            color: "var(--ink)",
          }}
        />
      </div>
      <div className="flex gap-2">
        <select
          name="assignedToId"
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px 12px",
            color: "var(--ink)",
          }}
        >
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12, padding: "8px 16px" }}>
          Add
        </button>
      </div>
    </form>
  );
}
