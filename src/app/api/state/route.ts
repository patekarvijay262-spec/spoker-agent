import { wrap } from "@/lib/http";
import { connectorStatus, listTools } from "@/lib/connectors";
import { allSettings, db, gdb, json } from "@/lib/db";
import { getEvent } from "@/lib/flows";
import { hasCrustdata, dataSource } from "@/lib/crustdata";
import { hasGoogleApp } from "@/lib/gmail";
import { hasSarvam } from "@/lib/sarvam";
import { hasInstagramApp } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// Everything the desk shows, in one call. Each query is its own round trip to the database, so they all run at
// once, and the settings come back in a single query instead of one per setting.
export const GET = wrap(async (req, user) => {
  const d = await db();
  if (new URL(req.url).searchParams.get("log_only")) return { log: await d.q(`SELECT * FROM log ORDER BY ts DESC LIMIT 200`) };
  const [log, companiesRaw, contactsRaw, messages, replies, exceptions, deals, meetingsRaw, decks, people, s, event, connectors, tools] = await Promise.all([
    d.q(`SELECT * FROM log ORDER BY ts DESC LIMIT 200`),
    d.q(`SELECT * FROM companies ORDER BY COALESCE(intersection, -1) DESC, name LIMIT 1000`),
    d.q(`SELECT * FROM contacts WHERE status <> 'erased' LIMIT 3000`),
    d.q(`SELECT id, key, contact_id, company_id, to_email, sequence, step, subject, body, gate, status, approved_by, scheduled_for, sent_at, cancel_reason, attempts, created_at FROM messages ORDER BY created_at DESC LIMIT 500`),
    d.q(`SELECT * FROM replies ORDER BY received_at DESC LIMIT 200`),
    d.q(`SELECT * FROM exceptions ORDER BY created_at DESC LIMIT 200`),
    d.q(`SELECT * FROM deals`),
    d.q(`SELECT * FROM meetings ORDER BY created_at DESC LIMIT 300`),
    d.q(`SELECT id, company_id, created_at FROM decks ORDER BY created_at DESC LIMIT 300`),
    // Only the people of this desk. Its admin manages them; nobody sees another desk's team.
    gdb().then((g) => g.q(`SELECT id, email, name, role, disabled, created_at, last_login_at FROM users WHERE workspace_id=$1 ORDER BY created_at`, [user.ws])),
    allSettings(),
    getEvent(),
    connectorStatus(),
    listTools(),
  ]);
  const companies = companiesRaw.map((c) => ({ ...c, reasons: json(c.reasons, {}), role_map: json(c.role_map, {}), sources: json(c.sources, []) }));
  const contacts = contactsRaw.map((c) => ({ ...c, context: json(c.context, []), evidence: json(c.evidence, []), relevance_parts: json(c.relevance_parts, []), email_check: json(c.email_check, []) }));
  const meetings = meetingsRaw.map((m) => ({ ...m, digest: json(m.digest, null) }));
  const get = (k: string, dflt = "") => s[k] ?? dflt;
  return {
    me: { id: user.id, name: user.name, email: user.email, role: user.role, owner: user.owner, viewing: user.viewing || null, tour_seen: get(`tour_seen:${user.id}`) === "1" },
    users: user.role === "admin" ? people : undefined,
    event, companies, contacts, messages, replies, exceptions, deals, meetings, decks, log,
    settings: {
      approvers: people.filter((p) => !p.disabled && (p.role === "admin" || p.role === "approver")).map((p) => p.name).join(", "), postal: get("postal"),
      cap_new_per_day: get("cap_new_per_day", "30"), cap_total_per_day: get("cap_total_per_day", "60"), spacing_sec: get("spacing_sec", "60"),
      gmail: get("gmail_email"), googleApp: hasGoogleApp(), crustdata: hasCrustdata(), voice: hasSarvam(),
      instagram: { app: hasInstagramApp(), connected: !!get("instagram_token"), handle: get("instagram_handle"), followers: Number(get("instagram_followers")) || null },
      source: dataSource(), engine: "Rules + Crustdata + Sarvam (optional)", permission: get("organiser_permission"),
      outreach_template: json(get("outreach_template"), null), outreach_deck: json(get("outreach_deck"), null), daily_reminder: get("daily_reminder", "1") !== "0", connectors, tools,
    },
  };
});
