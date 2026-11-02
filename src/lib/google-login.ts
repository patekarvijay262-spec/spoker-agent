// "Sign in with Google" for the desk itself: anyone with a Google account can create an account, no shared team
// password. Separate from lib/gmail.ts, which later connects the team's own mailbox for sending; this only confirms
// who is signing in, with the smallest scope (openid, email, profile) and no refresh token kept.
import { hasGoogleLogin } from "./auth";

export { hasGoogleLogin };

export function loginAuthUrl(origin: string, state: string, challenge: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "", redirect_uri: `${origin}/api/auth/google/callback`, response_type: "code",
    scope: "openid email profile", access_type: "online", prompt: "select_account", state,
    code_challenge: challenge, code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Exchanges the code and returns the verified identity. The id_token's signature, audience and expiry are checked
 * through Google's own tokeninfo endpoint, so a sign-in needs no JWKS library: Google either hands back the claims
 * or an error. Fine for a login flow's volume; lib/gmail keeps its own separate client credentials flow for mail. */
export async function verifyLogin(code: string, origin: string, verifier: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", redirect_uri: `${origin}/api/auth/google/callback`, grant_type: "authorization_code", code_verifier: verifier }),
    signal: AbortSignal.timeout(15000),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Google sign-in failed: " + (j.error_description || j.error || res.status));
  const idToken = j.id_token;
  if (!idToken) throw new Error("Google did not return an identity token.");
  const info: any = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { signal: AbortSignal.timeout(15000) })).json().catch(() => ({ error: "could not reach Google" }));
  if (info.error) throw new Error("Google identity token could not be verified: " + info.error);
  if (info.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("That identity token was not issued for this app.");
  if (info.email_verified !== "true" && info.email_verified !== true) throw new Error("Your Google account's email is not verified.");
  return { email: String(info.email || "").toLowerCase(), name: String(info.name || info.given_name || "") };
}
