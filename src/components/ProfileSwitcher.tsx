"use client";

import { useState, useTransition } from "react";
import { switchViewer } from "@/app/actions";

type Profile = { id: string; name: string; avatarColor: string; avatarInitial: string; role: string };

export function ProfileSwitcher({ profiles, viewerId }: { profiles: Profile[]; viewerId: string }) {
  const [pending, startTransition] = useTransition();
  const [pinTarget, setPinTarget] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function pick(p: Profile) {
    if (pending) return;
    if (p.role === "parent" && p.id !== viewerId) {
      setPinTarget(p);
      setPin("");
      setError("");
      return;
    }
    startTransition(() => {
      void switchViewer(p.id);
    });
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinTarget) return;
    startTransition(async () => {
      const result = await switchViewer(pinTarget.id, pin);
      if (result.ok) {
        setPinTarget(null);
      } else {
        setError(result.error ?? "Incorrect PIN.");
      }
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6, opacity: pending ? 0.6 : 1 }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            className="avatar"
            title={p.role === "parent" ? `Switch to ${p.name} (PIN required)` : `Viewing as ${p.name}`}
            onClick={() => pick(p)}
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

      {pinTarget && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 14,
            boxShadow: "var(--shadow)",
            width: 220,
          }}
        >
          <form onSubmit={submitPin} className="flex flex-col gap-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Enter {pinTarget.name}&rsquo;s PIN
            </div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-sm text-center"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                borderRadius: 10,
                padding: "8px",
                color: "var(--ink)",
                letterSpacing: "0.3em",
              }}
            />
            {error && (
              <div className="text-xs" style={{ color: "#c1585f" }}>
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinTarget(null)}
                className="flex-1 text-xs font-semibold"
                style={{ padding: "7px", borderRadius: 10, color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 text-xs font-bold"
                style={{ padding: "7px", borderRadius: 10, background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Switch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
