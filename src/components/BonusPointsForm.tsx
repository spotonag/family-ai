"use client";

import { useRef, useState, useTransition } from "react";
import { addBonusPoints } from "@/app/actions";

type Profile = { id: string; name: string };

export function BonusPointsForm({ actingProfileId, profiles }: { actingProfileId: string; profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-bold mt-2"
        style={{ color: "var(--accent)" }}
      >
        + Give bonus points
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(() => addBonusPoints(formData));
        formRef.current?.reset();
        setOpen(false);
      }}
      className="flex flex-col gap-2 mt-2 pt-2"
      style={{ borderTop: "1px solid var(--border)", opacity: pending ? 0.6 : 1 }}
    >
      <input type="hidden" name="actingProfileId" value={actingProfileId} />
      <div className="flex gap-2">
        <select
          name="targetProfileId"
          required
          className="flex-1 text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, padding: "6px 10px", color: "var(--ink)" }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="amount"
          placeholder="+10"
          required
          min={1}
          className="w-16 text-sm text-center"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, padding: "6px", color: "var(--ink)" }}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          name="note"
          placeholder="For helping Grandma…"
          className="flex-1 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, padding: "6px 10px", color: "var(--ink)" }}
        />
        <button type="submit" className="text-xs font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 10, padding: "6px 14px" }}>
          Give
        </button>
      </div>
    </form>
  );
}
