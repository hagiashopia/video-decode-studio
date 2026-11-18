import { enqueue, recoverInterrupted } from "./queue";
import { runPipeline } from "./pipeline";

const g = globalThis as unknown as { __booted?: boolean };

/** Dipanggil dari setiap route API. Pertama kali dipanggil, job yang terputus dilanjutkan dari checkpoint. */
export function boot() {
  if (g.__booted) return;
  g.__booted = true;
  recoverInterrupted(runPipeline);
}
export const start = (id: string) => enqueue(id, runPipeline);
