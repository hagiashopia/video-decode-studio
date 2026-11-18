// Antrean job dengan checkpoint per tahap (pola dari queue.py + database.py repo referensi).
// Tahap yang sudah punya checkpoint dilewati, jadi job yang gagal di render tidak mengulang gambar.
import { db } from "./db";
import type { JobInput } from "./storyboard";

export type JobStatus = "queued" | "running" | "waiting_paste" | "done" | "error";
export interface JobRow {
  id: string; input: JobInput; status: JobStatus; step: string; progress: number; error: string | null;
}

export function createJob(input: JobInput): string {
  const id = crypto.randomUUID().slice(0, 12);
  db.prepare("INSERT INTO jobs (id,input,status,created_at) VALUES (?,?,?,?)")
    .run(id, JSON.stringify(input), "queued", Date.now());
  return id;
}

export function getJob(id: string): JobRow | null {
  const r = db.prepare("SELECT * FROM jobs WHERE id=?").get(id) as any;
  return r ? { ...r, input: JSON.parse(r.input) } : null;
}

export function updateJob(id: string, patch: Partial<Pick<JobRow, "status" | "step" | "progress" | "error">>) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  db.prepare(`UPDATE jobs SET ${keys.map((k) => `${k}=@${k}`).join(",")} WHERE id=@id`).run({ ...patch, id });
}

export function saveStage(jobId: string, name: string, data: unknown) {
  db.prepare("INSERT OR REPLACE INTO stages (job_id,name,data) VALUES (?,?,?)").run(jobId, name, JSON.stringify(data));
}
export function loadStage<T>(jobId: string, name: string): T | null {
  const r = db.prepare("SELECT data FROM stages WHERE job_id=? AND name=?").get(jobId, name) as { data: string } | undefined;
  return r ? (JSON.parse(r.data) as T) : null;
}

/** Jalankan fn hanya jika tahap belum punya checkpoint. */
export async function stage<T>(jobId: string, name: string, fn: () => Promise<T>): Promise<T> {
  const cached = loadStage<T>(jobId, name);
  if (cached !== null) return cached;
  const out = await fn();
  saveStage(jobId, name, out);
  return out;
}

// Runner dalam proses. Satu job per id pada satu waktu; maksimal MAX_CONCURRENT job paralel.
const MAX_CONCURRENT = 1; // render Remotion berat; naikkan hanya jika mesinnya kuat
const g = globalThis as unknown as { __running?: Set<string>; __waiting?: string[] };
const running = (g.__running ??= new Set());
const waiting = (g.__waiting ??= []);

export function enqueue(id: string, run: (id: string) => Promise<void>) {
  if (running.has(id) || waiting.includes(id)) return;
  waiting.push(id);
  pump(run);
}

function pump(run: (id: string) => Promise<void>) {
  while (running.size < MAX_CONCURRENT && waiting.length) {
    const id = waiting.shift()!;
    running.add(id);
    run(id)
      .catch((e) => updateJob(id, { status: "error", error: String(e?.message ?? e) }))
      .finally(() => { running.delete(id); pump(run); });
  }
}

/** Panggil saat server naik: job yang terputus di tengah jalan dilanjutkan dari checkpoint. */
export function recoverInterrupted(run: (id: string) => Promise<void>) {
  const rows = db.prepare("SELECT id FROM jobs WHERE status IN ('queued','running')").all() as { id: string }[];
  rows.forEach((r) => enqueue(r.id, run));
}
