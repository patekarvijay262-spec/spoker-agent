"use client";

import { Suspense, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/components/desk/format";

function GoogleG() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.49c2.04-1.88 3.22-4.65 3.22-7.93z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.49-3c-.97.65-2.2 1.03-4.44 1.03-3.42 0-6.32-2.3-7.36-5.4H.9v3.09C2.87 21.3 7.1 24 12 24z" />
      <path fill="#FBBC05" d="M4.64 13.73a7.3 7.3 0 0 1 0-4.68V6h-3.74a11.96 11.96 0 0 0 0 10.82l3.74-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.1-3.1C17.95 1.47 15.24.36 12 .36 7.1.36 2.87 3.06.9 6.91l3.74 3.14c1.04-3.1 3.94-5.3 7.36-5.3z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/desk?resume=1";
  const googleError = sp.get("error") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(googleError);
  const [wait, setWait] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setWait(true); setErr("");
    try { await api("/api/login", { email, password }); router.replace(next.startsWith("/") ? next : "/desk"); }
    catch (x: any) { setErr(x.message); }
    finally { setWait(false); }
  }
  return (
    <div className="space-y-4">
      <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} />}>
        <GoogleG />Continue with Google
      </Button>
      {err && <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive" role="alert">{err}</p>}
      {!showPassword ? (
        <button type="button" onClick={() => setShowPassword(true)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          Use a password instead
        </button>
      ) : (
        <form onSubmit={go} className="space-y-4 pt-2">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required /></div>
          <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" size="lg" className="w-full" disabled={wait || !email || !password}>{wait ? "Signing in…" : "Sign in"}</Button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-md bg-primary text-lg font-semibold text-primary-foreground">S</div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to SponsorDesk</h1>
            <p className="text-sm text-muted-foreground">Sponsorship agents for your event</p>
          </div>
        </div>
        <Suspense><LoginForm /></Suspense>
        <p className="text-center text-xs text-muted-foreground">Anyone with a Google account can join. An admin sets your role.</p>
      </div>
    </main>
  );
}
