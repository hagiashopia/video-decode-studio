import { NextResponse } from "next/server";
import { getJob, loadStage } from "@/lib/queue";
import { boot } from "@/lib/boot";
import { buildPlanPrompt, DIRECTOR_SYSTEM } from "@/lib/agents/director";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  boot();
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  const pending = job.status === "waiting_paste" ? loadStage<{ prompt: string }>(id, "paste_prompt") : null;
  const plan = loadStage<{ title: string; description: string; hashtags: string[] }>(id, "plan");
  return NextResponse.json({
    id: job.id, status: job.status, step: job.step, progress: job.progress, error: job.error,
    pastePrompt: pending?.prompt ?? null,
    meta: plan ? { title: plan.title, description: plan.description, hashtags: plan.hashtags } : null,
  });
}
