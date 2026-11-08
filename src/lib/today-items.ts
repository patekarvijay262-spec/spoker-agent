// What needs the organiser today, from rows of the desk. No imports, so Home (browser) and the morning email
// (server) share it and always agree.

const IST = 5.5 * 3600e3;
export const istDay = (t = Date.now()) => new Date(t + IST).toISOString().slice(0, 10);
const istTime = (iso: string) => new Date(Date.parse(iso) + IST).toISOString().slice(11, 16);

export type TodayItem = { text: string; href: string };

/** Works on rows from the database or from the browser's state, so Home and the email always agree. */
export function todayItems(s: { messages: any[]; meetings: any[]; replies: any[]; exceptions: any[]; companies: any[] }, now = Date.now()): TodayItem[] {
  const today = istDay(now), tomorrow = istDay(now + 86400e3);
  const name = (id: string) => s.companies.find((c) => c.id === id)?.name || "a company";
  const items: TodayItem[] = [];
  const waiting = s.messages.filter((m) => m.status === "drafted").length;
  if (waiting) items.push({ text: `${waiting} ${waiting === 1 ? "email is" : "emails are"} waiting for your yes`, href: "/desk/outbox" });
  const dueToday = s.messages.filter((m) => m.status === "approved" && (!m.scheduled_for || istDay(Date.parse(m.scheduled_for)) <= today));
  const follow = dueToday.filter((m) => Number(m.step) > 0).length, first = dueToday.length - follow;
  if (first) items.push({ text: `${first} approved ${first === 1 ? "email goes" : "emails go"} out today`, href: "/desk/outbox" });
  if (follow) items.push({ text: follow === 1 ? "1 follow-up goes out today, on its own" : `${follow} follow-ups go out today, on their own`, href: "/desk/outbox" });
  for (const m of s.meetings.filter((x) => x.status !== "cancelled" && x.start_at && [today, tomorrow].includes(istDay(Date.parse(x.start_at))))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)))) {
    items.push({ text: `Meeting with ${name(m.company_id)} ${istDay(Date.parse(m.start_at)) === today ? "today" : "tomorrow"} at ${istTime(m.start_at)}`, href: "/desk/meetings" });
  }
  const fresh = s.replies.filter((r) => r.received_at && Date.now() - Date.parse(r.received_at) < 36 * 3600e3).length;
  if (fresh) items.push({ text: `${fresh} new ${fresh === 1 ? "reply" : "replies"} from sponsors`, href: "/desk/inbox" });
  const decisions = s.exceptions.filter((x) => x.status === "open" && !["no_contact", "no_email", "verify_contact", "recap_no_email"].includes(x.kind)).length;
  if (decisions) items.push({ text: `${decisions} ${decisions === 1 ? "offer needs" : "offers need"} your call`, href: "/desk/inbox" });
  return items;
}

