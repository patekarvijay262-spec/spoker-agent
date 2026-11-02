// One spoken command (already transcribed by Saaras) to one intent. The browser carries it out.
import { db, json } from "@/lib/db";
import { wrap } from "@/lib/http";
import { understand } from "@/lib/voice-intent";

export const dynamic = "force-dynamic";

export const POST = wrap(async (req) => {
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || "").trim().slice(0, 600);
  if (!text) throw new Error("Nothing was heard.");
  const d = await db();
  const companies = (await d.q(`SELECT id, name FROM companies WHERE stage <> 'DISQUALIFIED' ORDER BY COALESCE(intersection, -1) DESC LIMIT 200`)).map((c) => ({ id: String(c.id), name: String(c.name) }));
  const drafts = (await d.q(`SELECT key, company_id FROM messages WHERE status='drafted' ORDER BY created_at LIMIT 200`)).map((m) => ({ key: String(m.key), company_id: String(m.company_id) }));
  const ev = (await d.q(`SELECT profile FROM events WHERE id='current'`))[0];
  const floor = Number(json<any>(ev?.profile, {})?.floor_inr || 0) || undefined;
  const focus = companies.some((c) => c.id === String(b.focus || "")) ? String(b.focus) : undefined;
  return understand(text, String(b.lang || ""), { companies, floor, drafts, focus });
});
