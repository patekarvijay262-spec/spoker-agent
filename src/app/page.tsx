// Public home page. Google's app verification needs a home page that says what the app does and links its privacy
// policy, reachable without signing in. Signed-in people go straight to their desk from here.
import type { Metadata } from "next";

import Link from "next/link";

export const metadata: Metadata = {
  title: "SponsorDesk · Sponsorship desk for event teams",
  description: "SponsorDesk helps college fests, conferences and event teams find the right sponsors, write to them and close deals.",
};

const STEPS = [
  ["Describe your event", "Name, dates, footfall and past sponsors. The desk suggests tier prices and the level of company you can reach."],
  ["Find the right companies", "Sponsors by category, with verified work emails, phone numbers and LinkedIn for the people who decide."],
  ["Write once, send to many", "Your own email draft, fitted to every company and person, with your deck attached. Nothing goes out without your yes."],
  ["Replies, meetings, MOUs", "Replies are tracked, meetings booked with a Meet link, and deals turned into MOUs. A short list each morning tells you what needs you."],
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">S</span>SponsorDesk
        </div>
        <Link href="/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">Sign in</Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 pb-12 md:pt-16">
        <h1 className="max-w-2xl text-[2rem] leading-tight font-bold tracking-tight text-balance md:text-[2.75rem]">The sponsorship desk for event teams</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">SponsorDesk helps college fests, conferences and event organisers find the right sponsors, reach the people who decide, and close deals, with less stress.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/login" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Sign in with Google</Link>
          <a href="#how" className="rounded-full border px-5 py-2.5 text-sm font-medium">How it works</a>
        </div>
      </section>

      <section id="how" className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-4 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border bg-card p-4">
            <span className="grid size-6 place-items-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background">{i + 1}</span>
            <h2 className="mt-3 font-semibold tracking-tight">{t}</h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="rounded-2xl bg-muted/60 p-5 text-sm leading-relaxed">
          <h2 className="font-semibold tracking-tight">Your Google account</h2>
          <p className="mt-1 text-muted-foreground">You sign in with Google using only your name and email address. If you choose to connect Gmail and Calendar, SponsorDesk sends the sponsor emails you approve from your own mailbox, reads replies to them, and adds the meetings you confirm to your calendar. Google data is never sold, used for ads, or used to train AI. Read the <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link> for the details.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-6 text-sm text-muted-foreground">
        <span>© 2026 SponsorDesk</span>
        <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
        <a href="mailto:patekarvijay262@gmail.com" className="hover:text-foreground">Contact</a>
      </footer>
    </main>
  );
}
