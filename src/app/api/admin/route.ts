// Owner only: who signed in, what everyone did, and a read-only window into any desk.
import { audit, requireUser, VIEW_COOKIE } from "@/lib/auth";
import { allWorkspaces, db, DEFAULT_WS, gdb, inWorkspace, json, validWs } from "@/lib/db";

export const dynamic = "force-dynamic";

async function owner(req: Request) {
  const r = await requireUser(req, "readonly");
  if (r.res) return r;
  if (!r.user.owner) return { res: Response.json({ error: "Only the owner can see activity." }, { status: 403 }) };
  return r;
}

/** One line per desk: its event and how far it got. Read inside each workspace, never across. */
async function deskSummary(ws: string) {
  return inWorkspace(ws, async () => {
    const d = await db();
    const ev = (await d.q(`SELECT profile, updated_at FROM events WHERE id='current'`))[0];
    const n = async (sql: string) => Number((await d.q(sql))[0]?.n || 0);
    return {
      event: ev ? String(json<any>(ev.profile, {})?.name || "") : "",
      companies: await n(`SELECT COUNT(*) AS n FROM companies`),
      drafts: await n(`SELECT COUNT(*) AS n FROM messages WHERE status='drafted'`),
      sent: await n(`SELECT COUNT(*) AS n FROM messages WHERE status='sent'`),
      deals: await n(`SELECT COUNT(*) AS n FROM deals`),
      updated_at: ev?.updated_at || null,
    };
  });
}

export async function GET(req: Request) {
  const r = await owner(req);
  if (r.res) return r.res;
  const g = await gdb();
  const u = new URL(req.url);
  const who = u.searchParams.get("user") || "";
  const users = await g.q(`SELECT u.id, u.name, u.email, u.role, u.workspace_id, u.is_owner, u.disabled, u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM audit a WHERE a.user_id=u.id) AS actions, (SELECT MAX(at) FROM audit a WHERE a.user_id=u.id) AS last_action_at
    FROM users u ORDER BY COALESCE(u.last_login_at, u.created_at) DESC LIMIT 500`);
  const names = Object.fromEntries((await g.q(`SELECT id, name FROM workspaces`)).map((w) => [w.id, w.name]));
  const desks = [];
  for (const ws of (await allWorkspaces()).slice(0, 100)) {
    let s: any = null;
    try { s = await deskSummary(ws); } catch { s = { error: true }; }
    desks.push({ ws, name: ws === DEFAULT_WS ? "Original desk" : names[ws] || ws, members: users.filter((x) => (x.workspace_id || DEFAULT_WS) === ws).map((x) => x.name), ...s });
  }
  const logins = await g.q(who ? `SELECT * FROM auth_events WHERE user_id=$1 ORDER BY at DESC LIMIT 100` : `SELECT * FROM auth_events ORDER BY at DESC LIMIT 100`, who ? [who] : []);
  const actions = (await g.q(who ? `SELECT * FROM audit WHERE user_id=$1 ORDER BY at DESC LIMIT 200` : `SELECT * FROM audit ORDER BY at DESC LIMIT 200`, who ? [who] : []))
    .map((a) => ({ ...a, detail: json(a.detail, {}) }));
  return Response.json({ users, desks, logins, actions, viewing: r.user.viewing || null });
}

/** { view: "<workspace id>" } opens that desk read-only for the owner; { view: null } goes back to their own. */
export async function POST(req: Request) {
  const r = await owner(req);
  if (r.res) return r.res;
  const b = await req.json().catch(() => ({}));
  const ws = b.view ? String(b.view) : "";
  if (ws && (!validWs(ws) || !(await allWorkspaces()).includes(ws))) return Response.json({ error: "Unknown desk" }, { status: 404 });
  await audit(r.user, ws ? "view_desk" : "view_desk_end", { ws: ws || r.user.ws });
  const cookie = ws && ws !== r.user.ownWs ? `${VIEW_COOKIE}=${ws}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${8 * 3600}` : `${VIEW_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": cookie } });
}
