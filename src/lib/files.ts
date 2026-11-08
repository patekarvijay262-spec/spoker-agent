// The organiser's own deck (PPT, PPTX or PDF): uploaded once on the Draft page, then attached to every first email
// (or shared as a link, if the organiser prefers). Stored in base64 pieces in the desk's own database.
import { db, getSetting, json, nowIso, registerPublicLink, setSetting, uid } from "./db";

export const DECK_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const MAX_DECK = 15 * 1024 * 1024; // Gmail allows 25 MB per email; base64 adds a third
export type Deck = { id: string; name: string; mime: string; size: number; mode: "attach" | "link"; url?: string };

/** A deck that lives elsewhere (Canva, Google Slides, Drive): sent as a link in every first email. */
export async function setDeckLink(url: string, name = "") {
  const u = String(url || "").trim();
  if (!/^https:\/\/\S+$/i.test(u)) throw new Error("Paste the share link of your deck (it starts with https://).");
  const old = await currentDeck();
  if (old && !old.url) await removeFile(old.id);
  const deck: Deck = { id: "link", name: name || new URL(u).hostname.replace(/^www\./, ""), mime: "", size: 0, mode: "link", url: u };
  await setSetting("outreach_deck", JSON.stringify(deck));
  return deck;
}

export async function currentDeck(): Promise<Deck | null> {
  return json<Deck | null>(await getSetting("outreach_deck", ""), null);
}

export async function startUpload(name: string, size: number) {
  const ext = String(name).toLowerCase().split(".").pop() || "";
  if (!DECK_TYPES[ext]) throw new Error("Upload a PDF or a PowerPoint (.ppt or .pptx).");
  if (!(size > 0) || size > MAX_DECK) throw new Error("The deck must be under 15 MB so it fits in an email. Export it as a PDF to make it smaller.");
  const id = uid() + uid(); // also the public link token, so it must not be guessable
  await (await db()).q(`INSERT INTO files (id, name, mime, size, chunks, created_at) VALUES ($1,$2,$3,$4,0,$5)`, [id, String(name).replace(/[\r\n"]/g, "").slice(0, 120), DECK_TYPES[ext], size, nowIso()]);
  return { id };
}

export async function putChunk(id: string, idx: number, data: string) {
  if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 4_000_000) throw new Error("That piece of the file was not readable.");
  const d = await db();
  if (!(await d.q(`SELECT 1 FROM files WHERE id=$1`, [id])).length) throw new Error("Unknown upload.");
  await d.q(`INSERT INTO file_chunks (file_id, idx, data) VALUES ($1,$2,$3) ON CONFLICT (file_id, idx) DO UPDATE SET data=excluded.data`, [id, idx, data]);
  return { ok: true };
}

/** Checks every piece arrived, makes it the deck for outreach and removes the previous one. */
export async function finishUpload(id: string, origin: string) {
  const d = await db();
  const f = (await d.q(`SELECT * FROM files WHERE id=$1`, [id]))[0];
  if (!f) throw new Error("Unknown upload.");
  const bytes = (await readFile(id)).length;
  if (Math.abs(bytes - Number(f.size)) > 4) throw new Error("The upload did not finish. Try again.");
  const old = await currentDeck();
  if (old && old.id !== id) await removeFile(old.id);
  await registerPublicLink(id, "file");
  if (/^https?:\/\//.test(origin)) await setSetting("public_origin", origin);
  const deck: Deck = { id, name: f.name, mime: f.mime, size: Number(f.size), mode: old?.mode || "attach" };
  await setSetting("outreach_deck", JSON.stringify(deck));
  return deck;
}

export async function setDeckMode(mode: "attach" | "link") {
  const deck = await currentDeck();
  if (!deck) throw new Error("Upload your deck first.");
  if (deck.url) throw new Error("A deck from a link can only be shared as a link.");
  await setSetting("outreach_deck", JSON.stringify({ ...deck, mode: mode === "link" ? "link" : "attach" }));
  return { ok: true };
}

export async function removeDeck() {
  const deck = await currentDeck();
  if (deck && !deck.url) await removeFile(deck.id);
  await setSetting("outreach_deck", "");
  return { ok: true };
}

async function removeFile(id: string) {
  const d = await db();
  await d.q(`DELETE FROM file_chunks WHERE file_id=$1`, [id]);
  await d.q(`DELETE FROM files WHERE id=$1`, [id]);
}

export async function readFile(id: string): Promise<Buffer> {
  const rows = await (await db()).q(`SELECT data FROM file_chunks WHERE file_id=$1 ORDER BY idx`, [id]);
  return Buffer.concat(rows.map((r) => Buffer.from(String(r.data), "base64")));
}

export async function fileMeta(id: string) {
  return (await (await db()).q(`SELECT id, name, mime, size FROM files WHERE id=$1`, [id]))[0] || null;
}

/** The public link to the deck, for link mode: /f/<id> on the address the deck was uploaded from. */
export async function deckLink(deck: Deck) {
  if (deck.url) return deck.url;
  const origin = await getSetting("public_origin", process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return origin ? `${origin}/f/${deck.id}` : "";
}
