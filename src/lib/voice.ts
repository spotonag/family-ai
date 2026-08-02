// Picks the best-sounding Australian English voice available from the
// browser's speech synthesis engine. The default voice most browsers use
// (usually the first English one alphabetically) tends to be an old-style
// robotic one — most OSes also ship a much smoother "natural"/"neural"
// voice that just isn't selected unless asked for by name.
//
// This can only choose among what's actually installed on the device —
// if the OS has no Australian voice at all, it falls back to the best
// English voice it can find, then the browser default.

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    // Voices load asynchronously in most browsers on first use.
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    // Safety net in case the event never fires (some browsers/webviews).
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

// Higher score = preferred. Natural/neural voices sound dramatically less
// robotic than the legacy SAPI-style ones most OSes still ship as default.
function score(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let s = 0;
  if (lang === "en-au") s += 100;
  else if (lang.startsWith("en")) s += 20;
  if (/natural|neural|online|premium/.test(name)) s += 50;
  if (/female/.test(name)) s += 2; // mild tie-breaker, no strong preference either way
  return s;
}

export async function getPreferredVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = await loadVoices();
  if (voices.length === 0) {
    cachedVoice = null;
    return null;
  }
  const best = [...voices].sort((a, b) => score(b) - score(a))[0];
  cachedVoice = best ?? null;
  return cachedVoice;
}
