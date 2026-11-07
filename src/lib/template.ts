// The organiser's own email draft, fitted to each company and person. Shared by the Draft page (live preview in the
// browser) and the server (the emails that go to the Outbox), so what you preview is what gets queued. Your
// signature (name, title, phone, postal address) is added under it, unless the draft already signs off.

export type Template = { subject: string; body: string };

export const TOKENS: { key: string; label: string; hint: string }[] = [
  { key: "first_name", label: "First name", hint: "Priya" },
  { key: "role", label: "Their role", hint: "Head of Brand" },
  { key: "company", label: "Company", hint: "Zepto" },
  { key: "why_them", label: "Why them", hint: "The desk's one-line reason this company fits" },
  { key: "offer", label: "Suggested offer", hint: "Gold partnership, ₹8–16 lakh" },
  { key: "event", label: "Event", hint: "Techfest 2027" },
  { key: "my_name", label: "Your name", hint: "From the signature" },
];

export const STARTER: Template = {
  subject: "{company} x {event}",
  body: `Hi {first_name},

I lead sponsorships for {event}. {why_them}

We would love to have {company} on board. For a team like yours I would suggest a {offer}, and we can shape it around what matters to you this year.

Could we find 15 minutes next week?`,
};

export type Fill = { first_name?: string; full_name?: string; role?: string; company?: string; why_them?: string; offer?: string; event?: string; my_name?: string };

const first = (full = "") => full.trim().split(/\s+/)[0] || "";

/** Fills every {token}. A blank value leaves no trace: the sentence around an empty {why_them} still reads cleanly. */
export function fillTemplate(t: string, v: Fill) {
  const vals: Record<string, string> = {
    first_name: v.first_name || first(v.full_name) || "there", role: v.role || "", company: v.company || "", why_them: v.why_them || "",
    offer: v.offer || "partnership", event: v.event || "", my_name: v.my_name || "",
  };
  return t.replace(/\{\s*([a-z_]+)\s*\}/gi, (m, k) => (k.toLowerCase() in vals ? vals[k.toLowerCase()] : m))
    .replace(/[ \t]+([.,;:!?])/g, "$1").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Tokens the draft uses that the desk does not know (a typo like {frist_name}): shown before saving. */
export function unknownTokens(t: string) {
  const known = new Set(TOKENS.map((x) => x.key).concat("full_name"));
  return [...new Set([...t.matchAll(/\{\s*([a-z_]+)\s*\}/gi)].map((m) => m[1].toLowerCase()).filter((k) => !known.has(k)))];
}

/** The desk's note on a company ("Raised Series B of USD 40M. Offer: a Zepto experience zone, in front of college
 * students.") as a sentence a person would write: a nod to their news, then the idea. */
export function whyThem(angle: string) {
  const a = String(angle || "").trim();
  if (!a) return "";
  const offer = a.match(/Offer:\s*(.+?)\.?\s*$/i)?.[1]?.trim() || "";
  const signal = a.replace(/\s*Offer:.*$/i, "").replace(/\.$/, "").trim();
  const round = signal.match(/^Raised (?:a |an )?(.+?)(?: of USD [\d.]+[KMB]?)?$/i)?.[1];
  const nod = round && !/funding round/i.test(round) ? `Congratulations on your recent ${round}.` : /^Headcount \+/i.test(signal) ? "Your team has been growing fast." : "";
  const idea = offer ? `${offer.charAt(0).toUpperCase()}${offer.slice(1)}${offer.includes(",") ? "," : ""} could work well for you.` : "";
  return [nod, idea].filter(Boolean).join(" ") || (offer ? "" : `${signal}.`);
}

/** The company and person's values, from what the desk already knows about them. */
export function fillFor(co: any, person: any, e: any): Fill {
  const tier = String(co?.tier || "").trim();
  const price = String(co?.price_range || "").trim();
  return {
    full_name: person?.full_name || "", role: person?.position || person?.designation || "", company: co?.name || "",
    why_them: whyThem(co?.angle),
    offer: tier ? `${tier} partnership${price ? ` (${price.replace(/INR\s*/gi, "₹")})` : ""}` : "",
    event: e?.name || "", my_name: e?.sender?.name || "",
  };
}
