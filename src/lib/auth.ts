// Authentication: per-user accounts with roles, server-side sessions (expiring, revocable), login rate limiting, CSRF origin check.
// Bootstrap: while no user exists, the first login with APP_PASSWORD creates the admin account for that email.
import { DEFAULT_WS, gdb, inWorkspace, newWorkspaceId, nowIso, uid, validWs } from "./db";

export type Role = "admin" | "approver" | "operator" | "readonly";
/** `ws` is the workspace this request works in. `viewing` is set when the owner opens someone else's desk: read-only. */
export type User = { id: string; email: string; name: string; role: Role; session: string; ws: string; ownWs: string; owner: boolean; viewing?: { ws: string; name: string } };
export const RANK: Record<Role, number> = { readonly: 0, operator: 1, approver: 2, admin: 3 };
const COOKIE = "sd_session";
const TTL_MS = 7 * 24 * 3600 * 1000;
const enc = new TextEncoder();

const b64u = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString("base64url");
export async function sha256(s: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", enc.encode(s))).toString("hex");
}
export function randomToken(bytes = 32) { return b64u(crypto.getRandomValues(new Uint8Array(bytes))); }
export function safeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

// ---- passwords (PBKDF2-SHA256, 210k iterations) ----
const ITER = 210000;
async function pbkdf2(pw: string, salt: Uint8Array, iter: number) {
  const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, k, 256));
}
export async function hashPassword(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64u(salt)}$${b64u(await pbkdf2(pw, salt, ITER))}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [alg, it, s, h] = String(stored || "").split("$");
  if (alg !== "pbkdf2" || !s || !h) return false;
  const got = b64u(await pbkdf2(pw, new Uint8Array(Buffer.from(s, "base64url")), Number(it)));
  return safeEqual(got, h);
}

function cookieValue(req: Request, name: string) {
  const c = req.headers.get("cookie") || "";
  const m = c.split(/;\s*/).find((p) => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
export const clientAgent = (req: Request) => (req.headers.get("user-agent") || "").slice(0, 200);
export const VIEW_COOKIE = "sd_view";

/** The signed-in user, or null. Sessions are stored as sha256(token); expired, revoked or disabled users get null.
 * The owner may carry a view cookie naming another workspace: then the request works there, read-only. */
export async function currentUser(req: Request): Promise<User | null> {
  const tok = cookieValue(req, COOKIE);
  if (!tok) return null;
  const g = await gdb();
  const sid = await sha256(tok);
  const r = (await g.q(`SELECT u.id, u.email, u.name, u.role, u.workspace_id, u.is_owner, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.id=$1 AND s.revoked_at IS NULL AND COALESCE(u.disabled,0)=0`, [sid]))[0];
  if (!r || new Date(r.expires_at).getTime() < Date.now()) return null;
  const ownWs = validWs(String(r.workspace_id || "")) ? String(r.workspace_id) : DEFAULT_WS;
  const user: User = { id: r.id, email: r.email, name: r.name, role: r.role as Role, session: sid, ws: ownWs, ownWs, owner: !!Number(r.is_owner) };
  const view = cookieValue(req, VIEW_COOKIE);
  if (user.owner && view && view !== ownWs && validWs(view)) {
    const w = view === DEFAULT_WS ? { name: "Original desk" } : (await g.q(`SELECT name FROM workspaces WHERE id=$1`, [view]))[0];
    if (w) { user.ws = view; user.viewing = { ws: view, name: String(w.name || view) }; user.role = "readonly"; }
  }
  return user;
}

/** Writes must come from this site (CSRF): Origin, else Referer, must match the request host. */
export function sameOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
  const src = req.headers.get("origin") || req.headers.get("referer") || "";
  try { return !!src && new URL(src).host === host; } catch { return false; }
}

/** Returns { user } or { res } (a 401/403 Response). Run the rest of the request inside runAs(user, ...). */
export async function requireUser(req: Request, min: Role = "readonly"): Promise<{ user: User; res?: undefined } | { res: Response; user?: undefined }> {
  if (!process.env.APP_PASSWORD && !hasGoogleLogin() && !(await anyUser())) return { res: Response.json({ error: "Set APP_PASSWORD, or GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google sign-in, in Vercel environment variables." }, { status: 500 }) };
  if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return { res: Response.json({ error: "cross-site request refused" }, { status: 403 }) };
  const user = await currentUser(req);
  if (!user) return { res: Response.json({ error: "unauthorized" }, { status: 401 }) };
  if (RANK[user.role] < RANK[min]) return { res: Response.json({ error: user.viewing ? `You are viewing ${user.viewing.name} read-only. Exit the view to make changes.` : `Your role (${user.role}) cannot do this. Ask an admin.` }, { status: 403 }) };
  return { user };
}
/** Every database call inside fn sees only this user's workspace. */
export function runAs<T>(user: User, fn: () => T): T { return inWorkspace(user.ws, fn); }
/** Sign in, then run fn in the user's workspace. Returns the 401/403 Response when not allowed. */
export async function withUser(req: Request, min: Role, fn: (user: User) => Promise<Response>): Promise<Response> {
  const r = await requireUser(req, min);
  if (r.res) return r.res;
  return runAs(r.user, () => fn(r.user));
}

async function anyUser() {
  const g = await gdb();
  return (await g.q(`SELECT 1 FROM users LIMIT 1`)).length > 0;
}

/** Whether GOOGLE_CLIENT_ID/SECRET are set, so "Continue with Google" can be offered for sign-in (not just for
 * connecting the team mailbox). Defined here, not in lib/gmail, to avoid a circular import. */
export function hasGoogleLogin() { return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }

// ---- who signed in, and what they did (global, read by the owner on the Activity page) ----
export type AuthEvent = { userId?: string; email: string; method: "google" | "password" | "logout"; ok: boolean; ip?: string; ua?: string; detail?: string };
export async function recordAuth(e: AuthEvent) {
  try {
    const g = await gdb();
    await g.q(`INSERT INTO auth_events (id, at, user_id, email, method, ok, ip, user_agent, detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [uid(), nowIso(), e.userId || null, String(e.email || "").slice(0, 200), e.method, e.ok ? 1 : 0, e.ip || "", e.ua || "", String(e.detail || "").slice(0, 300)]);
    if (e.ok && e.userId && e.method !== "logout") await g.q(`UPDATE users SET last_login_at=$1 WHERE id=$2`, [nowIso(), e.userId]);
  } catch (err) { console.error("recordAuth", err); } // never block a sign-in on the audit trail
}
const SECRET_KEYS = /password|token|secret|body|draft_body|notes|tidy|answers/i;
/** One line per action, with the request trimmed: no passwords, no email bodies, long text cut. */
export async function audit(user: User, op: string, input: Record<string, any> = {}, ok = true, error = "") {
  try {
    const detail: Record<string, any> = {};
    for (const [k, v] of Object.entries(input || {})) {
      if (k === "op" || SECRET_KEYS.test(k) || v == null || v === "") continue;
      detail[k] = Array.isArray(v) ? (v.length > 5 ? `${v.length} items` : v.map((x) => (typeof x === "object" ? "…" : String(x).slice(0, 60)))) : typeof v === "object" ? "…" : String(v).slice(0, 200);
    }
    const g = await gdb();
    await g.q(`INSERT INTO audit (id, at, user_id, email, name, ws, op, detail, ok, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [uid(), nowIso(), user.id, user.email, user.name, user.ws, op, JSON.stringify(detail), ok ? 1 : 0, String(error || "").slice(0, 300)]);
  } catch (err) { console.error("audit", err); }
}

/** A brand-new workspace for a person who signed up on their own. */
async function createWorkspace(ownerId: string, name: string) {
  const g = await gdb();
  const id = newWorkspaceId();
  await g.q(`INSERT INTO workspaces (id, name, owner_user_id, created_at) VALUES ($1,$2,$3,$4)`, [id, `${name}'s desk`, ownerId, nowIso()]);
  return id;
}
async function startSession(userId: string) {
  const g = await gdb();
  const tok = randomToken();
  await g.q(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`, [await sha256(tok), userId, nowIso(), new Date(Date.now() + TTL_MS).toISOString()]);
  return `${COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_MS / 1000}`;
}

/** Sign in from a verified Google identity, creating the account on first sign-in. Anyone with a Google account can
 * join, and each newcomer gets a private desk of their own (admin of it). The very first person ever becomes the owner
 * and keeps the original desk. Someone an admin invited by email signs straight into that admin's desk. Their data
 * stays in their workspace, so signing in again later continues exactly where they stopped. */
export async function googleLogin(email: string, name: string, meta: { ip?: string; ua?: string } = {}): Promise<{ cookie?: string; error?: string; status?: number }> {
  const g = await gdb();
  const em = String(email || "").trim().toLowerCase();
  if (!em) return { error: "Google did not return an email address.", status: 400 };
  let user = (await g.q(`SELECT * FROM users WHERE lower(email)=$1`, [em]))[0];
  if (user && Number(user.disabled)) { await recordAuth({ userId: user.id, email: em, method: "google", ok: false, ...meta, detail: "account disabled" }); return { error: "This account was disabled by an admin.", status: 403 }; }
  if (!user) {
    const first = !(await anyUser());
    const nm = (name || "").trim() || em.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const id = uid();
    const ws = first ? DEFAULT_WS : await createWorkspace(id, nm);
    user = { id, email: em, name: nm, role: "admin" };
    // pw_hash is required by the schema but never used for a Google-only account: a random value that cannot be entered.
    await g.q(`INSERT INTO users (id, email, name, role, pw_hash, disabled, created_at, workspace_id, is_owner) VALUES ($1,$2,$3,'admin',$4,0,$5,$6,$7)`, [id, em, nm, await hashPassword(randomToken(24)), nowIso(), ws, first ? 1 : 0]);
  }
  await recordAuth({ userId: user.id, email: em, method: "google", ok: true, ...meta });
  return { cookie: await startSession(user.id) };
}

export async function login(email: string, password: string, ip: string, ua = ""): Promise<{ cookie?: string; error?: string; status?: number }> {
  const g = await gdb();
  const em = String(email || "").trim().toLowerCase();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const fails = (await g.q(`SELECT COUNT(*) AS n FROM login_attempts WHERE ip=$1 AND ok=0 AND at >= $2`, [ip, since]))[0];
  if (Number(fails?.n || 0) >= 8) return { error: "Too many failed attempts. Wait 15 minutes.", status: 429 };
  let user = em ? (await g.q(`SELECT * FROM users WHERE lower(email)=$1 AND COALESCE(disabled,0)=0`, [em]))[0] : null;
  let ok = false;
  if (user) ok = await verifyPassword(password, user.pw_hash);
  else if (!(await anyUser()) && process.env.APP_PASSWORD && em && safeEqual(password, process.env.APP_PASSWORD)) {
    // First run: create the admin account, the owner of the original desk.
    const name = em.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    user = { id: uid(), email: em, name, role: "admin" };
    await g.q(`INSERT INTO users (id, email, name, role, pw_hash, disabled, created_at, workspace_id, is_owner) VALUES ($1,$2,$3,'admin',$4,0,$5,$6,1)`, [user.id, em, name, await hashPassword(password), nowIso(), DEFAULT_WS]);
    ok = true;
  }
  await g.q(`INSERT INTO login_attempts (id, ip, ok, at) VALUES ($1,$2,$3,$4)`, [uid(), ip, ok ? 1 : 0, nowIso()]);
  await recordAuth({ userId: user?.id, email: em, method: "password", ok, ip, ua, detail: ok ? "" : "wrong email or password" });
  if (!ok || !user) return { error: (await anyUser()) ? "Wrong email or password" : "First sign-in: use your email and the team password (APP_PASSWORD).", status: 401 };
  return { cookie: await startSession(user.id) };
}
export async function logout(req: Request) {
  const u = await currentUser(req);
  if (u) {
    const g = await gdb();
    await g.q(`UPDATE sessions SET revoked_at=$1 WHERE id=$2`, [nowIso(), u.session]);
    await recordAuth({ userId: u.id, email: u.email, method: "logout", ok: true, ip: clientIp(req), ua: clientAgent(req) });
  }
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export async function revokeAll(userId: string) {
  const g = await gdb();
  await g.q(`UPDATE sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL`, [nowIso(), userId]);
}

export function isCron(req: Request) {
  const s = process.env.CRON_SECRET;
  return !!s && safeEqual(req.headers.get("authorization") || "", `Bearer ${s}`);
}

// ---- secrets at rest (Google refresh token): AES-GCM with a key from TOKEN_KEY or APP_PASSWORD ----
async function aesKey() {
  const secret = process.env.TOKEN_KEY || process.env.APP_PASSWORD || "";
  if (!secret) return null;
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode("sponsordesk-token:" + secret)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealSecret(plain: string) {
  const k = await aesKey(); if (!k) return plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `enc:${b64u(iv)}:${b64u(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, enc.encode(plain)))}`;
}
export async function openSecret(stored: string) {
  if (!stored.startsWith("enc:")) return stored; // stored before encryption existed
  const k = await aesKey(); if (!k) throw new Error("TOKEN_KEY/APP_PASSWORD missing: cannot read the Google token. Reconnect Google.");
  const [, iv, ct] = stored.split(":");
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(Buffer.from(iv, "base64url")) }, k, Buffer.from(ct, "base64url"))); }
  catch { throw new Error("The stored Google token cannot be read (the server secret changed). Reconnect Google in Settings."); }
}
