// "Today": what needs the organiser today, in plain words, so nobody has to remember follow-ups or meetings. The same
// list is shown at the top of Home and sent as a short email each morning (cron /api/remind, 9:00 IST).
import { db, getSetting, setSetting } from "./db";
import * as G from "./gmail";

import { istDay, todayItems } from "./today-items";

/** The morning email to the organiser's own inbox, once a day, only when something is on. Off with setting daily_reminder=0. */
export async function sendReminder(origin: string) {
  if ((await getSetting("daily_reminder", "1")) === "0") return { sent: false, why: "off" };
  const to = await G.connectedEmail();
  if (!to) return { sent: false, why: "gmail not connected" };
  const day = istDay();
  if ((await getSetting("reminder_day", "")) === day) return { sent: false, why: "already sent today" };
  const d = await db();
  const [messages, meetings, replies, exceptions, companies, ev] = await Promise.all([
    d.q(`SELECT status, step, scheduled_for FROM messages WHERE status IN ('drafted','approved')`), d.q(`SELECT company_id, start_at, status FROM meetings`),
    d.q(`SELECT received_at FROM replies`), d.q(`SELECT kind, status FROM exceptions WHERE status='open'`), d.q(`SELECT id, name FROM companies`), d.q(`SELECT profile FROM events WHERE id='current'`),
  ]);
  const items = todayItems({ messages, meetings, replies, exceptions, companies });
  if (!items.length) return { sent: false, why: "nothing today" };
  const event = (() => { try { return JSON.parse(ev[0]?.profile || "{}").name || "your event"; } catch { return "your event"; } })();
  const body = [`Good morning,`, ``, `Here is today for ${event}:`, ``, ...items.map((i) => `- ${i.text}`), ``, `Open the desk: ${origin}/desk`, ``, `Everything else is in hand. You can turn this email off on Home.`].join("\n");
  await G.send({ to, subject: `Today: ${items[0].text}${items.length > 1 ? ` and ${items.length - 1} more` : ""}`, body, fromName: "SponsorDesk" });
  await setSetting("reminder_day", day);
  return { sent: true, items: items.length };
}
