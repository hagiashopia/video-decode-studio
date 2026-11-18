import type { TextProvider, TextRequest } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const key = () => process.env.GEMINI_API_KEY ?? "";

async function call(model: string, body: unknown) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export const geminiAvailable = () => Boolean(key());

export const geminiProvider: TextProvider = {
  name: "gemini",
  available: geminiAvailable,
  async generate({ system, prompt, maxTokens = 4096 }: TextRequest) {
    const data = await call(process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash", {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    });
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p.text ?? "").join("");
  },
};

/** Gambar per adegan. refImage (opsional) dikirim sebagai jangkar agar gaya/karakter tetap serupa. */
export async function geminiImage(prompt: string, aspect: string, refImage?: Buffer): Promise<Buffer> {
  const parts: any[] = [];
  if (refImage) parts.push({ inlineData: { mimeType: "image/png", data: refImage.toString("base64") } });
  parts.push({
    text: (refImage ? "Keep the same character design and art style as the reference image. " : "") +
      `${prompt}. Aspect ratio ${aspect}.`,
  });
  const data = await call(process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image", {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  const out = (data.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data);
  if (!out) throw new Error("Gemini tidak mengembalikan gambar (mungkin ditolak filter keamanan).");
  return Buffer.from(out.inlineData.data, "base64");
}

/** Suara narator. Mengembalikan WAV dan durasinya (detik). */
export async function geminiTTS(text: string): Promise<{ wav: Buffer; seconds: number }> {
  const data = await call(process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts", {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_VOICE ?? "Kore" } } },
    },
  });
  const part = (data.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data);
  if (!part) throw new Error("Gemini TTS tidak mengembalikan audio.");
  const pcm = Buffer.from(part.inlineData.data, "base64"); // PCM 16-bit mono 24 kHz
  return { wav: pcmToWav(pcm, 24000), seconds: pcm.length / (24000 * 2) };
}

function pcmToWav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
