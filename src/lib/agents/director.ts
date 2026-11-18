// Agent Director (otak). Menulis Storyboard JSON, lalu QA dengan loop perbaikan otomatis
// (pola CreativeDirectorAgent + QualityAssuranceAgent dari repo referensi: skor < 80, maksimal 2 revisi).
import { StoryboardSchema, QASchema, extractJson, type JobInput, type Storyboard } from "../storyboard";
import { getStyle } from "../styles";
import type { SkillCard } from "../skillcard";
import { pickProvider, type TextProvider } from "../providers";

const SYSTEM = `Kamu adalah sutradara video animasi penjelasan (explainer). Kamu hanya membalas dengan SATU objek JSON valid, tanpa teks lain.
Aturan:
- "sceneDelta" hanya berisi apa yang BERUBAH di adegan itu (aksi, objek, ekspresi). Jangan ulang gaya visual atau deskripsi karakter; keduanya ditempel otomatis.
- Setiap karakter didefinisikan sekali di "characterBible" lalu dirujuk lewat id.
- Narasi singkat, lisan, dan enak didengar. Hook di 3 detik pertama.
- Jumlah durationSec seluruh adegan ≈ durasi target.`;

const SCHEMA_HINT = `Skema JSON:
{"title":"","hook":"","description":"","hashtags":[""],"styleId":"",
 "characterBible":[{"id":"c1","name":"","description":"ciri visual tetap"}],
 "scenes":[{"id":1,"durationSec":6,"narration":"","sceneDelta":"","onScreenText":"","characters":["c1"],
   "camera":"wide|medium|close|punch-in|pan-left|pan-right","transition":"cut|fade|slide|zoom","sfx":""}]}`;

export function buildPlanPrompt(input: JobInput, skill?: SkillCard | null, feedback?: string, locked?: unknown[]): string {
  const style = getStyle(input.styleId);
  const nScenes = Math.max(3, Math.round(input.durationSec / 6));
  return [
    `Permintaan user: ${input.prompt}`,
    `Durasi target: ${input.durationSec} detik (sekitar ${nScenes} adegan). Bahasa narasi: ${input.language}.`,
    `Style: ${style.name} (styleId "${style.id}"). Rasio video: ${input.aspect}.`,
    skill ? `Contoh pola dari video referensi (tiru strukturnya, bukan isinya):\n${JSON.stringify(skill)}` : "",
    feedback ? `Perbaiki masalah berikut dari review sebelumnya:\n${feedback}` : "",
    locked?.length ? `Adegan terkunci, pertahankan persis:\n${JSON.stringify(locked)}` : "",
    SCHEMA_HINT,
  ].filter(Boolean).join("\n\n");
}

/** Normalisasi hasil agar total durasi sesuai target dan id berurutan. */
function normalize(sb: Storyboard, input: JobInput): Storyboard {
  const sum = sb.scenes.reduce((a, s) => a + s.durationSec, 0) || 1;
  const k = input.durationSec / sum;
  return {
    ...sb,
    styleId: input.styleId,
    scenes: sb.scenes.map((s, i) => ({ ...s, id: i + 1, durationSec: s.locked ? s.durationSec : +(s.durationSec * k).toFixed(2) })),
  };
}

export function parseStoryboard(raw: string, input: JobInput): Storyboard {
  return normalize(StoryboardSchema.parse(extractJson(raw)), input);
}

async function review(p: TextProvider, sb: Storyboard): Promise<{ score: number; issues: string[] }> {
  const raw = await p.generate({
    system: 'Kamu QA video explainer. Balas JSON saja: {"score":0-100,"issues":["..."]}. Nilai hook, alur sebab-akibat, tempo, dan kejelasan visual.',
    prompt: JSON.stringify(sb),
    maxTokens: 800,
  });
  return QASchema.parse(extractJson(raw));
}

/** Dipanggil oleh pipeline. Pada Mode Tempel, provider melempar PasteRequired di panggilan pertama. */
export async function planStoryboard(input: JobInput, skill?: SkillCard | null): Promise<Storyboard> {
  const provider = pickProvider(input.brain);
  let sb = parseStoryboard(await provider.generate({ system: SYSTEM, prompt: buildPlanPrompt(input, skill) }), input);

  if (provider.name === "paste") return sb; // tanpa QA otomatis: hindari bolak-balik manual

  for (let i = 0; i < 2; i++) {
    const qa = await review(provider, sb);
    if (qa.score >= 80) break;
    const locked = sb.scenes.filter((s) => s.locked);
    const next = parseStoryboard(
      await provider.generate({ system: SYSTEM, prompt: buildPlanPrompt(input, skill, qa.issues.join("\n- "), locked) }),
      input,
    );
    const lockedById = new Map(locked.map((s) => [s.id, s]));
    sb = { ...next, scenes: next.scenes.map((s) => lockedById.get(s.id) ?? s) };
  }
  return sb;
}

export const DIRECTOR_SYSTEM = SYSTEM;
