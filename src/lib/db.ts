// Database layer. Postgres (Neon) in production; any driver implementing DB can be injected for tests.
//
// Two kinds of data:
// - Global (gdb): accounts, sessions, workspaces, sign-in events, the audit log and public link ids.
// - Per workspace (db): everything a desk owns: event, companies, contacts, emails, settings and the Gmail token.
//   Each workspace lives in its own Postgres schema (ws_<id>) or its own SQLite file, so a query can only ever see the
//   signed-in person's desk. The workspace comes from the request scope (inWorkspace), never from a query argument.
//   The original desk is workspace "default" and stays where it always was (public schema / main file).
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

export type Row = Record<string, any>;
export interface DB {
  q(text: string, params?: any[]): Promise<Row[]>;
}

export const DEFAULT_WS = "default";
const als = new AsyncLocalStorage<{ ws: string }>();
export const validWs = (ws: string) => ws === DEFAULT_WS || /^w[a-z0-9]{6,32}$/.test(ws);
/** The workspace of the current request (default outside any request: scripts, tests). */
export function workspaceId() { return als.getStore()?.ws || DEFAULT_WS; }
/** Runs fn with every db() call inside it bound to one workspace. */
export function inWorkspace<T>(ws: string, fn: () => T): T {
  if (!validWs(ws)) throw new Error("Unknown workspace");
  return als.run({ ws }, fn);
}
export const newWorkspaceId = () => "w" + Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");

const GLOBAL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
    pw_hash TEXT NOT NULL, disabled INTEGER DEFAULT 0, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT, expires_at TEXT, revoked_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (id TEXT PRIMARY KEY, ip TEXT, ok INTEGER, at TEXT)`,
  `CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT, owner_user_id TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS auth_events (id TEXT PRIMARY KEY, at TEXT, user_id TEXT, email TEXT, method TEXT, ok INTEGER, ip TEXT, user_agent TEXT, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, at TEXT, user_id TEXT, email TEXT, name TEXT, ws TEXT, op TEXT, detail TEXT, ok INTEGER, error TEXT)`,
  `CREATE TABLE IF NOT EXISTS public_links (id TEXT PRIMARY KEY, ws TEXT NOT NULL, kind TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS global_migrations (id INTEGER PRIMARY KEY, sql TEXT, applied_at TEXT)`,
];
const GLOBAL_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN workspace_id TEXT`,
  `ALTER TABLE users ADD COLUMN is_owner INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN last_login_at TEXT`,
  // Everyone who existed before workspaces keeps working on the original desk.
  `UPDATE users SET workspace_id='default' WHERE workspace_id IS NULL`,
  // The first admin ever is the owner who can see every desk's activity.
  `UPDATE users SET is_owner=1 WHERE id=(SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1) AND NOT EXISTS (SELECT 1 FROM users WHERE is_owner=1)`,
  `CREATE INDEX IF NOT EXISTS audit_at_idx ON audit (at)`,
  `CREATE INDEX IF NOT EXISTS audit_user_idx ON audit (user_id, at)`,
  `CREATE INDEX IF NOT EXISTS auth_events_at_idx ON auth_events (at)`,
  `CREATE INDEX IF NOT EXISTS users_ws_idx ON users (workspace_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
];

const SCHEMA = [
  // The organiser's deck (PPT or PDF), stored in pieces so a 15 MB file fits Vercel's 4.5 MB request limit.
  `CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, mime TEXT, size INTEGER, chunks INTEGER, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS file_chunks (file_id TEXT, idx INTEGER, data TEXT, PRIMARY KEY (file_id, idx))`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, profile TEXT, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT, domain TEXT, segment TEXT,
    stage TEXT, stage_reason TEXT, our_pov INTEGER, their_pov INTEGER, intersection INTEGER, priority TEXT,
    model TEXT, tier TEXT, price_range TEXT, angle TEXT, audience_benefit TEXT, reasons TEXT, role_map TEXT,
    decision TEXT, why_now TEXT, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, company_id TEXT, full_name TEXT, position TEXT,
    email TEXT, email_status TEXT, phone TEXT, one_liner TEXT, context TEXT, hook TEXT,
    iitb_alum TEXT, warm_path TEXT, source TEXT, status TEXT, is_primary INTEGER, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, contact_id TEXT,
    company_id TEXT, to_email TEXT, sequence TEXT, step INTEGER, subject TEXT, body TEXT, body_hash TEXT,
    gate TEXT, lint_ok INTEGER, status TEXT, attempts INTEGER, thread_id TEXT, gmail_id TEXT,
    rfc_message_id TEXT, scheduled_for TEXT, claimed_at TEXT, sent_at TEXT, approved_by TEXT,
    cancel_reason TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS replies (id TEXT PRIMARY KEY, gmail_id TEXT UNIQUE, contact_id TEXT,
    company_id TEXT, received_at TEXT, classification TEXT, summary TEXT, offer_inr INTEGER,
    resume_after TEXT, handled INTEGER)`,
  `CREATE TABLE IF NOT EXISTS suppress (email_hash TEXT PRIMARY KEY, reason TEXT, at TEXT)`,
  `CREATE TABLE IF NOT EXISTS exceptions (id TEXT PRIMARY KEY, company_id TEXT, kind TEXT, question TEXT,
    recommendation TEXT, draft_subject TEXT, draft_body TEXT, status TEXT, created_at TEXT,
    resolved_at TEXT, note TEXT)`,
  `CREATE TABLE IF NOT EXISTS deals (company_id TEXT PRIMARY KEY, tier TEXT, cash_inr INTEGER,
    in_kind TEXT, deliverables TEXT, mou TEXT, status TEXT, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS log (id TEXT PRIMARY KEY, ts TEXT, actor TEXT, company_id TEXT, action TEXT,
    from_stage TEXT, to_stage TEXT, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY, company_id TEXT, json TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, sql TEXT, applied_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS send_budget (k TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, last_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, company_id TEXT, n INTEGER, start_at TEXT, minutes INTEGER,
    meet_link TEXT, event_id TEXT, status TEXT, notes TEXT, digest TEXT, created_at TEXT)`,
];
// Versioned migrations: each runs once and is recorded in schema_migrations. Only "already exists" errors are tolerated
// (databases created before tracking existed); anything else stops startup instead of being swallowed.
const MIGRATIONS = [
  `ALTER TABLE companies ADD COLUMN sources TEXT`,
  `ALTER TABLE companies ADD COLUMN meeting_count INTEGER DEFAULT 0`,
  `ALTER TABLE companies ADD COLUMN draft_subject TEXT`,
  `ALTER TABLE companies ADD COLUMN draft_body TEXT`,
  `ALTER TABLE companies ADD COLUMN deck_id TEXT`,
  `ALTER TABLE contacts ADD COLUMN email_source TEXT`,
  `ALTER TABLE contacts ADD COLUMN linkedin_note TEXT`,
  `ALTER TABLE contacts ADD COLUMN linkedin_dm TEXT`,
  `ALTER TABLE contacts ADD COLUMN linkedin_status TEXT`,
  `ALTER TABLE deals ADD COLUMN share_id TEXT`,
  `ALTER TABLE deals ADD COLUMN mou_pdf TEXT`,
  `ALTER TABLE messages ADD COLUMN budget_keys TEXT`,
  `CREATE INDEX IF NOT EXISTS messages_status_idx ON messages (status, scheduled_for)`,
  `CREATE INDEX IF NOT EXISTS messages_company_idx ON messages (company_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts (company_id)`,
  `CREATE INDEX IF NOT EXISTS log_ts_idx ON log (ts)`,
  `SELECT 1`, // was the sessions index: sessions are global now, see GLOBAL_MIGRATIONS (kept so numbering stays stable)
  `ALTER TABLE contacts ADD COLUMN department TEXT`,
  `ALTER TABLE contacts ADD COLUMN email_type TEXT`,
  `ALTER TABLE contacts ADD COLUMN email_check TEXT`,
  `ALTER TABLE contacts ADD COLUMN phone_status TEXT`,
  `ALTER TABLE contacts ADD COLUMN phone_type TEXT`,
  `ALTER TABLE contacts ADD COLUMN phone_source TEXT`,
  `ALTER TABLE contacts ADD COLUMN kind TEXT`,
  `ALTER TABLE contacts ADD COLUMN relevance INTEGER`,
  `ALTER TABLE contacts ADD COLUMN relevance_parts TEXT`,
  `ALTER TABLE contacts ADD COLUMN reason TEXT`,
  `ALTER TABLE contacts ADD COLUMN responsibility TEXT`,
  `ALTER TABLE contacts ADD COLUMN evidence TEXT`,
  `ALTER TABLE contacts ADD COLUMN discovered_at TEXT`,
  `ALTER TABLE contacts ADD COLUMN verified_at TEXT`,
  `ALTER TABLE contacts ADD COLUMN reviewed_by TEXT`,
  `ALTER TABLE contacts ADD COLUMN reviewed_at TEXT`,
  `ALTER TABLE contacts DROP COLUMN linkedin_note`,
  `ALTER TABLE contacts DROP COLUMN linkedin_dm`,
  `ALTER TABLE contacts DROP COLUMN linkedin_status`,
  `ALTER TABLE contacts DROP COLUMN linkedin_url`,
];

let injected: DB | null = null;
let injectedWs: ((ws: string) => DB) | null = null;
let base: DB | null = null;
let neonSql: any = null;
const wsConns = new Map<string, DB>();
const ready = new Map<string, Promise<void>>();
let globalReady: Promise<void> | null = null;

/** Tests: one DB for everything, or `perWs` to give each non-default workspace its own. */
export function setDB(d: DB, perWs?: (ws: string) => DB) {
  injected = d;
  injectedWs = perWs || null;
  base = null;
  wsConns.clear();
  ready.clear();
  globalReady = null;
}

/** Local mode: SQLITE_PATH=./desk.db runs the app on one file, no database account needed (Node 22.5+). Not for Vercel. */
async function makeSqlite(path: string): Promise<DB> {
  const { DatabaseSync } = await import("node:sqlite" as any);
  const sq = new DatabaseSync(path);
  return {
    q: async (text: string, params: any[] = []) => {
      const t = text.replace(/\$(\d+)/g, "?$1");
      const st = sq.prepare(t);
      const ps = params.map((p) => (p === undefined ? null : typeof p === "boolean" ? Number(p) : p));
      if (/^\s*(SELECT|WITH)/i.test(t) || /RETURNING/i.test(t)) return st.all(...ps) as Row[];
      st.run(...ps);
      return [];
    },
  };
}

const sqlitePath = () => (process.env.SQLITE_PATH && !process.env.DATABASE_URL ? process.env.SQLITE_PATH : "");

async function makeBase(): Promise<DB> {
  if (sqlitePath()) return makeSqlite(sqlitePath());
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set. In Vercel: Storage > Create Database > Neon, then redeploy. For a local run, set SQLITE_PATH=./desk.db instead.");
  const { neon } = await import("@neondatabase/serverless");
  neonSql = neon(url);
  return { q: async (text: string, params: any[] = []) => (await neonSql.query(text, params)) as Row[] };
}
async function baseConn(): Promise<DB> {
  if (injected) return injected;
  return base || (base = await makeBase());
}

/** A connection that can only see one workspace: its own SQLite file, or its own Postgres schema (search_path is set
 * inside the same transaction as each statement, so it cannot drift to another workspace or to the public tables). */
async function wsConn(ws: string): Promise<DB> {
  if (ws === DEFAULT_WS) return baseConn();
  if (injected) return injectedWs ? injectedWs(ws) : injected;
  const hit = wsConns.get(ws);
  if (hit) return hit;
  let d: DB;
  if (sqlitePath()) d = await makeSqlite(sqlitePath().replace(/(\.db)?$/i, `.${ws}.db`));
  else {
    await baseConn();
    await neonSql.query(`CREATE SCHEMA IF NOT EXISTS ws_${ws}`);
    d = { q: async (text: string, params: any[] = []) => (await neonSql.transaction([neonSql.query(`SET LOCAL search_path TO ws_${ws}`), neonSql.query(text, params)]))[1] as Row[] };
  }
  wsConns.set(ws, d);
  return d;
}

async function migrate(d: DB, schema: string[], migrations: string[], table: string) {
  // A fresh server checks one fingerprint instead of re-running every CREATE statement (about 30 round trips).
  // Any change to the schema or migrations changes the fingerprint, and the full run below happens once.
  const ver = createHash("sha1").update([table, ...schema, "--", ...migrations].join("\n")).digest("hex");
  try { if ((await d.q(`SELECT v FROM schema_version WHERE k=$1`, [table]))[0]?.v === ver) return; } catch { /* first run: no table yet */ }
  // Concurrent cold starts: CREATE IF NOT EXISTS and ON CONFLICT make this safe to run twice.
  for (const s of schema) await d.q(s);
  const done = new Set((await d.q(`SELECT id FROM ${table}`)).map((r) => Number(r.id)));
  for (let i = 0; i < migrations.length; i++) {
    if (done.has(i + 1)) continue;
    try { await d.q(migrations[i]); }
    catch (e: any) { if (!/already exists|duplicate column|no such column|does not exist/i.test(String(e?.message || e))) throw new Error(`Migration ${i + 1} failed: ${e?.message || e}`); }
    await d.q(`INSERT INTO ${table} (id, sql, applied_at) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [i + 1, migrations[i], new Date().toISOString()]);
  }
  await d.q(`CREATE TABLE IF NOT EXISTS schema_version (k TEXT PRIMARY KEY, v TEXT)`);
  await d.q(`INSERT INTO schema_version (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v=excluded.v`, [table, ver]);
}

/** Accounts, sessions, workspaces, sign-ins, audit, public links. Shared by every workspace. */
export async function gdb(): Promise<DB> {
  const d = await baseConn();
  if (!globalReady) globalReady = migrate(d, GLOBAL_SCHEMA, GLOBAL_MIGRATIONS, "global_migrations").catch((e) => { globalReady = null; throw e; });
  await globalReady;
  return d;
}

/** The current request's workspace. Every desk query goes through here. */
export async function db(): Promise<DB> {
  await gdb();
  const ws = workspaceId();
  const d = await wsConn(ws);
  if (!ready.has(ws)) ready.set(ws, migrate(d, SCHEMA, MIGRATIONS, "schema_migrations").catch((e) => { ready.delete(ws); throw e; }));
  await ready.get(ws);
  return d;
}

/** Every workspace id, the original desk first. */
export async function allWorkspaces(): Promise<string[]> {
  const g = await gdb();
  return [DEFAULT_WS, ...(await g.q(`SELECT id FROM workspaces ORDER BY created_at`)).map((r) => String(r.id)).filter((id) => id !== DEFAULT_WS && validWs(id))];
}

/** Public links (sponsor decks, MOUs) open without a login, so they remember which workspace they belong to. */
export async function registerPublicLink(id: string, kind: string) {
  const g = await gdb();
  await g.q(`INSERT INTO public_links (id, ws, kind, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [id, workspaceId(), kind, new Date().toISOString()]);
}
export async function publicLinkWorkspace(id: string) {
  const g = await gdb();
  return String((await g.q(`SELECT ws FROM public_links WHERE id=$1`, [id]))[0]?.ws || DEFAULT_WS);
}

export const nowIso = () => new Date().toISOString();
export const uid = () => (globalThis.crypto as any).randomUUID();
export const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));
export function json<T = any>(s: any, fallback: T): T {
  if (s === null || s === undefined || s === "") return fallback;
  if (typeof s !== "string") return s as T;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function getSetting(k: string, dflt = ""): Promise<string> {
  const d = await db();
  const r = await d.q(`SELECT v FROM settings WHERE k=$1`, [k]);
  return r[0]?.v ?? dflt;
}
export async function setSetting(k: string, v: string) {
  const d = await db();
  await d.q(`INSERT INTO settings (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v=excluded.v`, [k, v]);
}

/** Every setting of this desk in one query (the state page reads a dozen of them at once). */
export async function allSettings(): Promise<Record<string, string>> {
  const d = await db();
  return Object.fromEntries((await d.q(`SELECT k, v FROM settings`)).map((r) => [String(r.k), String(r.v ?? "")]));
}
