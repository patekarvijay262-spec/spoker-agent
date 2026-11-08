// The organiser's deck: uploaded in pieces of about 3 MB (Vercel caps a request at 4.5 MB), then made the deck that
// goes with every first email. Operators and above.
import { wrap } from "@/lib/http";
import { audit } from "@/lib/auth";
import * as FL from "@/lib/files";

export const dynamic = "force-dynamic";

export const POST = wrap(async (req, user) => {
  const b = await req.json().catch(() => ({}));
  switch (b.op) {
    case "start": return FL.startUpload(String(b.name || ""), Number(b.size) || 0);
    case "chunk": return FL.putChunk(String(b.id || ""), Math.max(0, Math.round(Number(b.idx) || 0)), String(b.data || ""));
    case "finish": { const deck = await FL.finishUpload(String(b.id || ""), new URL(req.url).origin); await audit(user, "deck_uploaded", { name: deck.name, size: deck.size }); return deck; }
    case "mode": return FL.setDeckMode(b.mode === "link" ? "link" : "attach");
    case "remove": return FL.removeDeck();
    default: throw new Error("unknown op");
  }
}, { role: "operator" });
