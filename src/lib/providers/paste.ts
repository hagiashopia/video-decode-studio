import { PasteRequired, type TextProvider, type TextRequest } from "./types";

// Mode Tempel: tidak memanggil API. Menyusun satu prompt lengkap untuk disalin user ke chat Claude.
export const pasteProvider: TextProvider = {
  name: "paste",
  available: () => true,
  async generate({ system, prompt }: TextRequest) {
    throw new PasteRequired(`${system}\n\n---\n\n${prompt}`);
  },
};
