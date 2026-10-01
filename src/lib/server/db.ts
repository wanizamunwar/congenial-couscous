/* ==========================================================================
   PERSISTENT DATAFILE STORE  (server-side)
   A small, durable, transactional document store: the whole database lives in
   one JSON file that is written atomically (tmp file + rename), serialised
   through a single-writer queue so concurrent request handlers cannot
   interleave a read-modify-write.
   ========================================================================== */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { DBShape, Snapshot } from './types';
import { buildSeed } from './seed';

const DATA_DIR = process.env.SITAXIS_DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'siteaxis.db.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const TMP_FILE = `${DB_FILE}.tmp`;
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const SCHEMA_VERSION = 1;

type Listener = (db: DBShape) => void;
const listeners = new Set<Listener>();

let cache: DBShape | null = null;
/** Promise chain — guarantees only one write transaction at a time. */
let queue: Promise<unknown> = Promise.resolve();

export function onDatabaseChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(db: DBShape) {
  for (const fn of listeners) {
    try {
      fn(db);
    } catch {
      /* listener errors must never break a write */
    }
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Serialise all write transactions through this queue. */
async function transaction<T>(fn: (db: DBShape) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  // Keep the chain alive even if a transaction rejects.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

async function load(): Promise<DBShape> {
  if (cache) return cache;
  await ensureDir(DATA_DIR);
  await ensureDir(UPLOAD_DIR);
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DBShape;
    cache = migrate(parsed);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'ENOENT') {
      // Corrupt file: preserve it for forensics, then re-seed.
      await fs
        .rename(DB_FILE, `${DB_FILE}.corrupt-${Date.now()}`)
        .catch(() => undefined);
    }
    cache = migrate(buildSeed());
    await writeFile(cache);
  }
  return cache;
}

async function writeFile(db: DBShape) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(TMP_FILE, JSON.stringify(db, null, 1), 'utf8');
  await fs.rename(TMP_FILE, DB_FILE);
}

async function persist(db: DBShape) {
  await writeFile(db);
  emit(db);
}

function migrate(db: DBShape): DBShape {
  const base = db as DBShape;
  if (typeof base.version !== 'number') base.version = SCHEMA_VERSION;
  // Defensive fill so a partial/older file never crashes a request.
  base.projects ??= [];
  base.tasks ??= [];
  base.siteReports ??= [];
  base.materials ??= [];
  base.expenses ??= [];
  base.documents ??= [];
  base.activity ??= [];
  return base;
}

/** Read-only access. Returns the live cached object. */
export async function read(): Promise<DBShape> {
  return load();
}

/** Read-only clone suitable for a route response. */
export async function snapshot(): Promise<Snapshot> {
  const db = await load();
  return {
    version: db.version,
    seededAt: db.seededAt,
    profile: db.profile,
    settings: db.settings,
    account: {
      username: db.account.username,
      email: db.account.email,
      displayName: db.account.displayName,
      lastLoginAt: db.account.lastLoginAt,
      createdAt: db.account.createdAt,
    },
    projects: db.projects,
    tasks: db.tasks,
    siteReports: db.siteReports,
    materials: db.materials,
    expenses: db.expenses,
    documents: db.documents,
    activity: db.activity.slice(0, 400),
  };
}

/** Insert / replace a record in a collection by id. */
export async function upsert(
  collection: Exclude<keyof DBShape, 'version' | 'seededAt' | 'account' | 'settings' | 'profile'>,
  record: { id: string },
): Promise<{ id: string }> {
  return transaction((db) => {
    const list = db[collection] as unknown as { id: string }[];
    const i = list.findIndex((r) => r.id === record.id);
    if (i >= 0) list[i] = record;
    else list.push(record);
    return { id: record.id };
  });
}

export async function remove(collection: 'projects' | 'tasks' | 'siteReports' | 'materials' | 'expenses' | 'documents', id: string): Promise<boolean> {
  return transaction((db) => {
    const list = db[collection] as unknown as { id: string }[];
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    return true;
  });
}

export async function getRecord<T>(collection: 'projects' | 'tasks' | 'siteReports' | 'materials' | 'expenses' | 'documents', id: string): Promise<T | null> {
  const db = await load();
  const list = db[collection] as unknown as { id: string }[];
  return (list.find((r) => r.id === id) as T) ?? null;
}

/** Mutate arbitrary parts of the database (settings, profile, account…). */
export async function mutate<T>(fn: (db: DBShape) => T | Promise<T>): Promise<T> {
  return transaction(fn);
}

/** Replace the entire document (used by Restore). */
export async function replaceAll(next: DBShape): Promise<void> {
  await transaction((db) => {
    Object.assign(db, next);
  });
}

export async function resetToSeed(): Promise<void> {
  const seed = buildSeed();
  await transaction((db) => {
    Object.assign(db, seed);
  });
}

/* ------------------------------ backup I/O ----------------------------- */

export async function ensureBackupDir() {
  await ensureDir(BACKUP_DIR);
}
export { BACKUP_DIR, DB_FILE, DATA_DIR };

/** Best-effort hourly snapshot, scheduled from the instrumentation hook. */
let lastBackup = 0;
export async function maybeBackup(): Promise<void> {
  const now = Date.now();
  if (now - lastBackup < 60 * 60 * 1000) return;
  lastBackup = now;
  try {
    await ensureBackupDir();
    const db = await load();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(path.join(BACKUP_DIR, `auto-${stamp}.json`), JSON.stringify(db, null, 1), 'utf8');
    await pruneBackups();
  } catch {
    /* backups are best-effort; never surface an error to the request */
  }
}

const MAX_AUTO_BACKUPS = 24;
export async function pruneBackups(): Promise<number> {
  try {
    const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort();
    const excess = files.length - MAX_AUTO_BACKUPS;
    for (let i = 0; i < excess; i += 1) {
      await fs.unlink(path.join(BACKUP_DIR, files[i])).catch(() => undefined);
    }
    return Math.max(0, excess);
  } catch {
    return 0;
  }
}

export async function hostInfo() {
  return { dataDir: DATA_DIR, dbFile: DB_FILE, platform: os.platform(), version: SCHEMA_VERSION };
}
