// Shared "speak this text aloud" helper — tries the real ElevenLabs voice
// (via /api/tts) first, falling back to the browser's own speechSynthesis
// voice if ElevenLabs isn't configured or the request fails. Used by both
// the Briefing/Wrap-Up Play button and the AI chat's spoken replies, so
// there's exactly one place that knows how to fall back.
import { getPreferredVoice } from "@/lib/voice";

const canSpeakBrowser = typeof window !== "undefined" && "speechSynthesis" in window;

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking() {
  if (canSpeakBrowser) window.speechSynthesis.cancel();
  currentAudio?.pause();
  currentAudio = null;
}

export async function speak(text: string): Promise<void> {
  stopSpeaking();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      await new Promise<void>((resolve) => {
        const done = () => {
          URL.revokeObjectURL(url);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      });
      return;
    }
  } catch {
    // network error etc — fall through to the browser voice below
  }

  if (!canSpeakBrowser) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = await getPreferredVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 0.96;
  utterance.pitch = 1;
  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
