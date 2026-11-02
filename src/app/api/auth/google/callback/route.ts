// Finishes "Sign in with Google". The state must match the one-time cookie and not be expired; the cookie is
// cleared on every outcome, so a replayed callback fails. On success this creates the account on first sign-in
// (see lib/auth.googleLogin) and sets the normal session cookie, exactly like the password login.
import { clientAgent, clientIp, googleLogin, recordAuth, safeEqual } from "@/lib/auth";
import { verifyLogin } from "@/lib/google-login";

const CLEAR = "sd_login=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

function fail(origin: string, message: string) {
  const headers = new Headers({ location: `${origin}/login?error=${encodeURIComponent(message)}` });
  headers.append("set-cookie", CLEAR);
  return new Response(null, { status: 302, headers });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return fail(url.origin, "Google: " + url.searchParams.get("error"));
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((p) => p.startsWith("sd_login="))?.slice(9) || "";
  const [state, verifier, exp, nextEnc] = decodeURIComponent(raw).split(".");
  const next = nextEnc ? decodeURIComponent(nextEnc) : "/desk";
  const code = url.searchParams.get("code");
  const got = url.searchParams.get("state") || "";
  const okState = !!state && safeEqual(got, state) && Number(exp) > Date.now();
  if (!code || !okState) return fail(url.origin, "Sign-in expired or invalid. Try again.");
  try {
    const identity = await verifyLogin(code, url.origin, verifier);
    const r = await googleLogin(identity.email, identity.name, { ip: clientIp(req), ua: clientAgent(req) });
    if (!r.cookie) return fail(url.origin, r.error || "Sign-in failed.");
    const headers = new Headers({ location: `${url.origin}${next}` });
    headers.append("set-cookie", CLEAR);
    headers.append("set-cookie", r.cookie);
    return new Response(null, { status: 302, headers });
  } catch (e: any) {
    await recordAuth({ email: "", method: "google", ok: false, ip: clientIp(req), ua: clientAgent(req), detail: String(e?.message || e) });
    return fail(url.origin, String(e?.message || e).slice(0, 160));
  }
}
