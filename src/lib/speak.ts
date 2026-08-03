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

// Expands abbreviations that read badly out loud (both ElevenLabs and the
// browser's own voice say "km slash h" or skip the degree symbol entirely)
// into the words a person would actually say. Only affects what gets
// *spoken* — the on-screen transcript text is untouched, since "km/h" and
// "°C" are perfectly normal to read with your eyes.
function normalizeForSpeech(text: string): string {
  return text
    .replace(/°C/gi, " degrees")
    .replace(/\bkm\/h\b/gi, "kilometres per hour")
    // "8:00 pm" reads as "eight zero zero pm" — on-the-hour times need
    // spelling out as "o'clock" the way a person would actually say them.
    // Times with real minutes ("8:30 pm") are left alone; those already
    // read fine as-is.
    .replace(/\b(\d{1,2}):00\s*(am|pm)?\b/gi, (_match, hour, meridiem) => `${hour} o'clock${meridiem ? ` ${meridiem}` : ""}`)
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function speak(rawText: string): Promise<void> {
  stopSpeaking();
  const text = normalizeForSpeech(rawText);

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
