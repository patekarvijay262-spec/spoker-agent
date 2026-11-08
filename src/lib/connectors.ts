// Connectors: each desk can plug in its own services (Apollo, Crustdata, Gemini, Claude) with its own API key, no
// Vercel access needed. Keys are stored encrypted per desk (same sealing as Gmail tokens) and fall back to the
// site-wide key in the environment. Gmail, Calendar and Instagram connect by sign-in instead (OAuth).
import { getSetting, setSetting, workspaceId } from "./db";
import { openSecret, sealSecret } from "./auth";

export type KeyConnector = { id: "apollo" | "crustdata" | "gemini" | "claude"; name: string; what: string; env: string; getKeyUrl: string; hint: string };

export const KEY_CONNECTORS: KeyConnector[] = [
  { id: "crustdata", name: "Crustdata", what: "Finds companies, people and verified work emails. The desk's main data source.", env: "CRUSTDATA_API_KEY", getKeyUrl: "https://crustdata.com", hint: "API key from your Crustdata dashboard" },
  { id: "apollo", name: "Apollo", what: "A second source of verified emails and phone numbers, used when Crustdata finds too few people.", env: "APOLLO_API_KEY", getKeyUrl: "https://app.apollo.io/#/settings/integrations/api", hint: "Apollo → Settings → Integrations → API" },
  { id: "claude", name: "Claude", what: "Gives the Ask bot fuller answers to open questions: sponsorship advice, wording, anything off the usual list.", env: "ANTHROPIC_API_KEY", getKeyUrl: "https://console.anthropic.com/settings/keys", hint: "Starts with sk-ant-, from console.anthropic.com" },
  { id: "gemini", name: "Gemini", what: "Another choice of AI for the Ask bot's open questions.", env: "GEMINI_API_KEY", getKeyUrl: "https://aistudio.google.com/app/apikey", hint: "From Google AI Studio" },
];

// Per desk, loaded once per request (load() in the request wrapper and cron loops), read synchronously after.
const cache = new Map<string, { at: number; keys: Record<string, string> }>();

export async function loadConnectorKeys() {
  const ws = workspaceId();
  const hit = cache.get(ws);
  if (hit && Date.now() - hit.at < 60_000) return;
  const keys: Record<string, string> = {};
  for (const c of KEY_CONNECTORS) {
    const stored = await getSetting(`connector_${c.id}`, "").catch(() => "");
    if (stored) keys[c.id] = await openSecret(stored).catch(() => "");
  }
  cache.set(ws, { at: Date.now(), keys });
}

/** The key to use: this desk's own, else the site-wide one from the environment. */
export function connectorKey(id: KeyConnector["id"]) {
  let ws = "";
  try { ws = workspaceId(); } catch { /* outside a request: environment only */ }
  return cache.get(ws)?.keys[id] || process.env[KEY_CONNECTORS.find((c) => c.id === id)!.env] || "";
}

/** Which key is in use, for the Connectors page. Never returns the key itself. */
export async function connectorStatus() {
  await loadConnectorKeys();
  const own = cache.get(workspaceId())?.keys || {};
  return KEY_CONNECTORS.map((c) => ({
    id: c.id, name: c.name, what: c.what, getKeyUrl: c.getKeyUrl, hint: c.hint,
    source: own[c.id] ? "yours" : process.env[c.env] ? "shared" : "none",
    ending: own[c.id] ? own[c.id].slice(-4) : "",
  }));
}

/** Checks a key with one small call before saving it, so a typo never silently breaks searches. */
async function test(id: KeyConnector["id"], key: string) {
  const ok = async (res: Response) => { if (!res.ok) throw new Error(`${KEY_CONNECTORS.find((c) => c.id === id)!.name} did not accept this key (${res.status}).`); };
  const t = AbortSignal.timeout(15000);
  if (id === "crustdata") await ok(await fetch("https://api.crustdata.com/account/credits", { headers: { authorization: `Bearer ${key}`, "x-api-version": "2025-11-01" }, signal: t }));
  if (id === "apollo") await ok(await fetch("https://api.apollo.io/api/v1/auth/health", { headers: { "x-api-key": key }, signal: t }));
  if (id === "gemini") await ok(await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: t }));
  if (id === "claude") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    try { await new Anthropic({ apiKey: key, timeout: 15000, maxRetries: 0 }).models.list({ limit: 1 }); }
    catch (e) { if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new Error("Claude did not accept this key."); throw e; }
  }
}

export async function saveConnectorKey(id: string, key: string) {
  const c = KEY_CONNECTORS.find((x) => x.id === id);
  if (!c) throw new Error("Unknown connector.");
  const k = String(key || "").trim();
  if (k.length < 8 || /\s/.test(k)) throw new Error("That does not look like an API key.");
  await test(c.id, k);
  await setSetting(`connector_${c.id}`, await sealSecret(k));
  cache.delete(workspaceId());
  return { ok: true, ending: k.slice(-4) };
}

export async function removeConnectorKey(id: string) {
  if (!KEY_CONNECTORS.some((x) => x.id === id)) throw new Error("Unknown connector.");
  await setSetting(`connector_${id}`, "");
  cache.delete(workspaceId());
  return { ok: true };
}

// ---------- Any other tool (Canva, Google Drive, Notion, HubSpot...) ----------
// Saved per desk so the whole team finds them in one place. A key, if given, is stored encrypted and never shown
// again. A design link (Canva, Google Slides, Drive) can be made the deck that goes with every first email.
export type Tool = { id: string; name: string; url: string; note: string; has_key: boolean; added_at: string };
export const TOOL_SUGGESTIONS = ["Canva", "Google Drive", "Google Slides", "Notion", "HubSpot", "Zoho CRM", "Slack", "WhatsApp Business", "Airtable", "Trello"];

async function readTools(): Promise<(Tool & { key?: string })[]> {
  try { return JSON.parse((await getSetting("custom_tools", "")) || "[]"); } catch { return []; }
}

export async function listTools(): Promise<Tool[]> {
  return (await readTools()).map(({ key, ...t }) => ({ ...t, has_key: !!key }));
}

export async function addTool(o: { name: string; url?: string; key?: string; note?: string }) {
  const name = String(o.name || "").replace(/[\r\n<>]/g, "").trim().slice(0, 60);
  if (!name) throw new Error("Give the tool a name, for example Canva.");
  const url = String(o.url || "").trim();
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) throw new Error("The link must start with https://");
  const list = await readTools();
  const tool = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, url, note: String(o.note || "").slice(0, 200), has_key: !!o.key, added_at: new Date().toISOString(), ...(o.key ? { key: await sealSecret(String(o.key).trim()) } : {}) };
  list.push(tool);
  await setSetting("custom_tools", JSON.stringify(list.slice(-40)));
  return { ok: true, id: tool.id };
}

export async function removeTool(id: string) {
  await setSetting("custom_tools", JSON.stringify((await readTools()).filter((t) => t.id !== id)));
  return { ok: true };
}
