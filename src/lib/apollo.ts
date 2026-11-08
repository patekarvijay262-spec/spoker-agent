// Apollo (optional, APOLLO_API_KEY): a second source of people, verified work emails and direct phones, asked only
// when Crustdata leaves a company short of the number of people the organiser wants. Everything Apollo returns is
// cleaned before the desk keeps it: real names, short titles, verified addresses on the company's own domain,
// no role inboxes, LinkedIn links in one form, phone numbers in +91 form, and no duplicates.
import { SAFE_EMAIL } from "./gmail";

const BASE = "https://api.apollo.io/api/v1";
export const hasApollo = () => !!process.env.APOLLO_API_KEY;

async function call(path: string, body: any, ms = 30000) {
  const res = await fetch(BASE + path, {
    method: "POST", signal: AbortSignal.timeout(ms),
    headers: { "x-api-key": process.env.APOLLO_API_KEY || "", "content-type": "application/json", "cache-control": "no-cache", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Apollo ${path}: ${j.error || j.message || res.status}`);
  return j;
}

export type CleanPerson = { full_name: string; title: string; email: string; linkedin: string; phone: string; seniority: string };

const ROLE_INBOX = /^(info|hello|hi|contact|admin|support|help|sales|marketing|hr|careers?|jobs|team|office|noreply|no-reply|enquiry|enquiries|partnerships?|media|press|pr)@/i;

/** "PRIYA SHAH, MBA 🚀" to "Priya Shah"; keeps Dr. and particles like "van". */
export function cleanName(raw: string) {
  let s = String(raw || "").normalize("NFKC").replace(/[\p{Extended_Pictographic}\p{S}]/gu, " ").replace(/\(.*?\)|\[.*?\]/g, " ");
  s = s.split(/,|\s[-|–]\s/)[0].replace(/\b(MBA|PhD|CA|CFA|PMP|CPA|Jr\.?|Sr\.?)\b\.?/g, " ").replace(/[^\p{L}\p{M}.' -]/gu, " ").replace(/\s+/g, " ").trim();
  if (s === s.toUpperCase() || s === s.toLowerCase()) s = s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return s.split(" ").length >= 2 && s.length <= 60 ? s : "";
}

/** "Head of Brand | Ex-Google | Speaker" to "Head of Brand"; "Marketing Manager at Zepto" to "Marketing Manager". */
export function cleanTitle(raw: string, company = "") {
  let s = String(raw || "").replace(/[\p{Extended_Pictographic}]/gu, " ").split(/\s[|•·]\s|\s\|\s?|\s@\s/)[0];
  if (company) s = s.replace(new RegExp(`\\s+(at|@)\\s+${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "");
  s = s.replace(/\s+at\s+[A-Z][\w&.' -]*$/, "").replace(/\s+/g, " ").trim();
  return s.length > 80 ? s.slice(0, 80).replace(/\s\S*$/, "") : s;
}

export function cleanLinkedIn(raw: string) {
  const m = String(raw || "").match(/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i);
  return m ? `https://www.linkedin.com/in/${m[1].toLowerCase()}` : "";
}

/** Any Indian number to +91XXXXXXXXXX; other countries keep their + form; anything unclear is dropped. */
export function cleanPhone(raw: string) {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  const digits = d.replace(/\D/g, "").replace(/^0+/, ""); // a trunk 0 ("09876...") is not part of the number
  if (/^(91)?[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(-10)}`;
  if (d.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return "";
}

const base = (domain: string) => String(domain || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split(".").slice(-2)[0];

/** One Apollo person, cleaned, or null when it is not a usable, verified person at this company. */
export function cleanPerson(p: any, company: { name: string; domain: string }): CleanPerson | null {
  const full_name = cleanName(p?.name || [p?.first_name, p?.last_name].filter(Boolean).join(" "));
  const email = String(p?.email || "").trim().toLowerCase();
  const orgDomain = String(p?.organization?.primary_domain || p?.organization?.website_url || "");
  const want = base(company.domain);
  if (!full_name || !SAFE_EMAIL.test(email) || ROLE_INBOX.test(email)) return null;
  if (String(p?.email_status || "").toLowerCase() !== "verified") return null; // Apollo also says guessed, extrapolated, unavailable
  if (want && base(email.split("@")[1]) !== want) return null; // an address at another company is an old job
  if (want && orgDomain && base(orgDomain) !== want) return null;
  const phones = (Array.isArray(p?.phone_numbers) ? p.phone_numbers : []).filter((x: any) => !/hq|headquarters|switchboard|work_hq/i.test(String(x?.type || "")));
  return {
    full_name, email, title: cleanTitle(p?.title || p?.headline || "", company.name), linkedin: cleanLinkedIn(p?.linkedin_url),
    phone: cleanPhone(phones[0]?.sanitized_number || phones[0]?.raw_number || ""), seniority: String(p?.seniority || ""),
  };
}

/** Removes repeats of the same person (by LinkedIn, email, then name) across sources, keeping the first. */
export function dedupe<T extends { full_name: string; email?: string; linkedin?: string }>(list: T[]) {
  const seen = new Set<string>();
  return list.filter((x) => {
    const keys = [x.linkedin && `li:${x.linkedin}`, x.email && `em:${x.email.toLowerCase()}`, `nm:${x.full_name.toLowerCase().replace(/[^a-z]/g, "")}`].filter(Boolean) as string[];
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  });
}

/** Up to `need` cleaned, verified people at a company whose titles match the sponsorship roles. Search is free on
 * Apollo; each enrichment uses Apollo credits, so only as many as needed (plus a margin) are enriched. */
export async function peopleAt(company: { name: string; domain: string }, titles: string[], need: number): Promise<CleanPerson[]> {
  if (!hasApollo() || !company.domain || need <= 0) return [];
  const search = { q_organization_domains_list: [company.domain.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]], person_titles: titles.slice(0, 15), person_seniorities: ["owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior"], per_page: Math.min(100, need * 3), page: 1 };
  let found: any[] = [];
  try { found = (await call("/mixed_people/api_search", search)).people || []; }
  catch { found = (await call("/mixed_people/search", search).catch(() => ({ people: [] }))).people || []; }
  const ids = found.map((p) => p?.id).filter(Boolean).slice(0, Math.min(100, need * 2));
  const out: CleanPerson[] = [];
  for (let i = 0; i < ids.length && out.length < need; i += 10) {
    const r = await call("/people/bulk_match", { details: ids.slice(i, i + 10).map((id: string) => ({ id })), reveal_personal_emails: false }).catch(() => ({ matches: [] }));
    for (const m of r.matches || []) { const c = cleanPerson(m, company); if (c) out.push(c); }
  }
  return dedupe(out).slice(0, need);
}
