// Starts "Connect Instagram": a one-time state bound to this session, valid 10 minutes.
import { randomToken, requireUser, sha256 } from "@/lib/auth";
import { hasInstagramApp, instagramAuthUrl } from "@/lib/instagram";

export async function GET(req: Request) {
  const r = await requireUser(req, "operator");
  if (r.res) return r.res;
  const origin = new URL(req.url).origin;
  if (!hasInstagramApp()) return new Response(null, { status: 302, headers: { location: `${origin}/desk/brief?instagram=${encodeURIComponent("Instagram is not set up yet: add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in Vercel.")}` } });
  const state = randomToken(24);
  const bind = (await sha256(r.user.session)).slice(0, 24);
  const exp = Date.now() + 10 * 60 * 1000;
  const cookie = `sd_ig=${state}.${exp}.${bind}; Path=/api/instagram; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, { status: 302, headers: { location: instagramAuthUrl(origin, state), "set-cookie": cookie } });
}
