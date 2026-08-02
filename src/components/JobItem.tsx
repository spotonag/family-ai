"use client";

import { useTransition } from "react";
import { toggleJob, deleteJob } from "@/app/actions";

export function JobItem({
  id,
  title,
  points,
  done,
  assigneeInitial,
  assigneeColor,
  canDelete = false,
  actingProfileId,
}: {
  id: string;
  title: string;
  points: number;
  done: boolean;
  assigneeInitial?: string;
  assigneeColor?: string;
  canDelete?: boolean;
  actingProfileId?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="job-row" style={{ opacity: pending ? 0.6 : 1 }}>
      <button
        aria-label={done ? `Mark ${title} not done` : `Mark ${title} done`}
        className={`job-box ${done ? "done" : ""}`}
        onClick={() => startTransition(() => toggleJob(id))}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className={`job-label ${done ? "done" : ""}`} style={{ flex: 1, fontSize: 14, fontWeight: 650 }}>
        {title}
      </div>
      {assigneeInitial && (
        <div className="avatar sm" style={{ background: assigneeColor }}>
          {assigneeInitial}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 750, color: "var(--gold)" }}>+{points}</div>
      {canDelete && actingProfileId && (
        <button
          aria-label={`Delete ${title}`}
          onClick={() => startTransition(() => deleteJob(id, actingProfileId))}
          style={{ color: "var(--muted)", flexShrink: 0, padding: 2 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M9 6V4h6v2m-8 0 1 14h10l1-14" />
          </svg>
        </button>
      )}
    </div>
  );
}
