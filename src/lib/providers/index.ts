// Gateway: satu pintu untuk semua penyedia teks (pola dari model_gateway.py repo referensi).
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { pasteProvider } from "./paste";
import type { TextProvider } from "./types";

const ALL: Record<string, TextProvider> = { claude: claudeProvider, gemini: geminiProvider, paste: pasteProvider };

/** Urutan failover per pilihan otak. Mode Tempel selalu jadi pilihan terakhir yang tersedia. */
const ORDER: Record<string, string[]> = {
  claude: ["claude", "gemini", "paste"],
  gemini: ["gemini", "paste"],
  paste: ["paste"],
};

export function pickProvider(brain: string): TextProvider {
  for (const name of ORDER[brain] ?? ["paste"]) {
    if (ALL[name].available()) return ALL[name];
  }
  return pasteProvider;
}

export * from "./types";
export { geminiAvailable, geminiImage, geminiTTS } from "./gemini";
