"use client";

import { useState, useTransition } from "react";
import { updateProfileName } from "@/app/actions";

type Profile = { id: string; name: string; role: string; avatarColor: string; avatarInitial: string };

export function EditableFamilyMemberRow({ profile, actingProfileId }: { profile: Profile; actingProfileId: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateProfileName(profile.id, name, actingProfileId);
      if (result.ok) {
        setEditing(false);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="avatar sm" style={{ background: profile.avatarColor }}>
            {name ? name[0].toUpperCase() : profile.avatarInitial}
          </div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setName(profile.name);
                setEditing(false);
              }
            }}
            className="flex-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 8, padding: "4px 8px", color: "var(--ink)" }}
          />
          <button
            onClick={save}
            disabled={pending}
            className="text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 8, padding: "5px 10px" }}
          >
            Save
          </button>
          <button
            onClick={() => {
              setName(profile.name);
              setEditing(false);
              setError("");
            }}
            className="text-xs font-semibold"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>
        </div>
        {error && (
          <div className="text-xs" style={{ color: "#c1585f", marginLeft: 42 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="avatar sm" style={{ background: profile.avatarColor }}>
        {profile.avatarInitial}
      </div>
      <span className="text-sm font-semibold">{profile.name}</span>
      <span className="chip" style={{ marginLeft: "auto" }}>
        {profile.role === "parent" ? "Parent" : "Child"}
      </span>
      <button onClick={() => setEditing(true)} aria-label={`Edit ${profile.name}`} style={{ color: "var(--muted)", padding: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  );
}
