// KONTRAK DATA antar tiga agent. Claude menulis ini, Gemini membaca sceneDelta
// untuk gambar, Remotion membaca seluruhnya untuk render. Ubah di sini saja.
import { z } from "zod";

export const ASPECTS = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
} as const;
export type AspectKey = keyof typeof ASPECTS;

export const CameraSchema = z.enum(["wide", "medium", "close", "punch-in", "pan-left", "pan-right"]);
export const TransitionSchema = z.enum(["cut", "fade", "slide", "zoom"]);

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Deskripsi visual tetap. Dipakai ulang di setiap adegan agar karakter konsisten.
  description: z.string(),
});

export const SceneSchema = z.object({
  id: z.number().int().positive(),
  durationSec: z.number().positive(),
  narration: z.string(), // teks voice over
  sceneDelta: z.string(), // HANYA apa yang berubah di adegan ini (bukan gaya, bukan deskripsi karakter)
  onScreenText: z.string().optional(),
  characters: z.array(z.string()).default([]), // id dari characterBible
  camera: CameraSchema.default("medium"),
  transition: TransitionSchema.default("fade"),
  sfx: z.string().optional(),
  locked: z.boolean().default(false), // adegan terkunci tidak ditulis ulang oleh loop QA
});

export const StoryboardSchema = z.object({
  title: z.string(),
  hook: z.string(),
  description: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  styleId: z.string(),
  characterBible: z.array(CharacterSchema).default([]),
  scenes: z.array(SceneSchema).min(1),
});

export const QASchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.string()).default([]),
});

export const JobInputSchema = z.object({
  prompt: z.string().min(3),
  durationSec: z.number().int().min(10).max(600),
  styleId: z.string(),
  aspect: z.enum(["9:16", "16:9", "1:1"]),
  language: z.string().default("id"),
  // claude = Pro (API), gemini = teks Gemini, paste = Mode Tempel (gratis, semi-manual)
  brain: z.enum(["claude", "gemini", "paste"]).default("paste"),
  skillCardId: z.string().optional(),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type JobInput = z.infer<typeof JobInputSchema>;

/** Mengambil objek JSON dari balasan model (membuang ```fence``` dan teks pembuka). */
export function extractJson(raw: string): unknown {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Tidak ada objek JSON di balasan.");
  return JSON.parse(s.slice(start, end + 1));
}
