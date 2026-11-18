import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const g = globalThis as unknown as { __db?: Database.Database };
export const db = (g.__db ??= (() => {
  const d = new Database(path.join(DATA_DIR, "app.db"));
  d.pragma("journal_mode = WAL");
  d.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, input TEXT NOT NULL,
      status TEXT NOT NULL,            -- queued | running | waiting_paste | done | error
      step TEXT NOT NULL DEFAULT '', progress REAL NOT NULL DEFAULT 0,
      error TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stages (
      job_id TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY (job_id, name)
    );
    CREATE TABLE IF NOT EXISTS skill_cards (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  return d;
})());

export const jobDir = (id: string) => {
  const p = path.join(DATA_DIR, "jobs", id);
  fs.mkdirSync(p, { recursive: true });
  return p;
};
