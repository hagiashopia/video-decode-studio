# Video Decode Studio (kerangka)

Satu kalimat → video animasi. Claude = otak, Gemini = gambar dan suara, Remotion = render.
Semua berbasis TypeScript. Dirancang dengan mengambil pola (bukan kode) dari repo AI-Content-Studio.

## Menjalankan
```bash
npm install --save-exact        # semua paket remotion harus versi yang sama persis
cp .env.example .env            # opsional; tanpa key pun jalan (Mode Tempel + style kode)
npm run dev                     # http://localhost:3000
```
Butuh Node 20+. Render pertama mengunduh Chromium untuk Remotion; ffmpeg ikut dibundel Remotion.
`npm run remotion:studio` membuka pratinjau komposisi.

## Peta file
| File | Peran |
|---|---|
| `src/lib/storyboard.ts` | **Kontrak data** (skema Zod). Ubah ini bila ingin menambah field adegan. |
| `src/lib/styles.ts` | Style pack (id, tipe code/image, palet). |
| `src/lib/skillcard.ts` | Skema Skill Card (diisi modul Decode, tahap berikutnya). |
| `src/lib/queue.ts`, `db.ts` | Antrean job + checkpoint per tahap (SQLite). Job terputus dilanjutkan. |
| `src/lib/providers/*` | Gateway: Claude, Gemini (teks/gambar/TTS), Mode Tempel. |
| `src/lib/agents/director.ts` | Storyboard JSON + QA otomatis (skor < 80, maksimal 2 revisi). |
| `src/lib/agents/distiller.ts` | Prompt per adegan = style + karakter + sceneDelta; tulis `prompts.md`. |
| `src/lib/pipeline.ts` | plan → prompts → images → voice → render. |
| `remotion/*` | Komposisi video; karakter stickman/cubeman digambar kode (gratis). |

## Alur Mode Tempel (gratis)
1. Klik Ciptakan → aplikasi menyusun prompt lengkap.
2. Salin ke chat Claude, tempel balasan JSON ke aplikasi.
3. JSON divalidasi skema → lanjut otomatis sampai MP4.

## Belum dibuat (urutan yang disarankan)
1. Modul Decode: scene detection (ffmpeg), frame → Claude vision → Skill Card.
2. `reviseScene` + UI kartu adegan (kunci/regenerasi satu adegan).
3. Akun, kredit, dan penyimpanan cloud untuk versi jual; cek lisensi Remotion di remotion.dev/docs/license.

## Catatan
- Kerangka ini belum dijalankan end-to-end (dependensi belum terpasang saat dibuat). Sintaks sudah dicek, perilaku belum.
- Nama model Gemini bisa berubah; atur lewat `.env`.
- Route video belum mendukung Range request; untuk produksi layani lewat storage/CDN.
