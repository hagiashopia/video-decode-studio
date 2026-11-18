import fs from "node:fs";
import path from "node:path";
import { jobDir } from "@/lib/db";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Versi sederhana tanpa dukungan Range. Untuk produksi, layani lewat storage/CDN.
export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/i.test(id)) return new Response("Bad id", { status: 400 });
  const file = path.join(jobDir(id), "final.mp4");
  if (!fs.existsSync(file)) return new Response("Belum ada video.", { status: 404 });
  return new Response(fs.readFileSync(file), {
    headers: { "content-type": "video/mp4", "content-disposition": `inline; filename="video-${id}.mp4"` },
  });
}
