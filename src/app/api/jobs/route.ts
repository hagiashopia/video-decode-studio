import { NextResponse } from "next/server";
import { JobInputSchema } from "@/lib/storyboard";
import { createJob } from "@/lib/queue";
import { boot, start } from "@/lib/boot";

export const runtime = "nodejs";

export async function POST(req: Request) {
  boot();
  const parsed = JobInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = createJob(parsed.data);
  start(id);
  return NextResponse.json({ id });
}
