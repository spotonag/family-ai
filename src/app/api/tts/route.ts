import { NextRequest } from "next/server";

// "Hannah" — a natural-sounding Australian voice from ElevenLabs' voice
// library. Override with ELEVENLABS_VOICE_ID to use a different one from
// your own account's voice library (elevenlabs.io/app/voice-library).
const DEFAULT_VOICE_ID = "M7ya1YbaeFaPXljg9BpK";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Not configured — client falls back to the browser's own voice.
    return new Response(null, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const text = body?.text;
  if (!text || typeof text !== "string") {
    return new Response(null, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.96 },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("ElevenLabs TTS failed:", upstream.status, await upstream.text().catch(() => ""));
    return new Response(null, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
