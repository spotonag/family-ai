"use client";

import { useTransition } from "react";
import { setViewer } from "@/app/actions";

type Profile = { id: string; name: string; avatarColor: string; avatarInitial: string };

export function ProfileSwitcher({ profiles, viewerId }: { profiles: Profile[]; viewerId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 6, opacity: pending ? 0.6 : 1 }}>
      {profiles.map((p) => (
        <button
          key={p.id}
          className="avatar"
          title={`Viewing as ${p.name}`}
          onClick={() => startTransition(() => setViewer(p.id))}
          style={{
            background: p.avatarColor,
            outline: p.id === viewerId ? "2.5px solid var(--ink)" : "2.5px solid transparent",
            outlineOffset: 1,
          }}
        >
          {p.avatarInitial}
        </button>
      ))}
    </div>
  );
}
