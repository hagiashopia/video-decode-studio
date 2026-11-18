export interface TextRequest { system: string; prompt: string; maxTokens?: number }

export interface TextProvider {
  name: string;
  available(): boolean;
  generate(req: TextRequest): Promise<string>;
}

/** Dilempar Mode Tempel: pipeline berhenti, UI menampilkan prompt untuk disalin ke chat Claude. */
export class PasteRequired extends Error {
  constructor(public readonly bundle: string) {
    super("Menunggu JSON dari user (Mode Tempel).");
  }
}
