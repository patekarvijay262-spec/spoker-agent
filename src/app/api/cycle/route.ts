import { audit, isCron, requireUser, runAs } from "@/lib/auth";
import { allWorkspaces, inWorkspace } from "@/lib/db";
import { cycle } from "@/lib/flows";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// GET is only for Vercel Cron (Bearer CRON_SECRET): a link click can never trigger sending. It runs every desk in
// turn; one desk failing (say, a revoked Gmail token) never stops the others.
export async function GET(req: Request) {
  if (!isCron(req)) return Response.json({ error: "cron only; use POST from the app" }, { status: 405 });
  const origin = new URL(req.url).origin;
  const results: Record<string, any> = {};
  for (const ws of await allWorkspaces()) {
    try { results[ws] = await inWorkspace(ws, () => cycle(origin)); }
    catch (e: any) { results[ws] = { error: String(e?.message || e).slice(0, 200) }; }
  }
  return Response.json({ workspaces: Object.keys(results).length, results });
}
// POST: a signed-in approver runs their own desk's cycle, same-origin.
export async function POST(req: Request) {
  const r = await requireUser(req, "approver");
  if (r.res) return r.res;
  const user = r.user;
  return runAs(user, async () => {
    try { const out = await cycle(new URL(req.url).origin); await audit(user, "cycle", {}); return Response.json(out); }
    catch (e: any) { await audit(user, "cycle", {}, false, e.message); return Response.json({ error: e.message }, { status: 400 }); }
  });
}
