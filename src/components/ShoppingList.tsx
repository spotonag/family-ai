"use client";

import { useRef, useTransition } from "react";
import { addShoppingItem, markPurchased } from "@/app/actions";

type Item = { id: string; name: string };

export function ShoppingList({
  items,
  familyId,
  viewerId,
  full = false,
}: {
  items: Item[];
  familyId: string;
  viewerId: string;
  full?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const shown = full ? items : items.slice(0, 5);
  const overflow = items.length - shown.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {items.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Nothing on the list — nice work.</span>
        )}
        {shown.map((item) => (
          <button
            key={item.id}
            className="shop-chip"
            onClick={() => startTransition(() => markPurchased(item.id))}
            title="Mark as purchased"
            style={{ opacity: pending ? 0.6 : 1 }}
          >
            {item.name}
          </button>
        ))}
        {!full && overflow > 0 && <span className="shop-chip">+{overflow} more</span>}
      </div>
      <form
        ref={formRef}
        action={(formData) => {
          startTransition(() => addShoppingItem(formData));
          formRef.current?.reset();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "10px 12px",
        }}
      >
        <input type="hidden" name="familyId" value={familyId} />
        <input type="hidden" name="addedById" value={viewerId} />
        <input
          type="text"
          name="name"
          placeholder="Add an item…"
          required
          style={{ border: "none", background: "none", outline: "none", flex: 1, fontSize: 13.5, color: "var(--ink)" }}
        />
        <button
          type="submit"
          aria-label="Add item"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>
    </div>
  );
}
