// Public home page: what SponsorDesk does, shown rather than claimed. Also the home page Google's app verification
// reads, so it says plainly what the app does with a Google account and links the privacy policy.
import type { Metadata } from "next";

import Link from "next/link";

import { Explainer, WatchButton } from "@/components/explainer";

export const metadata: Metadata = {
  title: "SponsorDesk · Sponsorship, handled",
  description: "SponsorDesk finds the right sponsors for college fests, conferences and summits, reaches the people who decide, and keeps every deal moving.",
};

const GRAD = "linear-gradient(135deg, #ff4f8b, #7c4dff)";

const STAGES = [
  ["Plan", "Share the size of your event and the budget. Four sponsor tiers are priced to match."],
  ["Find", "Companies that fit your audience, with the people who decide and verified work emails."],
  ["Reach", "Your email, fitted to each company and person. Nothing leaves without your approval."],
  ["Close", "Replies, meetings, MOUs and sponsor updates in one place, with a short list each morning."],
];

const FEATURES = [
  ["Decision makers, verified", "Brand and marketing leads at each company, with work emails checked before anything is sent."],
  ["Prices that fit your scale", "A one-day event and a three-day fest get different tiers, and a different list of companies."],
  ["Your words, every email", "Write once in your own voice. Each email is fitted to the company and the person reading it."],
  ["You approve, always", "Every email waits for a named approver and goes out once. Your lowest price is never shared."],
  ["Past sponsors set the bar", "Your past sponsors show the level of company you can reach, and they are written to first."],
  ["Any Indian language", "Ask questions and get answers in English, Hindi, Marathi, Tamil and more, typed or spoken."],
];

/** A still of the product: what an organising team actually sees. */
function ProductPreview() {
  const rows: [string, string, number, boolean][] = [["Zepto", "P1", 84, true], ["boAt", "P1", 79, true], ["HDFC Bank", "P2", 72, true], ["Unstop", "P2", 66, false]];
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] opacity-25 blur-3xl" style={{ background: GRAD }} />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1.5rem_3rem_-1.5rem_rgb(20_20_20/0.35)]">
        <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
          {[0, 1, 2].map((k) => <span key={k} className="size-2.5 rounded-full bg-foreground/15" />)}
          <span className="ml-2 text-xs text-muted-foreground">Techfest 2027 · Companies</span>
        </div>
        <div className="grid grid-cols-4 gap-px border-b bg-border text-center">
          {[["51", "Companies"], ["60", "People"], ["8", "Ready to send"], ["₹10L", "Goal"]].map(([v, k]) => (
            <div key={k} className="bg-card px-2 py-2.5"><div className="text-lg leading-none font-bold num">{v}</div><div className="mt-1 text-[0.6875rem] text-muted-foreground">{k}</div></div>
          ))}
        </div>
        <ul className="divide-y pb-4 text-sm">
          {rows.map(([name, p, fit, ok], i) => (
            <li key={name} className="flex items-center gap-3 px-4 py-2.5" style={{ animation: `ex-rise 600ms cubic-bezier(.2,.8,.2,1) ${300 + i * 150}ms both` }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: ["#ff4f8b", "#7c4dff", "#4aa8ff", "#2ecc9a"][i] }}>{name[0]}</span>
              <div className="min-w-0 flex-1"><div className="font-semibold">{name}</div><div className="text-xs text-muted-foreground">{ok ? "Brand lead · verified email" : "Finding the right person"}</div></div>
              <span className={`rounded-md px-1.5 text-xs font-semibold ${p === "P1" ? "bg-foreground text-background" : "border text-muted-foreground"}`}>{p}</span>
              <span className="w-7 text-right font-semibold num">{fit}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-7 -left-5 hidden rounded-xl border bg-card px-3.5 py-2.5 text-sm shadow-lg sm:block" style={{ animation: "ex-pop 600ms cubic-bezier(.2,.8,.2,1) 1100ms both" }}>
        <div className="font-semibold">8 emails ready</div><div className="text-xs text-muted-foreground">Waiting for your approval</div>
      </div>
      <div className="absolute -top-4 -right-3 hidden rounded-xl border bg-card px-3.5 py-2.5 text-sm shadow-lg sm:block" style={{ animation: "ex-pop 600ms cubic-bezier(.2,.8,.2,1) 1400ms both" }}>
        <div className="font-semibold">Title tier ₹2.8L</div><div className="text-xs text-muted-foreground">Priced for 5,000 people</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">S</span>SponsorDesk
        </Link>
        <nav className="flex items-center gap-1">
          <a href="#how" className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">How it works</a>
          <Link href="/guide" className="rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">Playbook</Link>
          <Link href="/login" className="ml-1 rounded-full bg-foreground px-4 py-2 text-sm font-medium whitespace-nowrap text-background">Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 md:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">For college fests, conferences and summits</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05] font-bold tracking-tight md:text-[3.5rem]">
            Sponsorship,<br /><span className="bg-clip-text text-transparent" style={{ backgroundImage: GRAD }}>handled.</span>
          </h1>
          <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-muted-foreground">SponsorDesk finds the companies that fit your event, reaches the people who decide and keeps every deal moving, so your team can focus on the event itself.</p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link href="/login" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Get started</Link>
            <WatchButton label="See how it works" />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Sign in with Google · Your data stays private to your team</p>
        </div>
        <ProductPreview />
      </section>

      {/* Video */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight">A season of sponsorship, in one minute</h2>
            <p className="mt-3 text-muted-foreground">From the first brief to the signed MOU. Meet Max, who does the work and checks with you where it matters.</p>
          </div>
          <div className="rounded-3xl border bg-card p-2.5 shadow-sm"><Explainer startMuted /></div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16">
        <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map(([t, d], i) => (
            <div key={t} className="bg-card p-5">
              <div className="text-sm font-bold text-muted-foreground num">0{i + 1}</div>
              <h3 className="mt-6 text-lg font-bold tracking-tight">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="border-t pt-5">
              <h3 className="font-bold tracking-tight">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Playbook */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Link href="/guide" className="group grid items-center gap-6 overflow-hidden rounded-3xl p-8 text-white md:grid-cols-[minmax(0,1fr)_auto] md:p-10" style={{ background: GRAD }}>
          <div>
            <div className="text-sm font-semibold opacity-80">The Sponsorship Playbook</div>
            <h2 className="mt-1 text-[1.75rem] leading-tight font-bold tracking-tight">How strong teams prepare, pitch and close</h2>
            <p className="mt-2 max-w-xl opacity-90">Five short chapters with a timeline, a sample email, answers to common objections and an MOU checklist.</p>
          </div>
          <span className="justify-self-start rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#141414] transition group-hover:translate-x-0.5 md:justify-self-end">Read the playbook</span>
        </Link>
      </section>

      {/* Google account */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-2 rounded-2xl border p-6 text-sm leading-relaxed md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
          <h2 className="font-bold tracking-tight">Your Google account</h2>
          <p className="text-muted-foreground">You sign in with Google using only your name and email address. If you connect Gmail and Calendar, SponsorDesk sends the sponsor emails you approve from your own mailbox, reads replies to them, and adds the meetings you confirm to your calendar. Google data is never sold, used for ads, or used to train AI. The <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link> has the details.</p>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-semibold text-foreground"><span className="grid size-6 place-items-center rounded-md bg-foreground text-[0.6875rem] font-bold text-background">S</span>SponsorDesk</span>
          <Link href="/guide" className="hover:text-foreground">Playbook</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
          <a href="mailto:patekarvijay262@gmail.com" className="hover:text-foreground">Contact</a>
          <span className="ml-auto">© 2026 SponsorDesk</span>
        </div>
      </footer>
    </main>
  );
}
