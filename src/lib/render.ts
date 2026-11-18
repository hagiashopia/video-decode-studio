import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

export interface RenderProps {
  width: number; height: number; fps: number; styleId: string;
  scenes: {
    id: number; durationSec: number; narration: string; onScreenText?: string;
    camera: string; transition: string; image?: string; audio?: string;
  }[];
}

/** Render Remotion. Aset (gambar/wav) diambil dari folder job lewat staticFile(). */
export async function renderVideo(dir: string, props: RenderProps, onProgress: (p: number) => void): Promise<string> {
  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    publicDir: dir,
  });
  const inputProps = props as unknown as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: "Explainer", inputProps });
  const out = path.join(dir, "final.mp4");
  await renderMedia({
    composition, serveUrl, codec: "h264", outputLocation: out, inputProps,
    onProgress: ({ progress }) => onProgress(progress),
  });
  return out;
}
