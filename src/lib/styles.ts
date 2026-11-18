// Style Pack: disimpan sekali, dipanggil dengan id. Aman diimpor dari klien (tanpa dependensi Node).
export type StyleKind = "code" | "image";

export interface StylePack {
  id: string;
  name: string;
  kind: StyleKind; // code = digambar Remotion (gratis), image = butuh model gambar (berbayar)
  imagePrompt: string; // dipakai hanya untuk kind "image" atau saat user memilih gambar AI
  palette: { bg: string; ink: string; accent: string };
  figure?: "stickman" | "cubeman" | "woodman";
}

export const STYLES: StylePack[] = [
  {
    id: "stickman", name: "Sticky man", kind: "code",
    imagePrompt: "Minimalist stick figure animation, thick black lines, flat pastel background, no shading",
    palette: { bg: "#F5F1E8", ink: "#1B1B1B", accent: "#E5484D" }, figure: "stickman",
  },
  {
    id: "cubeman", name: "Cubeman", kind: "code",
    imagePrompt: "Low-poly cube-headed character, flat colors, clean isometric background",
    palette: { bg: "#E8F0FF", ink: "#1D2A44", accent: "#2F6BFF" }, figure: "cubeman",
  },
  {
    id: "woodman", name: "Sticky woodman", kind: "code",
    imagePrompt: "Wooden articulated mannequin character, soft studio light, simple backdrop",
    palette: { bg: "#EFE6D8", ink: "#3B2A1A", accent: "#B7791F" }, figure: "woodman",
  },
  {
    id: "pixar", name: "Pixar", kind: "image",
    imagePrompt: "3D animated film style, expressive characters, soft cinematic lighting, vibrant colors, shallow depth of field",
    palette: { bg: "#101828", ink: "#FFFFFF", accent: "#FFB020" },
  },
];

export const getStyle = (id: string): StylePack => STYLES.find((s) => s.id === id) ?? STYLES[0];
