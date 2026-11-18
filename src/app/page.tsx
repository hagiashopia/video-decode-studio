"use client";
import { useEffect, useState } from "react";
import { STYLES } from "@/lib/styles";

type JobView = {
  id: string; status: "queued" | "running" | "waiting_paste" | "done" | "error";
  step: string; progress: number; error: string | null; pastePrompt: string | null;
  meta: { title: string; description: string; hashtags: string[] } | null;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [durationSec, setDuration] = useState(45);
  const [styleId, setStyleId] = useState("stickman");
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [brain, setBrain] = useState<"paste" | "gemini" | "claude">("paste");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [pasted, setPasted] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      const r = await fetch(`/api/jobs/${jobId}`);
      if (r.ok && !stop) setJob(await r.json());
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [jobId]);

  async function create() {
    setFormError(""); setJob(null);
    const r = await fetch("/api/jobs", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, durationSec, styleId, aspect, brain }),
    });
    if (!r.ok) return setFormError("Isi perintah minimal 3 karakter dan durasi 10–600 detik.");
    setJobId((await r.json()).id);
  }

  async function sendPaste() {
    setFormError("");
    const r = await fetch(`/api/jobs/${jobId}/paste`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ json: pasted }),
    });
    if (!r.ok) setFormError((await r.json()).error ?? "JSON tidak valid.");
    else setPasted("");
  }

  const busy = job ? job.status === "queued" || job.status === "running" : false;

  return (
    <main>
      <h1>Satu kalimat, jadi video animasi.</h1>
      <p className="lead">Tulis ide, pilih gaya, lalu ciptakan. Video siap diunggah dalam format yang Anda pilih.</p>

      <section className="panel">
        <label className="title" htmlFor="prompt">Apa yang ingin dijelaskan?</label>
        <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="Mengapa Google Maps jadi merah saat macet" />
      </section>

      <section className="panel row two">
        <div>
          <label className="title" htmlFor="dur">Durasi (detik)</label>
          <input id="dur" type="number" min={10} max={600} value={durationSec} onChange={(e) => setDuration(+e.target.value)} />
        </div>
        <div>
          <span className="title" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Dimensi</span>
          <div className="choices" role="radiogroup" aria-label="Dimensi">
            {(["9:16", "16:9", "1:1"] as const).map((a) => (
              <label className="choice" key={a}><input type="radio" name="aspect" checked={aspect === a} onChange={() => setAspect(a)} /><span>{a}</span></label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <span className="title" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Gaya</span>
        <div className="choices" role="radiogroup" aria-label="Gaya">
          {STYLES.map((s) => (
            <label className="choice" key={s.id}>
              <input type="radio" name="style" checked={styleId === s.id} onChange={() => setStyleId(s.id)} />
              <span>{s.name}{s.kind === "image" ? " (gambar AI)" : ""}</span>
            </label>
          ))}
        </div>
        <p className="hint">Gaya tanpa label digambar oleh aplikasi sendiri, jadi gratis. Gaya gambar AI butuh API key Gemini.</p>
      </section>

      <section className="panel">
        <span className="title" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Otak penulis skrip</span>
        <div className="choices" role="radiogroup" aria-label="Otak">
          {([["paste", "Tempel dari chat Claude (gratis)"], ["gemini", "Gemini API"], ["claude", "Claude API"]] as const).map(([v, l]) => (
            <label className="choice" key={v}><input type="radio" name="brain" checked={brain === v} onChange={() => setBrain(v)} /><span>{l}</span></label>
          ))}
        </div>
      </section>

      <button className="go" onClick={create} disabled={busy || prompt.trim().length < 3}>Ciptakan</button>
      {formError && <p className="error" role="alert">{formError}</p>}

      {job && (
        <section className="panel" style={{ marginTop: 20 }} aria-live="polite">
          <strong>{job.step || "Mengantre"}</strong>
          <div className="bar"><i style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
          {job.status === "error" && <p className="error">Gagal: {job.error}. Ciptakan ulang untuk mencoba lagi; tahap yang sudah selesai tidak diulang.</p>}

          {job.status === "waiting_paste" && job.pastePrompt && (
            <div>
              <p>Salin prompt ini ke chat Claude, lalu tempel balasan JSON-nya di bawah.</p>
              <pre>{job.pastePrompt}</pre>
              <button className="ghost" onClick={() => navigator.clipboard.writeText(job.pastePrompt!)}>Salin prompt</button>
              <textarea style={{ marginTop: 12 }} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Tempel JSON dari Claude di sini" />
              <button className="ghost" style={{ marginTop: 8 }} onClick={sendPaste} disabled={!pasted.trim()}>Lanjutkan</button>
            </div>
          )}

          {job.status === "done" && (
            <div>
              <video controls src={`/api/jobs/${job.id}/video`} />
              <p><a href={`/api/jobs/${job.id}/video`} download={`video-${job.id}.mp4`}>Unduh MP4</a></p>
              {job.meta && <><strong>{job.meta.title}</strong><p>{job.meta.description}</p><p>{job.meta.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p></>}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
