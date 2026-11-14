// Public home page. Google's app verification needs a home page that says what the app does and links its privacy
// policy, reachable without signing in. Signed-in people go straight to their desk from here.
import type { Metadata } from "next";

import Link from "next/link";

import { Explainer, WatchButton } from "@/components/explainer";

export const metadata: Metadata = {
  title: "SponsorDesk · Your sponsorship employee",
  description: "SponsorDesk helps college fests, conferences and event teams find the right sponsors, write to them and close deals.",
};

const STEPS = [
  ["Plan", "Tell Max the size of your event and the budget you want to raise. Max prices four sponsor tiers to match."],
  ["Find", "Max finds companies that fit, with verified work emails, phone numbers and LinkedIn for the people who decide."],
  ["Reach", "Write your email once. Max fits it to every company and person, attaches your deck, and waits for your yes."],
  ["Close", "Replies, meetings, MOUs and sponsor updates, tracked. One short list each morning tells you what needs you."],
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">S</span>SponsorDesk
        </div>
        <nav className="flex items-center gap-1.5">
          <Link href="/guide" className="rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground"><span className="sm:hidden">Guide</span><span className="hidden sm:inline">Sponsorship guide</span></Link>
          <Link href="/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium whitespace-nowrap text-background">Sign in</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 pb-12 md:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <h1 className="max-w-2xl text-[2rem] leading-tight font-bold tracking-tight text-balance md:text-[2.75rem]">Hire a sponsorship employee for your event</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">Meet Max. Tell Max the size of your event and the budget you need, and Max finds the right sponsors, reaches the people who decide and keeps every deal on track. You just say yes.</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/login" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Start with Google</Link>
              <WatchButton />
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-2.5 shadow-sm"><Explainer startMuted /></div>
        </div>
      </section>

      <h2 className="mx-auto max-w-5xl px-4 pb-3 text-xl font-bold tracking-tight">Max works in four stages</h2>
      <section id="how" className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-4 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border bg-card p-4">
            <span className="grid size-6 place-items-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background">{i + 1}</span>
            <h2 className="mt-3 font-semibold tracking-tight">{t}</h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <Link href="/guide" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-white transition hover:opacity-95" style={{ background: "linear-gradient(135deg, #ff4f8b, #7c4dff)" }}>
          <div><div className="text-xs font-semibold tracking-wider uppercase opacity-80">Free booklet</div><div className="text-lg font-bold tracking-tight">The Sponsorship Playbook</div><p className="text-sm opacity-90">How to prepare for sponsors, find them, pitch, negotiate and close.</p></div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#141414]">Read the guide</span>
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="rounded-2xl bg-muted/60 p-5 text-sm leading-relaxed">
          <h2 className="font-semibold tracking-tight">Your Google account</h2>
          <p className="mt-1 text-muted-foreground">You sign in with Google using only your name and email address. If you choose to connect Gmail and Calendar, SponsorDesk sends the sponsor emails you approve from your own mailbox, reads replies to them, and adds the meetings you confirm to your calendar. Google data is never sold, used for ads, or used to train AI. Read the <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link> for the details.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-6 text-sm text-muted-foreground">
        <span>© 2026 SponsorDesk</span>
        <Link href="/guide" className="hover:text-foreground">Sponsorship guide</Link>
        <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
        <a href="mailto:patekarvijay262@gmail.com" className="hover:text-foreground">Contact</a>
      </footer>
    </main>
  );
}
