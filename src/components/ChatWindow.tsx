"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { sendMessage } from "@/app/chat/actions";

type Message = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "We've run out of milk.",
  "Who's cooking tonight?",
  "What jobs can I do?",
  "What do I have tomorrow?",
  "Who's winning this week?",
];

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function ChatWindow({ familyId, profileId, viewerName }: { familyId: string; profileId: string; viewerName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: `Hi ${viewerName} — ask me anything about dinner, jobs, the shopping list, or what's coming up.` },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Needs a secure context (https, or localhost) and browser support
    // (Chrome/Edge/Safari; not Firefox as of writing) — hide the mic
    // button entirely rather than show one that'll just fail silently.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextMessages = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    startTransition(async () => {
      const history = nextMessages.map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), text: m.text }));
      const reply = await sendMessage(history, familyId, profileId);
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
    });
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) submit(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
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
          placeholder={listening ? "Listening…" : "Ask the family AI…"}
          className="flex-1 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            borderRadius: 14,
            padding: "10px 14px",
            color: "var(--ink)",
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Stop listening" : "Speak your message"}
            style={{
              background: listening ? "#d64545" : "var(--surface-2)",
              color: listening ? "#fff" : "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "10px 12px",
              lineHeight: 0,
            }}
          >
            <MicIcon />
          </button>
        )}
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
