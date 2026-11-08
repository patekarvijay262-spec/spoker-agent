import { loadConnectorKeys } from "@/lib/connectors";
// The morning reminder (Vercel Cron, 9:00 IST every day): one short email per desk listing today's emails and
// meetings. Cron only; a desk that fails never stops the others.
import { isCron } from "@/lib/auth";
import { allWorkspaces, inWorkspace } from "@/lib/db";
import { sendReminder } from "@/lib/today";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCron(req)) return Response.json({ error: "cron only" }, { status: 405 });
  const origin = new URL(req.url).origin;
  const results: Record<string, any> = {};
  for (const ws of await allWorkspaces()) {
    try { results[ws] = await inWorkspace(ws, async () => { await loadConnectorKeys().catch(() => {}); return sendReminder(origin); }); }
    catch (e: any) { results[ws] = { error: String(e?.message || e).slice(0, 200) }; }
  }
  return Response.json(results);
}
