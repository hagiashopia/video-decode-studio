import { NextResponse } from "next/server";
import { getJob, saveStage } from "@/lib/queue";
import { parseStoryboard } from "@/lib/agents/director";
import { start } from "@/lib/boot";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Mode Tempel: user menempelkan JSON dari chat Claude. Divalidasi dengan skema yang sama seperti mode API.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  if (job.status !== "waiting_paste") return NextResponse.json({ error: "Job tidak sedang menunggu JSON." }, { status: 409 });
  const { json } = (await req.json().catch(() => ({}))) as { json?: string };
  try {
    saveStage(id, "plan", parseStoryboard(json ?? "", job.input));
  } catch (e: any) {
    return NextResponse.json({ error: `JSON belum sesuai skema: ${e?.message ?? e}` }, { status: 422 });
  }
  start(id); // lanjut dari checkpoint: tahap plan sudah terisi
  return NextResponse.json({ ok: true });
}
