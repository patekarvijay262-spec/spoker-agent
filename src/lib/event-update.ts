// Reads a free-text change to an event ("new dates are 18 to 21 Dec 2027, footfall 1.5 lakh, past sponsors: Jio, L&T")
// into fields. Pure, so it is tested without a database. Anything it cannot place is kept as a note for the desk.

const MONTH = /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i;
const CITIES = ["Mumbai", "Delhi", "New Delhi", "Bengaluru", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Chandigarh", "Indore", "Bhopal", "Goa", "Kochi", "Coimbatore", "Nagpur", "Surat", "Guwahati", "Bhubaneswar", "Noida", "Gurugram", "Gurgaon", "Roorkee", "Kharagpur", "Varanasi", "Patna", "Dehradun", "Mysuru", "Vizag", "Visakhapatnam", "Trichy", "Manipal", "Vellore"];

export type EventUpdate = {
  dates?: string; reach?: number; goal_inr?: number; postal_address?: string; city?: string;
  past: string[]; brands: string[]; notes: string[];
};

const listOf = (s: string) => s.split(/,|\band\b|&(?=\s)|\//i).map((x) => x.replace(/^[\s:-]+|[\s.]+$/g, "").trim()).filter((x) => x.length >= 2 && x.length <= 60);

/** "1.5 lakh" → 150000, "15k" → 15000, "₹50 lakh" → 5000000, "2 crore" → 20000000. */
export function amount(numText: string, unit = "") {
  const n = Number(String(numText).replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  const u = unit.toLowerCase();
  const m = /^k/.test(u) ? 1e3 : /^(l|lakh|lac)/.test(u) ? 1e5 : /^(cr|crore)/.test(u) ? 1e7 : /^(m|million)/.test(u) ? 1e6 : 1;
  return Math.round(n * m);
}

export function parseEventUpdate(text: string): EventUpdate {
  const out: EventUpdate = { past: [], brands: [], notes: [] };
  const clauses = String(text || "").split(/\n+|;|(?<=[a-z0-9)])\.\s+(?=[A-Z])/).map((c) => c.trim()).filter(Boolean);
  for (const raw of clauses) {
    const c = raw.replace(/\.$/, "");
    let used = false;
    const past = c.match(/(?:past|previous|old|last year'?s?)\s+sponsors?(?:\s+(?:were|are|included|include))?\s*:?\s*(.+)|sponsored by\s+(.+)/i);
    if (past) { out.past.push(...listOf(past[1] || past[2])); continue; }
    const brands = c.match(/(?:brands?\s+(?:we|i)\s+want|want(?:ed)?\s+brands?|target\s+brands?|brands?\s*:|reach out to|approach|go after)\s*:?\s*(.+)/i);
    if (brands) { out.brands.push(...listOf(brands[1])); continue; }
    // A clause can carry several facts: "18 to 21 Dec 2027 in Mumbai, 1.5 lakh footfall, goal ₹80 lakh".
    for (const part of c.split(/,(?!\d)(?![^()]*\))/).map((p) => p.trim()).filter(Boolean)) {
      const pin = part.match(/\b\d{6}\b/);
      if (pin && /address|road|campus|powai|nagar|marg|pin|\b[a-z]+ \d{6}\b/i.test(c)) {
        out.postal_address = c.replace(/^(?:new\s+)?(?:postal\s+)?address\s*(?:is|:)?\s*/i, "").trim(); used = true; break;
      }
      const goal = part.match(/(?:goal|target|raise|budget)\b[^\d₹]*(?:₹|rs\.?|inr)?\s*(\d[\d,.]*)\s*(k|lakhs?|lacs?|l|crores?|cr|million|m)?\b/i);
      if (goal) { const v = amount(goal[1], goal[2]); if (v) { out.goal_inr = v; used = true; continue; } }
      const foot = part.match(/(\d[\d,.]*)\s*(k|lakhs?|lacs?|l|million|m)?\s*\+?\s*(?:footfall|attendees|people|visitors|participants|students|registrations)|(?:footfall|attendance|visitors)\D{0,12}(\d[\d,.]*)\s*(k|lakhs?|lacs?|l|million|m)?\b/i);
      if (foot) { const v = amount(foot[1] || foot[3], foot[2] || foot[4] || ""); if (v >= 50) { out.reach = v; used = true; continue; } }
      if (MONTH.test(part) && /\b\d{1,2}\b/.test(part)) {
        out.dates = part.replace(/^(?:the\s+)?(?:new\s+)?(?:event\s+)?(?:dates?|on|is on|will be on|happens on)\s*(?:are|is|:)?\s*/i, "").replace(/^(?:have\s+)?(?:been\s+)?(?:moved|changed|shifted)\s+to\s+/i, "").replace(/\s+in\s+[A-Z][a-z]+.*$/, "").trim();
        used = true;
      }
      const city = CITIES.find((x) => new RegExp(`\\b(?:in|at|city|venue|moved to)\\s*:?\\s*${x}\\b`, "i").test(part));
      if (city) { out.city = city === "Bangalore" ? "Bengaluru" : city === "Gurgaon" ? "Gurugram" : city; used = true; }
    }
    if (!used) out.notes.push(raw);
  }
  out.past = [...new Set(out.past)];
  out.brands = [...new Set(out.brands)];
  return out;
}
