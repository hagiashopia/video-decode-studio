// Agent Prompt Distiller: prompt akhir per adegan = style pack + karakter + sceneDelta.
// Style dan karakter ditulis sekali, adegan hanya membawa perubahan. Hasilnya juga dicatat ke prompts.md.
import type { Storyboard } from "../storyboard";
import type { StylePack } from "../styles";

export interface ScenePrompt { sceneId: number; prompt: string }

export function distill(sb: Storyboard, style: StylePack): { prompts: ScenePrompt[]; ledger: string } {
  const chars = new Map(sb.characterBible.map((c) => [c.id, c]));
  const prompts = sb.scenes.map((s) => {
    const who = s.characters.map((id) => chars.get(id)).filter(Boolean)
      .map((c) => `${c!.name}: ${c!.description}`).join("; ");
    const prompt = [style.imagePrompt, who && `Characters: ${who}`, `Scene: ${s.sceneDelta}`, `Camera: ${s.camera}`]
      .filter(Boolean).join(". ");
    return { sceneId: s.id, prompt };
  });

  const ledger = [
    `# Ledger prompt: ${sb.title}`,
    `\nStyle pack \`${style.id}\` (ditulis sekali): ${style.imagePrompt}`,
    `\n## Character bible (ditulis sekali)`,
    ...sb.characterBible.map((c) => `- **${c.name}** (${c.id}): ${c.description}`),
    `\n## Per adegan (hanya perubahan)`,
    ...sb.scenes.map((s) => `${s.id}. ${s.sceneDelta}\n   - narasi: ${s.narration}`),
    `\n## Prompt gambar final`,
    ...prompts.map((p) => `${p.sceneId}. ${p.prompt}`),
  ].join("\n");

  return { prompts, ledger };
}
