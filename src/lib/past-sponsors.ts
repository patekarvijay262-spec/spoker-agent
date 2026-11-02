// Past sponsors: the warmest leads an event has. Three sources, all optional, each one labelled:
//   1. The event's own website: homepage plus its sponsors/partners pages, read directly (no credits).
//   2. Instagram: the public profile's follower count, plus captions that search engines indexed (via Crustdata web search).
//   3. Sponsor-focused web searches ("<event> title sponsor", "powered by") through Crustdata (1 credit each).
// Organisers can always type names themselves; nothing here invents a sponsor.
import { lookup } from "node:dns/promises";

import * as CD from "./crustdata";
import * as IG from "./instagram";

export type PastSponsor = { name: string; source: "website" | "instagram" | "web" | "organiser"; url?: string; role?: string; year?: string };
export type PastSponsorReport = { sponsors: PastSponsor[]; website?: string; instagram?: string; followers?: number; checked: string[]; blocked: string[] };

const UA = "Mozilla/5.0 (compatible; SponsorDesk/1.0; reads public sponsor pages for the event organiser)";
const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;
const NOT_A_SPONSOR = /^(home|about|about us|contact|contact us|logo|logos|image|img|banner|icon|menu|close|open|search|sponsor|sponsors|partner|partners|our partners|our sponsors|past sponsors|previous sponsors|sponsorship|title sponsor|associate sponsor|powered by|co sponsor|in association with|register|login|sign in|sign up|instagram|facebook|linkedin|twitter|x|youtube|whatsapp|telegram|google play|app store|play store|gallery|team|events?|schedule|faq|faqs|blog|news|more|view all|read more|click here|download|brochure|loading|arrow|next|prev|previous|background|bg|placeholder|default|untitled|photo|picture|thumbnail)$/i;

export function normaliseWebsite(raw?: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !/\./.test(u.hostname) || /(^|\.)instagram\.com$/i.test(u.hostname)) return "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch { return ""; }
}

/** "@aavhan_iitb", "aavhan_iitb" or "instagram.com/aavhan_iitb/?hl=en" all become "aavhan_iitb". */
export function normaliseInstagram(raw?: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i) || s.match(/^@?([A-Za-z0-9._]{1,30})$/);
  const h = m?.[1] || "";
  return /^(p|reel|reels|stories|explore|accounts)$/i.test(h) ? "" : h.toLowerCase();
}

/** Refuses localhost, private and link-local addresses, so a typed "website" cannot make the server read its own network. */
async function safeHost(hostname: string) {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(hostname)) return false;
  try {
    const addrs = await Promise.race([lookup(hostname, { all: true }), new Promise<never>((_, no) => setTimeout(() => no(new Error("dns timeout")), 4000))]);
    return addrs.length > 0 && addrs.every((a) => a.family === 4 ? !PRIVATE_V4.test(a.address) : !/^(::1|fc|fd|fe80|::ffff:(127|10|192\.168)\.)/i.test(a.address));
  } catch { return false; }
}

/** GET a public page as text: http(s) only, public hosts only, at most 3 redirects (each re-checked), 1.5 MB, 10 s. */
export async function fetchPage(url: string): Promise<{ url: string; html: string } | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return null; }
    if (!/^https?:$/.test(u.protocol) || !(await safeHost(u.hostname))) return null;
    let res: any;
    try { res = await fetch(u.toString(), { redirect: "manual", headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(10000) }); }
    catch { return null; }
    const status = Number(res?.status || 0);
    if (status >= 300 && status < 400) {
      const loc = res.headers?.get?.("location");
      if (!loc) return null;
      current = new URL(loc, u).toString();
      continue;
    }
    if (status < 200 || status >= 300 || typeof res.text !== "function") return null;
    const html = String(await res.text().catch(() => "")).slice(0, 1_500_000);
    return html ? { url: u.toString(), html } : null;
  }
  return null;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** Turns "redbull-logo-white.png" / "Red Bull Logo" / "Sponsor: boAt" into a brand name, or "" when it is not one. */
export function cleanSponsorName(raw: string) {
  let s = decode(String(raw || ""))
    .replace(/\.(png|jpe?g|webp|svg|gif|avif)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(official|company|brand|logo|logos|sponsor|sponsors|partner|partners|title|associate|powered by|presents|img|image|icon|white|black|colou?r|final|new|small|large|thumb|copy|hd|\d{2,4}x\d{2,4}|v\d|20\d{2})\b/gi, " ")
    .replace(/[^\p{L}\p{N}&.'+ ]+/gu, " ")
    .replace(/\s+/g, " ").trim();
  if (/^[a-z0-9 ]+$/.test(s) && s.length > 3) s = s.replace(/\b[a-z]/g, (c) => c.toUpperCase()); // "boat nirvana" from a file name or handle
  if (s.length < 2 || s.length > 40 || /^\d+$/.test(s) || NOT_A_SPONSOR.test(s) || s.split(" ").length > 5) return "";
  // Menu items and loading placeholders (moodi.org: "ACCOMMODATION", "Loading 3D Experience") are never brands.
  if (/^(home|about( us)?|schedule|events?|merch|competitions?|accommodation|contact( us)?|team|faq|register|login|gallery|blog|tickets?)$/i.test(s) || /^loading\b/i.test(s)) return "";
  // Leftovers of image file names ("logo@3x.png" came back as "3x Png" on moodi.org): not a brand.
  if (/\b(png|jpe?g|webp|svg|gif|avif)\b/i.test(s) || /^\d+x\b/i.test(s)) return "";
  return s;
}

function textOf(html: string) {
  return decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

/** Sponsor names from one page. In a sponsors/partners page every logo counts; on any other page only the
 * section after a "sponsors" or "partners" heading or container does, so team photos and app badges stay out. */
export function sponsorsInHtml(html: string, pageIsSponsorPage: boolean): { name: string; role?: string }[] {
  const out: { name: string; role?: string }[] = [];
  const chunks: string[] = [];
  if (pageIsSponsorPage) chunks.push(html);
  else {
    const rx = /<(section|div|ul|footer)[^>]*(?:id|class)\s*=\s*["'][^"']*(sponsor|partner)[^"']*["'][^>]*>|<h[1-6][^>]*>[^<]*(sponsor|partner)[^<]*<\/h[1-6]>/gi;
    let end = -1;
    for (const m of html.matchAll(rx)) {
      if (m.index! < end) continue; // already inside an earlier sponsor section
      chunks.push(html.slice(m.index!, m.index! + 20000));
      end = m.index! + 20000;
    }
  }
  for (const chunk of chunks) {
    // Role headings ("Title Sponsor", "Associate Partner") apply to the logos that follow them.
    const parts = chunk.split(/(?=<h[1-6][^>]*>)/i);
    for (const part of parts) {
      const heading = textOf((part.match(/^<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1] || "");
      const role = (heading.match(/\b((?:title|associate|co|powered|presenting|official|gold|silver|platinum|diamond|bronze|media|food|beverage|travel|banking|tech(?:nology)?|gaming|hospitality|apparel|education|knowledge|digital|radio|outreach|event)?\s*(?:sponsors?|partners?))\b/i)?.[1] || "").trim();
      for (const m of part.matchAll(/<img\b[^>]*>/gi)) {
        const tag = m[0];
        const attr = (k: string) => decode((tag.match(new RegExp(`\\b${k}\\s*=\\s*["']([^"']*)["']`, "i")) || [])[1] || "");
        let name = cleanSponsorName(attr("alt")) || cleanSponsorName(attr("title"));
        if (!name && pageIsSponsorPage) {
          const file = (attr("src") || attr("data-src")).split(/[?#]/)[0].split("/").pop() || "";
          if (/[a-z]{3,}/i.test(file) && !/^(logo|img|image|dsc|screenshot|whatsapp|photo|wp|unnamed|download)/i.test(file)) name = cleanSponsorName(file);
        }
        if (name) out.push({ name, role: role ? role.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined });
      }
      // Text lists ("Sponsors: Red Bull, boAt and Decathlon").
      for (const m of textOf(part).matchAll(/(?:sponsored by|powered by|in association with|title sponsor|associate sponsor|our (?:sponsors|partners)(?: include| are|:)?)\s*:?\s*((?:[A-Z][\w&.'+-]*(?:\s[A-Z][\w&.'+-]*){0,2})(?:\s*(?:,|and|&)\s*[A-Z][\w&.'+-]*(?:\s[A-Z][\w&.'+-]*){0,2}){0,10})/g)) {
        for (const n of m[1].split(/\s*(?:,|\band\b|&)\s*/)) { const c = cleanSponsorName(n); if (c) out.push({ name: c }); }
      }
    }
  }
  return out.filter((s, i) => out.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i);
}

/** "@swiggyindia" → "swiggy", "@boat.nirvana" → "boat nirvana", "@airindia" stays "airindia" (too short once trimmed). */
export function handleToName(h: string) {
  return h.replace(/^@/, "").replace(/[._](india|in|official|ind|hq)$/i, "").replace(/^([a-z0-9]{5,})(india|official)$/i, "$1").replace(/[._]/g, " ");
}

/** Captions and snippets: "Thank you @redbullindia for powering ...", "presenting Zomato as our food partner". */
export function sponsorsInText(t: string): { name: string; role?: string; year?: string }[] {
  const out: { name: string; role?: string; year?: string }[] = [];
  const year = t.match(/\b(20\d{2})\b/)?.[1];
  for (const m of t.matchAll(/(?:proud to have|welcome|welcoming|thank(?:s| you)(?: to)?|presenting|announcing|introducing|say hello to)\s+@?((?:[A-Z@][\w&.'-]*\s?){1,4})\s+as\s+(?:the|our)\s+((?:[A-Za-z]+\s?){0,3}(?:Partner|Sponsor|partner|sponsor))/g)) {
    const c = cleanSponsorName(m[1].replace(/^@/, "")); if (c) out.push({ name: c, role: m[2].trim().replace(/\b\w/g, (x) => x.toUpperCase()), year });
  }
  for (const m of t.matchAll(/(?:sponsored by|powered by|presented by|in association with|title sponsor|associate sponsor|co-?powered by)\s*:?\s*@?((?:[A-Z][\w&.'-]*\s?){1,4})/g)) {
    const c = cleanSponsorName(m[1]); if (c) out.push({ name: c, year });
  }
  // "@brand" handles right next to sponsor words in a caption.
  for (const m of t.matchAll(/(?:sponsor|partner|powered|presented|thank)[^.!\n]{0,80}?@([A-Za-z0-9._]{3,30})/gi)) {
    const c = cleanSponsorName(handleToName(m[1])); if (c) out.push({ name: c, year });
  }
  const list = t.match(/(?:sponsors?|partners?|sponsored by|partnered with)(?: include| like| such as| were| are|:)?\s+((?:[A-Z][\w&.'-]*(?:\s[A-Z][\w&.'-]*)?)(?:,\s*(?:and\s+)?[A-Z][\w&.'-]*(?:\s[A-Z][\w&.'-]*)?){1,8}(?:,?\s*and\s+[A-Z][\w&.'-]*(?:\s[A-Z][\w&.'-]*)?)?)/);
  if (list) for (const n of list[1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/)) { const c = cleanSponsorName(n); if (c) out.push({ name: c, year }); }
  return out;
}

const SPONSOR_PATHS = ["/sponsors", "/partners", "/our-sponsors", "/past-sponsors", "/sponsorship", "/partners-and-sponsors"];

/** Sponsor names in a page's visible text (a rendered fetch has no HTML): the inline patterns, plus the short lines
 * listed under a "Sponsors" / "Our partners" heading, until the next heading or a sentence. */
/** Sponsor pages that print each brand with its role on the next line ("Coca Cola" / "Official Beverage Partner"),
 * grouped under plural headings ("Media Partners", "Food & Beverages Partners") whose brands may have no role line.
 * Returns nothing unless at least three name-role pairs are found, so other layouts fall through. */
function sponsorRolePairs(lines: string[]): { name: string; role?: string }[] {
  const isRole = (l = "") => l.length <= 60 && /\b(sponsor|partner)\b(?!s)/i.test(l) && !/[.!?]$/.test(l);
  const isGroup = (l = "") => l.length <= 40 && /\b(sponsors|partners)$/i.test(l);
  const isName = (l = "") => l.length <= 40 && l.split(/\s+/).length <= 5 && !/[.!?:]$/.test(l) && !isRole(l) && !isGroup(l);
  const out: { name: string; role?: string }[] = [];
  let pairs = 0, group = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (isGroup(l)) { group = l.replace(/s$/i, ""); continue; }
    if (isRole(l) || !isName(l)) continue;
    const name = cleanSponsorName(l);
    if (!name) continue;
    // A bare "SPONSOR" in capitals is a menu button under a nav item, not a role.
    if (isRole(lines[i + 1]) && !/^(SPONSOR|PARTNER)$/.test(lines[i + 1])) { out.push({ name, role: lines[i + 1].replace(/\b\w/g, (c) => c.toUpperCase()) }); pairs++; }
    else if (group) out.push({ name, role: group.replace(/\b\w/g, (c) => c.toUpperCase()) });
  }
  return pairs >= 3 ? out : [];
}

export function sponsorsInPageText(text: string): { name: string; role?: string; year?: string }[] {
  // The rendered fetch can return the page's HTML rather than its text: one line per element, tags removed.
  if (/^\s*<(!doctype|html|head|body|div)\b/i.test(text)) {
    text = decode(text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<(br|\/(div|p|h\d|li|a|span|section|article|figcaption|td|tr|button))\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " "))
      .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).join("\n");
  }
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const paired = sponsorRolePairs(lines);
  if (paired.length) return paired.filter((s, i) => paired.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i);
  const out: { name: string; role?: string; year?: string }[] = [...sponsorsInText(text)];
  const heading = (l: string) => l.length <= 60 && /\b(sponsors?|partners?)\b/i.test(l);
  for (let i = 0; i < lines.length; i++) {
    if (!heading(lines[i])) continue;
    const role = (lines[i].match(/\b((?:title|associate|co|powered|presenting|official|gold|silver|platinum|diamond|food|beverage|media|travel|banking|tech|gaming|apparel)\s*(?:sponsors?|partners?))\b/i)?.[1] || "").replace(/\b\w/g, (c) => c.toUpperCase()) || undefined;
    let taken = 0;
    for (let j = i + 1; j < lines.length && j <= i + 30; j++) {
      const l = lines[j];
      if (heading(l)) break;
      if (l.length > 40 || l.split(/\s+/).length > 4 || /[.!?]$/.test(l)) { if (taken) break; continue; }
      // Capitalised names, @handles, and camel-case brands that start lowercase (boAt, iQOO, mCaffeine).
      const n = /^[A-Z0-9@]|^[a-z]+[A-Z]/.test(l) ? cleanSponsorName(l.replace(/^@/, "")) : "";
      if (n) { out.push({ name: n, role }); taken++; }
    }
  }
  return out.filter((s, i) => out.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i);
}

/** The event's own website: the homepage, sponsor-looking links on it, and the usual sponsor paths. At most 6 pages.
 * When the plain read finds nothing (the site loads its sponsors with JavaScript, or blocks bots), the same pages are
 * read once more through Crustdata's rendered fetch, which sees them as a browser does. */
export async function fromWebsite(site: string, trace?: CD.Trace): Promise<{ sponsors: PastSponsor[]; checked: string[]; blocked: string[]; text: string }> {
  const direct = await fromWebsiteDirect(site);
  if (direct.sponsors.length || !CD.hasCrustdata()) return direct;
  let base: URL;
  try { base = new URL(site); } catch { return direct; }
  const urls = [site, ...SPONSOR_PATHS.slice(0, 4).map((p) => new URL(p, base).toString())];
  try {
    const pages = await CD.fetchRendered(urls, trace);
    const sponsors: PastSponsor[] = [];
    for (const p of pages) for (const s of sponsorsInPageText(p.content)) sponsors.push({ ...s, source: "website", url: p.url });
    const home = pages.find((p) => p.url.replace(/\/$/, "") === site.replace(/\/$/, "")) || pages[0];
    return {
      sponsors, checked: [...new Set([...direct.checked, ...pages.map((p) => p.url)])],
      blocked: pages.length ? [] : direct.blocked, text: direct.text || (home ? `${home.title}. ${home.content.slice(0, 4000)}` : ""),
    };
  } catch { return direct; }
}

async function fromWebsiteDirect(site: string): Promise<{ sponsors: PastSponsor[]; checked: string[]; blocked: string[]; text: string }> {
  const checked: string[] = [], blocked: string[] = [], sponsors: PastSponsor[] = [];
  const home = await fetchPage(site);
  if (!home) return { sponsors, checked, blocked: [site], text: "" };
  checked.push(home.url);
  const base = new URL(home.url);
  for (const s of sponsorsInHtml(home.html, false)) sponsors.push({ ...s, source: "website", url: home.url });
  const linked = [...home.html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)]
    .filter((m) => /sponsor|partner/i.test(m[1] + " " + textOf(m[2])))
    .map((m) => { try { return new URL(m[1], base).toString(); } catch { return ""; } })
    .filter((u) => u && new URL(u).hostname === base.hostname);
  const candidates = [...new Set([...linked, ...SPONSOR_PATHS.map((p) => new URL(p, base).toString())])].filter((u) => u.replace(/\/$/, "") !== home.url.replace(/\/$/, "")).slice(0, 5);
  const pages = await Promise.all(candidates.map((u) => fetchPage(u)));
  pages.forEach((p, i) => {
    if (!p) { if (i < linked.length) blocked.push(candidates[i]); return; }
    checked.push(p.url);
    for (const s of sponsorsInHtml(p.html, true)) sponsors.push({ ...s, source: "website", url: p.url });
  });
  const meta = (home.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] || "";
  const title = textOf((home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  return { sponsors, checked, blocked, text: `${title}. ${decode(meta)}. ${textOf(home.html).slice(0, 4000)}` };
}

/** Instagram, through public signals only: the profile page's link-preview description (follower count) and posts
 * that search engines indexed. The desk never works around Instagram's login wall or bot checks; reading an
 * organiser's own posts properly needs the official Instagram Graph API with their consent. */
export async function fromInstagram(handle: string, eventName: string, trace?: CD.Trace): Promise<{ sponsors: PastSponsor[]; followers?: number; checked: string[]; blocked: string[] }> {
  const checked: string[] = [], blocked: string[] = [], sponsors: PastSponsor[] = [];
  const profile = `https://www.instagram.com/${handle}/`;
  let followers: number | undefined;
  const page = await fetchPage(profile);
  const og = page ? decode((page.html.match(/<meta[^>]+(?:property|name)=["'](?:og:)?description["'][^>]+content=["']([^"']+)["']/i) || [])[1] || "") : "";
  const f = og.match(/([\d.,]+)\s*([KkMm])?\s+Followers/);
  if (f) {
    followers = Math.round(parseFloat(f[1].replace(/,/g, "")) * (/k/i.test(f[2] || "") ? 1e3 : /m/i.test(f[2] || "") ? 1e6 : 1));
    checked.push(profile);
  } else blocked.push(profile);
  if (CD.hasCrustdata()) {
    const q = `site:instagram.com ${handle} ${eventName.replace(/\b20\d{2}\b/, "").trim()} sponsor OR partner OR "powered by" OR "presented by"`;
    try {
      for (const h of await CD.webSearch(q.slice(0, 300), trace)) {
        if (!/instagram\.com/i.test(h.url)) continue;
        checked.push(h.url);
        for (const s of sponsorsInText(`${h.title}. ${h.snippet}`)) sponsors.push({ ...s, source: "instagram", url: h.url });
      }
    } catch { /* keep what we have */ }
  }
  return { sponsors, followers, checked, blocked };
}

/** Sponsor-focused web searches, beyond the general event search A0 already runs. */
export async function fromWebSearch(eventName: string, organiser: string, trace?: CD.Trace): Promise<{ sponsors: PastSponsor[]; checked: string[] }> {
  const checked: string[] = [], sponsors: PastSponsor[] = [];
  if (!CD.hasCrustdata() || !eventName) return { sponsors, checked };
  const bare = eventName.replace(/\b20\d{2}\b/, "").trim();
  const q = `"${bare}" ${organiser} "title sponsor" OR "powered by" OR "associate sponsor" OR "sponsors"`.slice(0, 300);
  try {
    const words = bare.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const h of await CD.webSearch(q, trace)) {
      const t = `${h.title}. ${h.snippet}`;
      if (!words.every((w) => t.toLowerCase().includes(w) || h.url.toLowerCase().includes(w))) continue;
      checked.push(h.url);
      for (const s of sponsorsInText(t)) sponsors.push({ ...s, source: "web", url: h.url });
    }
  } catch { /* keep what we have */ }
  return { sponsors, checked };
}

/** One list, one entry per brand: the organiser's own names first, then website, Instagram, web. Drops the event itself. */
export function mergeSponsors(list: PastSponsor[], exclude: string[] = []) {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ex = exclude.map(key).filter((k) => k.length >= 3);
  const order = { organiser: 0, website: 1, instagram: 2, web: 3 } as const;
  const out: PastSponsor[] = [];
  for (const s of [...list].sort((a, b) => order[a.source] - order[b.source])) {
    const k = key(s.name);
    if (k.length < 2 || ex.some((e) => k === e || k.includes(e) || e.includes(k))) continue;
    const prev = out.find((x) => key(x.name) === k);
    if (prev) { prev.role ||= s.role; prev.year ||= s.year; continue; }
    out.push({ ...s });
  }
  return out.slice(0, 80); // big events list 70+ partners (Mood Indigo), and each one shows the level to aim for
}

/** Everything at once: website, Instagram and the sponsor web search run in parallel. `texts` are pages A0 already
 * read (web results), scanned for sponsor mentions at no extra cost. */
export type SiteRead = Awaited<ReturnType<typeof fromWebsite>>;
export async function collectPastSponsors(o: { website?: string; instagram?: string; known?: string[]; eventName: string; organiser: string; texts?: { text: string; url: string }[]; trace?: CD.Trace; webSearch?: boolean; siteRead?: SiteRead | null }): Promise<PastSponsorReport> {
  const website = normaliseWebsite(o.website);
  // A connected Instagram account (official API, organiser's consent) beats every public signal: its own captions.
  const own = await IG.ownPosts().catch(() => null);
  const instagram = normaliseInstagram(o.instagram) || own?.handle || "";
  const [site, insta, web] = await Promise.all([
    o.siteRead ? Promise.resolve(o.siteRead) : website ? fromWebsite(website, o.trace) : Promise.resolve(null),
    instagram && !own ? fromInstagram(instagram, o.eventName, o.trace) : Promise.resolve(null),
    o.webSearch === false ? Promise.resolve(null) : fromWebSearch(o.eventName, o.organiser, o.trace),
  ]);
  const all: PastSponsor[] = [
    ...(o.known || []).map((n) => cleanSponsorName(n) || String(n).trim()).filter(Boolean).map((name) => ({ name, source: "organiser" as const })),
    ...(site?.sponsors || []), ...(own ? IG.sponsorsFromPosts(own.posts) : []), ...(insta?.sponsors || []), ...(web?.sponsors || []),
    ...(o.texts || []).flatMap((t) => sponsorsInText(t.text).map((s) => ({ ...s, source: "web" as const, url: t.url }))),
  ];
  const exclude = [o.eventName.replace(/\b20\d{2}\b/, "").trim(), o.organiser, instagram];
  return {
    sponsors: mergeSponsors(all, exclude), website: website || undefined, instagram: instagram || undefined, followers: own?.followers ?? insta?.followers,
    checked: [...new Set([...(site?.checked || []), ...(own ? [`https://www.instagram.com/${own.handle}/ (${own.posts.length} posts, connected)`] : []), ...(insta?.checked || []), ...(web?.checked || [])])],
    blocked: [...new Set([...(site?.blocked || []), ...(insta?.blocked || [])])],
  };
}

/** What to tell the organiser when the list is thin: which link would help most. */
export function linkHint(r: { website?: string; instagram?: string; sponsors: PastSponsor[]; blocked?: string[] }) {
  if (r.sponsors.length >= 3) return "";
  const missing = [!r.website && "your website", !r.instagram && "your Instagram"].filter(Boolean);
  if (missing.length) return `Add ${missing.join(" and ")}, or type the names you know.`;
  if (r.blocked?.length) return "Your website or Instagram could not be read. Type the past sponsors you know.";
  return "No sponsor list found. Type the past sponsors you know.";
}

export function describeSponsors(list: PastSponsor[]) {
  const label = { organiser: "from you", website: "event website", instagram: "Instagram", web: "web results" } as const;
  return list.map((s) => `${s.name}${s.role || s.year ? ` (${[s.role, s.year].filter(Boolean).join(", ")})` : ""}`).join("; ") +
    ` (${[...new Set(list.map((s) => label[s.source]))].join(", ")})`;
}
