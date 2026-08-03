"use client";

import { useRef, useTransition } from "react";
import { setDinnerPlan } from "@/app/actions";

type Profile = { id: string; name: string };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DinnerPlanForm({ familyId, actingProfileId, profiles }: { familyId: string; actingProfileId: string; profiles: Profile[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(() => setDinnerPlan(formData));
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 mt-3 pt-3"
      style={{ opacity: pending ? 0.6 : 1, borderTop: "1px solid var(--border)" }}
    >
      <input type="hidden" name="familyId" value={familyId} />
      <input type="hidden" name="actingProfileId" value={actingProfileId} />
      <div className="flex gap-2">
        <input
          type="date"
          name="date"
          defaultValue={todayStr()}
          className="text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px 10px",
            color: "var(--ink)",
          }}
        />
        <input
          type="text"
          name="mealName"
          placeholder="What's for dinner…"
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
      </div>
      <div className="flex gap-2">
        <select
          name="cookId"
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px 12px",
            color: "var(--ink)",
          }}
        >
          <option value="">Cook: unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} cooks
            </option>
          ))}
        </select>
        <select
          name="dishesId"
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 12,
            padding: "8px 12px",
            color: "var(--ink)",
          }}
        >
          <option value="">Dishes: unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} on dishes
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12, padding: "8px 16px" }}>
        Save dinner plan
      </button>
    </form>
  );
}
