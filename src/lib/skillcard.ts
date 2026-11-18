// Skill Card: hasil "belajar" dari video contoh. Dibuat oleh modul Decode (tahap berikutnya),
// dibaca Director sebagai contoh. Metrik tempo meniru ide StyleProfile di repo referensi.
import { z } from "zod";

export const SkillCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  hookPattern: z.string(), // misal: "pertanyaan mengejutkan lalu jawaban singkat"
  structure: z.array(z.string()), // urutan beat: hook, masalah, penyebab, solusi, penutup
  pacing: z.object({
    avgSceneSec: z.number(),
    scenesPerMinute: z.number(),
    wordsPerSecond: z.number(),
  }),
  narrationStyle: z.string(),
  visualNotes: z.string().default(""),
});
export type SkillCard = z.infer<typeof SkillCardSchema>;
