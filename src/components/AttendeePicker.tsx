"use client";

type Profile = { id: string; name: string; avatarColor: string; avatarInitial: string };

// Shared "pick as many as you want" avatar-chip toggle row — used by both
// the add-event form and the edit-in-place row, so the two can't drift
// apart visually.
export function AttendeePicker({
  profiles,
  selected,
  onToggle,
}: {
  profiles: Profile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((p) => {
        const on = selected.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className="avatar sm"
            title={p.name}
            style={{
              background: p.avatarColor,
              outline: on ? "2.5px solid var(--ink)" : "2.5px solid transparent",
              outlineOffset: 1,
              opacity: on ? 1 : 0.55,
            }}
          >
            {p.avatarInitial}
          </button>
        );
      })}
    </div>
  );
}
