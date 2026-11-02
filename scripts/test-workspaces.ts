// Workspaces: each person's desk is private, the owner can look in read-only, and every sign-in and action is recorded.
// node:sqlite stands in for Postgres: the main database holds accounts and the original desk; every other workspace
// gets its own in-memory database, the way production gives it its own Postgres schema.
import { setDB, db, gdb, inWorkspace, DEFAULT_WS, registerPublicLink, publicLinkWorkspace } from "../src/lib/db";
import { googleLogin, currentUser, requireUser, audit, recordAuth } from "../src/lib/auth";
import * as F from "../src/lib/flows";

const { DatabaseSync } = require("node:sqlite");
const mk = () => { const sq = new DatabaseSync(":memory:"); return { q: async (text: string, params: any[] = []) => { const t = text.replace(/\$(\d+)/g, "?$1"); const st = sq.prepare(t); const ps = params.map((p) => (p === undefined ? null : p)); if (/^\s*(SELECT|WITH)/i.test(t) || /RETURNING/i.test(t)) return st.all(...ps); st.run(...ps); return []; } }; };
const wsDbs: Record<string, any> = {};
setDB(mk(), (ws) => (wsDbs[ws] ||= mk()));

let fails = 0;
const eq = (n: string, g: any, w: any) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${n}${ok ? "" : ` got=${JSON.stringify(g)} want=${JSON.stringify(w)}`}`); };
const tokenOf = (cookie?: string) => (cookie || "").split(";")[0].split("=")[1];
const req = (tok: string, extra = "", method = "GET") => new Request("https://desk.test/api/state", { method, headers: { cookie: `sd_session=${tok}${extra ? "; " + extra : ""}`, origin: "https://desk.test", host: "desk.test" } });
const profile = (name: string) => ({ name, organizer: "Org", dates: "Jan 2027", city: "Mumbai", audience: "students", tiers: [{ name: "Title", price_inr: 100000, deliverables: "x" }], floor_inr: 50000, sender: { name: "S", title: "", org: "Org" }, postal_address: "Mumbai 400076" } as any);

(async () => {
  process.env.APP_PASSWORD = "unused-in-this-test";
  // ---- sign-ups
  const a = await googleLogin("owner@example.test", "Asha", { ip: "1.1.1.1", ua: "Mozilla/5.0 (Windows)" });
  const b = await googleLogin("ravi@example.test", "Ravi", { ip: "2.2.2.2", ua: "Mozilla/5.0 (iPhone)" });
  const c = await googleLogin("meera@example.test", "Meera");
  const ua = (await currentUser(req(tokenOf(a.cookie))))!, ub = (await currentUser(req(tokenOf(b.cookie))))!, uc = (await currentUser(req(tokenOf(c.cookie))))!;
  eq("first sign-in is the owner, on the original desk", [ua.owner, ua.ws, ua.role], [true, DEFAULT_WS, "admin"]);
  eq("each later newcomer gets a private desk and runs it", [ub.owner, ub.ws !== DEFAULT_WS, ub.role, uc.ws !== ub.ws], [false, true, "admin", true]);

  // ---- isolation
  await inWorkspace(ua.ws, () => F.saveEvent(profile("Owner Fest")));
  await inWorkspace(ub.ws, () => F.saveEvent(profile("Ravi Hackathon")));
  const seen = async (ws: string) => inWorkspace(ws, async () => (await F.getEvent())?.name || null);
  eq("each desk sees only its own event", [await seen(ua.ws), await seen(ub.ws), await seen(uc.ws)], ["Owner Fest", "Ravi Hackathon", null]);
  await inWorkspace(ub.ws, async () => { const d = await db(); await d.q(`INSERT INTO companies (id, name, stage) VALUES ('zepto','Zepto','PROSPECT')`); });
  const count = async (ws: string) => inWorkspace(ws, async () => Number((await (await db()).q(`SELECT COUNT(*) AS n FROM companies`))[0].n));
  eq("the same company id in one desk never shows in another", [await count(ub.ws), await count(ua.ws), await count(uc.ws)], [1, 0, 0]);

  // ---- signing in again continues the same desk
  const b2 = await googleLogin("ravi@example.test", "Ravi");
  const ub2 = (await currentUser(req(tokenOf(b2.cookie))))!;
  eq("signing in again lands in the same desk with its data", [ub2.ws === ub.ws, await seen(ub2.ws)], [true, "Ravi Hackathon"]);

  // ---- owner's read-only window
  const asView = (await currentUser(req(tokenOf(a.cookie), `sd_view=${ub.ws}`)))!;
  eq("owner can open another desk, read-only", [asView.ws === ub.ws, asView.role, asView.viewing?.name], [true, "readonly", "Ravi's desk"]);
  const write = await requireUser(req(tokenOf(a.cookie), `sd_view=${ub.ws}`, "POST"), "operator");
  eq("no changes while viewing someone else's desk", [write.res?.status, /read-only/.test(await write.res!.text())], [403, true]);
  const sneaky = (await currentUser(req(tokenOf(c.cookie), `sd_view=${ub.ws}`)))!;
  eq("a non-owner cannot use the view cookie", [sneaky.ws === uc.ws, !!sneaky.viewing], [true, false]);

  // ---- audit trail
  await audit(ub, "discover", { count: 8, password: "secret", body: "long email" });
  await recordAuth({ userId: ub.id, email: ub.email, method: "logout", ok: true });
  const g = await gdb();
  const acts = await g.q(`SELECT op, detail, ws FROM audit WHERE user_id=$1`, [ub.id]);
  eq("actions are recorded with the desk, secrets left out", [acts.length, acts[0].op, acts[0].ws === ub.ws, JSON.parse(acts[0].detail)], [1, "discover", true, { count: "8" }]);
  const logins = await g.q(`SELECT method, ok, ip, user_agent FROM auth_events WHERE user_id=$1 ORDER BY at`, [ub.id]);
  eq("sign-ins and sign-outs are recorded with IP and browser", logins.map((l: any) => `${l.method}:${l.ok}:${l.ip}`), ["google:1:2.2.2.2", "google:1:", "logout:1:"]);
  eq("last sign-in time is kept", !!(await g.q(`SELECT last_login_at FROM users WHERE id=$1`, [ub.id]))[0].last_login_at, true);

  // ---- public links remember their desk
  await inWorkspace(ub.ws, () => registerPublicLink("abcdef1234567890abcd", "deck"));
  eq("a sponsor's deck link opens in the right desk", [await publicLinkWorkspace("abcdef1234567890abcd") === ub.ws, await publicLinkWorkspace("unknownlink000000000")], [true, DEFAULT_WS]);

  console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
