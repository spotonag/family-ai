"use client";

import { useEffect, useRef, useState } from "react";
import { getPreferredVoice } from "@/lib/voice";

const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function AudioButton({
  idleLabel,
  replayLabel,
  transcript,
  gold = false,
}: {
  idleLabel: string;
  replayLabel: string;
  transcript: string;
  gold?: boolean;
}) {
  const [state, setState] = useState<"idle" | "playing" | "played">("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop talking if the user navigates away mid-sentence.
  useEffect(() => {
    return () => {
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, []);

  async function press() {
    if (state === "playing") return;

    if (!canSpeak) {
      // No speech synthesis available (unsupported browser) — fall back to
      // just revealing the transcript text after a beat.
      setState("playing");
      setTimeout(() => setState("played"), 1200);
      return;
    }

    window.speechSynthesis.cancel(); // clear anything queued/stuck
    const utterance = new SpeechSynthesisUtterance(transcript);
    const voice = await getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setState("playing");
    utterance.onend = () => setState("played");
    utterance.onerror = () => setState("played");
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  const label = state === "idle" ? idleLabel : state === "playing" ? "Playing…" : replayLabel;
  const open = state !== "idle";

  return (
    <div>
      <button
        onClick={press}
        className={`action-btn ${gold ? "gold" : ""} ${state !== "idle" ? "playing" : ""}`}
      >
        {state === "playing" ? (
          <span aria-hidden style={{ display: "flex", gap: 2.5, alignItems: "center", height: 16 }}>
            {[6, 14, 9, 16].map((h, i) => (
              <span
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: "currentColor",
                  animation: "bar 0.9s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>{label}</span>
      </button>
      <div
        style={{
          marginTop: open ? 12 : 0,
          maxHeight: open ? 260 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height .35s ease, opacity .3s ease, margin-top .35s ease",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
        }}
      >
        {transcript}
      </div>
      <style>{`@keyframes bar{0%,100%{transform:scaleY(.4);}50%{transform:scaleY(1);}}`}</style>
    </div>
  );
}
