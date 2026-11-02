// Finishes "Connect Instagram". The state must match the one-time cookie for this session and not be expired; the
// cookie is cleared on every outcome, so a replayed callback fails. The token is saved in this user's own desk.
import { audit, requireUser, runAs, safeEqual, sha256 } from "@/lib/auth";
import { connectInstagram } from "@/lib/instagram";
import { log } from "@/lib/ledger";

const CLEAR = "sd_ig=; Path=/api/instagram; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const go = (to: string) => new Response(null, { status: 302, headers: { location: to, "set-cookie": CLEAR } });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (msg: string) => go(`${url.origin}/desk/brief?instagram=${encodeURIComponent(msg)}`);
  const r = await requireUser(req, "operator");
  if (r.res) return back("Sign in, then connect Instagram again.");
  if (url.searchParams.get("error")) return back(`Instagram: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`);
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((p) => p.startsWith("sd_ig="))?.slice(6) || "";
  const [state, exp, bind] = decodeURIComponent(raw).split(".");
  const code = (url.searchParams.get("code") || "").replace(/#_$/, ""); // Instagram appends "#_" to the code
  const ok = !!state && safeEqual(url.searchParams.get("state") || "", state) && Number(exp) > Date.now() && bind === (await sha256(r.user.session)).slice(0, 24);
  if (!code || !ok) return back("The connection expired. Try Connect Instagram again.");
  const user = r.user;
  try {
    const handle = await runAs(user, async () => {
      const h = await connectInstagram(code, url.origin);
      await log(user.name, null, "instagram_connected", `@${h}`);
      await audit(user, "instagram_connect", { handle: h });
      return h;
    });
    return back(`connected:${handle}`);
  } catch (e: any) {
    return back(String(e?.message || e).slice(0, 160));
  }
}
