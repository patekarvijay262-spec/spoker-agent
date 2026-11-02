// Starts "Sign in with Google". No session exists yet (the visitor is not signed in), so the one-time state and
// PKCE verifier are bound to a short-lived cookie instead of a user's session, valid 10 minutes.
import { randomToken } from "@/lib/auth";
import { hasGoogleLogin, loginAuthUrl } from "@/lib/google-login";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!hasGoogleLogin()) return new Response(null, { status: 302, headers: { location: `${url.origin}/login?error=${encodeURIComponent("Google sign-in is not set up yet. An admin needs to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, or use a password instead.")}` } });
  const nextRaw = url.searchParams.get("next") || "/desk?resume=1";
  const next = nextRaw.startsWith("/") ? nextRaw : "/desk";
  const state = randomToken(24), verifier = randomToken(48);
  const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  const exp = Date.now() + 10 * 60 * 1000;
  const cookie = `sd_login=${state}.${verifier}.${exp}.${encodeURIComponent(next)}; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, { status: 302, headers: { location: loginAuthUrl(url.origin, state, challenge), "set-cookie": cookie } });
}
