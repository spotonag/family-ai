"use client";

import { useRef, useState, useTransition } from "react";
import { addFamilyMember } from "@/app/actions";

export function AddFamilyMemberForm({ familyId, actingProfileId }: { familyId: string; actingProfileId: string }) {
  const [role, setRole] = useState<"child" | "parent">("child");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await addFamilyMember(formData);
          if (result.ok) {
            formRef.current?.reset();
            setRole("child");
          } else {
            setError(result.error ?? "Something went wrong.");
          }
        });
      }}
      className="flex flex-col gap-2"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <input type="hidden" name="familyId" value={familyId} />
      <input type="hidden" name="actingProfileId" value={actingProfileId} />

      <input
        type="text"
        name="name"
        placeholder="Name"
        required
        className="text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px", color: "var(--ink)" }}
      />

      <div className="flex gap-2">
        <label className="flex-1 flex items-center gap-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px" }}>
          <input type="radio" name="role" value="child" checked={role === "child"} onChange={() => setRole("child")} />
          Child
        </label>
        <label className="flex-1 flex items-center gap-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px" }}>
          <input type="radio" name="role" value="parent" checked={role === "parent"} onChange={() => setRole("parent")} />
          Parent / Admin
        </label>
      </div>

      {role === "parent" && (
        <input
          type="text"
          name="pin"
          inputMode="numeric"
          maxLength={4}
          placeholder="4-digit PIN"
          required
          className="text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px", color: "var(--ink)", letterSpacing: "0.2em" }}
        />
      )}

      {error && (
        <div className="text-xs" style={{ color: "#c1585f" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="text-sm font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12, padding: "10px 16px" }}
      >
        Add family member
      </button>
    </form>
  );
}
