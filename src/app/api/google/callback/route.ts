// Finishes Google OAuth. The state must match the one-time cookie for this session and not be expired; the cookie is
// cleared on every outcome, so a replayed callback fails.
import { audit, requireUser, runAs, safeEqual, sha256 } from "@/lib/auth";
import { exchange } from "@/lib/gmail";
import { log } from "@/lib/ledger";

const CLEAR = "sd_oauth=; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const go = (to: string) => new Response(null, { status: 302, headers: { location: to, "set-cookie": CLEAR } });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const r = await requireUser(req, "admin");
  if (r.res) return go(`${url.origin}/?gmail=${encodeURIComponent("sign in as an admin, then connect again")}`);
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((p) => p.startsWith("sd_oauth="))?.slice(9) || "";
  const [state, verifier, exp, bind] = decodeURIComponent(raw).split(".");
  const code = url.searchParams.get("code");
  const got = url.searchParams.get("state") || "";
  if (url.searchParams.get("error")) return go(`${url.origin}/?gmail=${encodeURIComponent("Google: " + url.searchParams.get("error"))}`);
  const okState = !!state && safeEqual(got, state) && Number(exp) > Date.now() && bind === (await sha256(r.user.session)).slice(0, 24);
  if (!code || !okState) return go(`${url.origin}/?gmail=${encodeURIComponent("connection expired or invalid; try Connect Google again")}`);
  const user = r.user;
  try {
    // The refresh token is stored in this user's own workspace: each desk sends from its own mailbox.
    await runAs(user, async () => {
      const email = await exchange(code, url.origin, verifier);
      await log(user.name, null, "gmail_connected", email);
      await audit(user, "google_connect", { email });
    });
    return go(`${url.origin}/?gmail=connected`);
  } catch (e: any) {
    return go(`${url.origin}/?gmail=${encodeURIComponent(e.message.slice(0, 120))}`);
  }
}
