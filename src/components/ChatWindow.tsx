"use client";

import { useState, useRef, useTransition } from "react";
import { sendMessage } from "@/app/chat/actions";

type Message = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "We've run out of milk.",
  "Who's cooking tonight?",
  "What jobs can I do?",
  "What do I have tomorrow?",
  "Who's winning this week?",
];

export function ChatWindow({ familyId, profileId, viewerName }: { familyId: string; profileId: string; viewerName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: `Hi ${viewerName} — ask me anything about dinner, jobs, the shopping list, or what's coming up.` },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    startTransition(async () => {
      const reply = await sendMessage(trimmed, familyId, profileId);
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
    });
  }

  return (
    <div className="card flex flex-col" style={{ height: "60vh" }}>
      <div ref={listRef} className="flex flex-col gap-2.5 flex-1 overflow-y-auto pb-2">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : "ai"}`}>
            {m.text}
          </div>
        ))}
        {pending && <div className="chat-bubble ai" style={{ opacity: 0.6 }}>Thinking…</div>}
      </div>

      <div className="flex flex-wrap gap-1.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className="shop-chip" onClick={() => submit(s)} style={{ fontSize: 11.5 }}>
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the family AI…"
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 14,
            padding: "10px 14px",
            color: "var(--ink)",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 14, padding: "10px 18px" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
