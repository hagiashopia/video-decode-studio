// Alur: plan (Claude) → prompts (Distiller) → images (Gemini) → voice (Gemini TTS) → render (Remotion).
// Tiap tahap punya checkpoint; gambar/suara juga di-resume per file.
import fs from "node:fs";
import path from "node:path";
import { jobDir, db } from "./db";
import { getJob, loadStage, saveStage, stage, updateJob } from "./queue";
import { ASPECTS, type Storyboard } from "./storyboard";
import { getStyle } from "./styles";
import { SkillCardSchema, type SkillCard } from "./skillcard";
import { planStoryboard, buildPlanPrompt, DIRECTOR_SYSTEM } from "./agents/director";
import { distill, type ScenePrompt } from "./agents/distiller";
import { PasteRequired, geminiAvailable, geminiImage, geminiTTS } from "./providers";
import { renderVideo, type RenderProps } from "./render";

const FPS = 30;
const WORDS_PER_SEC = 2.6; // estimasi durasi narasi jika tidak ada TTS

function loadSkill(id?: string): SkillCard | null {
  if (!id) return null;
  const r = db.prepare("SELECT data FROM skill_cards WHERE id=?").get(id) as { data: string } | undefined;
  return r ? SkillCardSchema.parse(JSON.parse(r.data)) : null;
}

export async function runPipeline(jobId: string) {
  const job = getJob(jobId);
  if (!job) return;
  const { input } = job;
  const dir = jobDir(jobId);
  const style = getStyle(input.styleId);
  updateJob(jobId, { status: "running", error: null });

  // 1. PLAN
  updateJob(jobId, { step: "Menulis skrip dan storyboard", progress: 0.05 });
  let sb: Storyboard;
  try {
    sb = await stage(jobId, "plan", () => planStoryboard(input, loadSkill(input.skillCardId)));
  } catch (e) {
    if (e instanceof PasteRequired) {
      saveStage(jobId, "paste_prompt", { prompt: e.bundle });
      updateJob(jobId, { status: "waiting_paste", step: "Menunggu JSON dari chat Claude", progress: 0.1 });
      return;
    }
    throw e;
  }

  // 2. PROMPTS (deterministik, tanpa biaya)
  updateJob(jobId, { step: "Memadatkan prompt", progress: 0.2 });
  const { prompts, ledger } = await stage<{ prompts: ScenePrompt[]; ledger: string }>(jobId, "prompts", async () => distill(sb, style));
  fs.writeFileSync(path.join(dir, "prompts.md"), ledger);

  // 3. IMAGES: hanya style bertipe "image" dan bila ada GEMINI_API_KEY. Selain itu Remotion menggambar sendiri (gratis).
  const useAI = style.kind === "image" && geminiAvailable();
  const images: Record<number, string> = {};
  if (useAI) {
    let anchor: Buffer | undefined; // gambar adegan 1 jadi jangkar gaya untuk adegan berikutnya
    for (const [i, p] of prompts.entries()) {
      updateJob(jobId, { step: `Membuat gambar ${i + 1}/${prompts.length}`, progress: 0.2 + 0.4 * (i / prompts.length) });
      const file = `scene-${p.sceneId}.png`;
      const full = path.join(dir, file);
      if (!fs.existsSync(full)) fs.writeFileSync(full, await geminiImage(p.prompt, input.aspect, anchor));
      anchor ??= fs.readFileSync(full);
      images[p.sceneId] = file;
    }
  }

  // 4. VOICE: Gemini TTS bila tersedia; jika tidak, durasi diperkirakan dari jumlah kata.
  const audio: Record<number, string> = {};
  const durations: Record<number, number> = {};
  for (const [i, s] of sb.scenes.entries()) {
    const est = Math.max(2, s.narration.split(/\s+/).length / WORDS_PER_SEC);
    durations[s.id] = Math.max(s.durationSec, est);
    if (!geminiAvailable()) continue;
    updateJob(jobId, { step: `Membuat suara ${i + 1}/${sb.scenes.length}`, progress: 0.6 + 0.15 * (i / sb.scenes.length) });
    const file = `scene-${s.id}.wav`;
    const full = path.join(dir, file);
    const metaPath = full + ".json";
    if (!fs.existsSync(full)) {
      const { wav, seconds } = await geminiTTS(s.narration);
      fs.writeFileSync(full, wav);
      fs.writeFileSync(metaPath, JSON.stringify({ seconds }));
    }
    const { seconds } = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    audio[s.id] = file;
    durations[s.id] = seconds + 0.4; // jeda napas antar adegan
  }

  // 5. RENDER
  updateJob(jobId, { step: "Merender video", progress: 0.78 });
  const dim = ASPECTS[input.aspect];
  const props: RenderProps = {
    ...dim, fps: FPS, styleId: style.id,
    scenes: sb.scenes.map((s) => ({
      id: s.id, durationSec: durations[s.id], narration: s.narration, onScreenText: s.onScreenText,
      camera: s.camera, transition: s.transition, image: images[s.id], audio: audio[s.id],
    })),
  };
  await renderVideo(dir, props, (p) => updateJob(jobId, { progress: 0.78 + 0.2 * p }));
  updateJob(jobId, { status: "done", step: "Selesai", progress: 1 });
}

export { buildPlanPrompt, DIRECTOR_SYSTEM, loadStage };
