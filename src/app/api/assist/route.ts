// Desk assistant: answers questions from the desk's live state. Works without any AI key.
import { wrap } from "@/lib/http";
import { assist, type Turn } from "@/lib/assistant";

export const dynamic = "force-dynamic";

const LANG = /^[a-z]{2}-IN$/;

export const POST = wrap(async (req) => {
  const b = await req.json().catch(() => ({}));
  const history: Turn[] = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter((t: any) => t && (t.role === "user" || t.role === "assistant"))
    .map((t: any) => ({ role: t.role, text: String(t.text || "").slice(0, 600) }));
  const replyLang = LANG.test(String(b.replyLang || "")) ? String(b.replyLang) : "";
  return assist(String(b.message || "").slice(0, 1000), String(b.path || ""), String(b.lang || ""), replyLang, history);
});
