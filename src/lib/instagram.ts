// Instagram, the official way (Instagram API with Instagram Login, scope instagram_business_basic). The organiser
// connects their own Professional (Business or Creator) account and approves read-only access on Instagram's screen;
// the desk then reads that account's own captions for sponsor shout-outs. Nothing is posted, and nothing is read
// from accounts that did not connect. The token lives encrypted in the connecting desk's own settings.
import { openSecret, sealSecret } from "./auth";
import { getSetting, setSetting } from "./db";
import { cleanSponsorName, handleToName, type PastSponsor, sponsorsInText } from "./past-sponsors";

const GRAPH = "https://graph.instagram.com";
const VERSION = "v22.0";

export function hasInstagramApp() { return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET); }
const redirectUri = (origin: string) => `${origin}/api/instagram/callback`;

export function instagramAuthUrl(origin: string, state: string) {
  const p = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID || "", redirect_uri: redirectUri(origin), response_type: "code", scope: "instagram_business_basic", state });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Instagram: ${j.error?.message || j.error_message || j.error_description || res.status}`);
  return j;
}

/** Code → short-lived token → 60-day token; stores it with the handle and follower count. Returns the handle. */
export async function connectInstagram(code: string, origin: string) {
  const form = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID || "", client_secret: process.env.INSTAGRAM_APP_SECRET || "", grant_type: "authorization_code", redirect_uri: redirectUri(origin), code });
  const short = await getJson("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const shortToken = short.access_token || short.data?.[0]?.access_token;
  if (!shortToken) throw new Error("Instagram did not return an access token.");
  const long = await getJson(`${GRAPH}/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: process.env.INSTAGRAM_APP_SECRET || "", access_token: shortToken })}`);
  await saveToken(long.access_token, Number(long.expires_in || 5184000));
  const me = await getJson(`${GRAPH}/${VERSION}/me?${new URLSearchParams({ fields: "user_id,username,followers_count,media_count", access_token: long.access_token })}`);
  await setSetting("instagram_handle", String(me.username || ""));
  await setSetting("instagram_followers", String(me.followers_count ?? ""));
  return String(me.username || "");
}

async function saveToken(token: string, expiresIn: number) {
  await setSetting("instagram_token", await sealSecret(token));
  await setSetting("instagram_token_expires", new Date(Date.now() + expiresIn * 1000).toISOString());
}

export async function instagramStatus() {
  const handle = await getSetting("instagram_handle", "");
  return { app: hasInstagramApp(), connected: !!(await getSetting("instagram_token", "")), handle, followers: Number(await getSetting("instagram_followers", "")) || null };
}

export async function disconnectInstagram() {
  for (const k of ["instagram_token", "instagram_token_expires", "instagram_handle", "instagram_followers"]) await setSetting(k, "");
}

/** A valid token for this desk, refreshed when it has less than a week left (long-lived tokens last 60 days). */
async function token(): Promise<string | null> {
  const stored = await getSetting("instagram_token", "");
  if (!stored) return null;
  let t = await openSecret(stored);
  const exp = new Date(await getSetting("instagram_token_expires", "")).getTime();
  if (exp && exp < Date.now()) { await disconnectInstagram(); return null; }
  if (exp && exp - Date.now() < 7 * 86400e3) {
    try {
      const r = await getJson(`${GRAPH}/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: t })}`);
      t = r.access_token; await saveToken(t, Number(r.expires_in || 5184000));
    } catch { /* still valid for now */ }
  }
  return t;
}

export type Post = { caption: string; permalink: string; timestamp: string };

/** Sponsor names in the account's own captions: shout-out phrases, and @handles near sponsor words. */
export function sponsorsFromPosts(posts: Post[]): PastSponsor[] {
  const out: PastSponsor[] = [];
  for (const p of posts) {
    const cap = String(p.caption || "");
    if (!/sponsor|partner|powered|presented|thank|associat|collab|title|brought to you/i.test(cap)) continue;
    const year = p.timestamp?.slice(0, 4) || undefined;
    for (const s of sponsorsInText(cap)) out.push({ ...s, year: s.year || year, source: "instagram", url: p.permalink });
    // "Our Title Sponsor @redbullindia", "powered by @boat.nirvana": the handle right after a sponsor word.
    for (const m of cap.matchAll(/\b((?:title|associate|co|powered|presenting|official|food|beverage|travel|banking|tech|gaming|media)?\s*(?:sponsor|partner)s?|powered by|presented by|in association with)\b[^@\n]{0,40}?((?:@[A-Za-z0-9._]{3,30}[\s,&]*(?:and\s+)?)+)/gi)) {
      const role = /sponsor|partner/i.test(m[1]) ? m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;
      for (const h of m[2].match(/@[A-Za-z0-9._]{3,30}/g) || []) {
        const name = cleanSponsorName(handleToName(h));
        if (name) out.push({ name, role, year, source: "instagram", url: p.permalink });
      }
    }
  }
  return out;
}

/** The connected account's own posts from the last two years (at most 300), newest first. Empty when not connected. */
export async function ownPosts(): Promise<{ posts: Post[]; followers: number | null; handle: string } | null> {
  const t = await token();
  if (!t) return null;
  const since = Date.now() - 2 * 365 * 86400e3;
  const posts: Post[] = [];
  let url: string | null = `${GRAPH}/${VERSION}/me/media?${new URLSearchParams({ fields: "caption,permalink,timestamp", limit: "100", access_token: t })}`;
  for (let page = 0; url && page < 3; page++) {
    const j: any = await getJson(url);
    for (const m of j.data || []) posts.push({ caption: String(m.caption || ""), permalink: String(m.permalink || ""), timestamp: String(m.timestamp || "") });
    const last = posts[posts.length - 1];
    url = last && new Date(last.timestamp).getTime() < since ? null : j.paging?.next || null;
  }
  let followers: number | null = null;
  try { const me = await getJson(`${GRAPH}/${VERSION}/me?${new URLSearchParams({ fields: "username,followers_count", access_token: t })}`); followers = Number(me.followers_count ?? NaN) || null; if (followers) await setSetting("instagram_followers", String(followers)); } catch { /* keep the stored count */ }
  return { posts: posts.filter((p) => !p.timestamp || new Date(p.timestamp).getTime() >= since), followers, handle: await getSetting("instagram_handle", "") };
}
