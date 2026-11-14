// The Sponsorship Playbook: a short booklet on preparing for sponsors and getting them. Public, so organisers can read
// it before signing up, and printable as a PDF from the browser.
import type { Metadata } from "next";

import Link from "next/link";

import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "The Sponsorship Playbook",
  description: "How to prepare for sponsors, find the right ones, write to them, negotiate and close: a short guide for college fests and event teams in India.",
};

const CHAPTERS = [
  { id: "prepare", n: 1, title: "Prepare before you ask", line: "Sponsors buy an audience. Know yours in numbers before the first email." },
  { id: "find", n: 2, title: "Find the right sponsors", line: "Ten companies that fit beat a hundred that don't." },
  { id: "reach", n: 3, title: "Reach the person who decides", line: "Short, specific emails to the right person, followed up politely." },
  { id: "pitch", n: 4, title: "Pitch and negotiate", line: "Listen for their goal, then trade value instead of cutting price." },
  { id: "close", n: 5, title: "Close, deliver, renew", line: "A clear MOU, every promise delivered, and a report that earns next year." },
];

function Check({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((t) => <li key={t} className="flex gap-2.5"><span className="mt-1 grid size-4 shrink-0 place-items-center rounded border text-[0.625rem] text-muted-foreground" aria-hidden>✓</span><span>{t}</span></li>)}
    </ul>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-xl bg-muted/70 px-4 py-3 text-[0.8125rem]"><b>Tip:</b> {children}</p>;
}
function Chapter({ c, children }: { c: (typeof CHAPTERS)[number]; children: React.ReactNode }) {
  return (
    <section id={c.id} className="scroll-mt-6 border-t py-10 break-before-page print:py-6">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-black text-muted-foreground/30 num">{String(c.n).padStart(2, "0")}</span>
        <div><h2 className="text-2xl font-bold tracking-tight">{c.title}</h2><p className="text-muted-foreground">{c.line}</p></div>
      </div>
      <div className="mt-6 space-y-6 text-[0.9375rem] leading-relaxed [&_h3]:text-base [&_h3]:font-semibold">{children}</div>
    </section>
  );
}

export default function Guide() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 print:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">S</span>SponsorDesk</Link>
        <div className="flex items-center gap-2"><PrintButton /><Link href="/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">Sign in</Link></div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-16">
        {/* Cover */}
        <div className="rounded-3xl px-6 py-12 text-white md:px-10 md:py-16" style={{ background: "linear-gradient(135deg, #ff4f8b, #7c4dff)" }}>
          <div className="text-sm font-semibold tracking-wider uppercase opacity-80">A SponsorDesk booklet</div>
          <h1 className="mt-2 text-[2.25rem] leading-tight font-bold tracking-tight md:text-[3rem]">The Sponsorship Playbook</h1>
          <p className="mt-3 max-w-lg opacity-90">How to prepare for sponsors, find the right ones, write to them, negotiate and close. For college fests, conferences and event teams in India.</p>
          <p className="mt-6 text-sm opacity-75">About 12 minutes to read · Print it as a PDF for your team</p>
        </div>

        {/* Contents */}
        <nav className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Chapters">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="flex items-baseline gap-3 rounded-xl border px-4 py-3 transition hover:border-foreground/30">
              <span className="text-sm font-bold text-muted-foreground num">{c.n}</span><span className="font-semibold">{c.title}</span>
            </a>
          ))}
          <a href="#checklist" className="flex items-baseline gap-3 rounded-xl border px-4 py-3 transition hover:border-foreground/30"><span className="text-sm font-bold text-muted-foreground">✓</span><span className="font-semibold">One-page checklist</span></a>
        </nav>

        <section className="mt-10 rounded-2xl border p-5">
          <h2 className="font-bold tracking-tight">The timeline that works</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5 pr-3 font-semibold">When</th><th className="py-1.5 font-semibold">What to do</th></tr></thead>
              <tbody className="[&_td]:border-t [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top">
                <tr><td className="font-medium whitespace-nowrap">4 to 5 months before</td><td>Fix dates, audience numbers, tiers and the deck. List past sponsors.</td></tr>
                <tr><td className="font-medium whitespace-nowrap">3 to 4 months before</td><td>Shortlist companies, find decision makers, send the first wave of emails.</td></tr>
                <tr><td className="font-medium whitespace-nowrap">2 to 3 months before</td><td>Follow up, take calls, send proposals, negotiate.</td></tr>
                <tr><td className="font-medium whitespace-nowrap">4 to 8 weeks before</td><td>Sign MOUs, collect payments, lock branding and logos for print.</td></tr>
                <tr><td className="font-medium whitespace-nowrap">Event week</td><td>Deliver every promise. Photograph every logo, stall and stage mention.</td></tr>
                <tr><td className="font-medium whitespace-nowrap">Within 2 weeks after</td><td>Send each sponsor a report with numbers and photos. Ask about next year.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[0.8125rem] text-muted-foreground">Indian companies plan most marketing budgets for April to March. Reaching them in January to March for events later in the year gets you into next year&apos;s plan.</p>
        </section>

        <Chapter c={CHAPTERS[0]}>
          <div>
            <h3>Know your numbers</h3>
            <Check items={[
              "Expected footfall, and how you know it (last year's gate count, registrations, ticket sales).",
              "Who comes: age, colleges or companies, cities, interests. Sponsors buy a specific audience, not a crowd.",
              "Online reach: Instagram followers, average views per reel, website visitors, email list size.",
              "Last year's sponsors and what they got. They are your proof and your warmest leads.",
              "Three facts that make your event special: a celebrity, a national competition, a large prize pool, a 20-year history.",
            ]} />
          </div>
          <div>
            <h3>Build a short deck (8 to 10 slides)</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              <li>The event in one line, with dates and city.</li>
              <li>The audience in numbers, with a photo of the crowd.</li>
              <li>Last year&apos;s highlights: footfall, reach, press.</li>
              <li>Past sponsors&apos; logos.</li>
              <li>What a sponsor gets: stage, stalls, social posts, naming, workshops.</li>
              <li>The tiers with prices and deliverables.</li>
              <li>A few custom ideas (a hiring challenge, a product trial zone, an offer code).</li>
              <li>Contact person, phone and email.</li>
            </ol>
            <Tip>Keep the deck under 10 MB, or share it as a link. Big attachments land in spam.</Tip>
          </div>
          <div>
            <h3>Price four tiers, and set a floor</h3>
            <p className="mt-2">A simple ladder works: <b>Title</b> (one sponsor, naming rights), <b>Platinum</b> at about half of Title, <b>Gold</b> at a quarter, <b>Silver</b> at a tenth. If your goal is ₹10 lakh, one Title, two Platinum, four Gold and six Silver at a Title price of about ₹2.8 lakh gets you there.</p>
            <p className="mt-2">Decide your <b>floor</b>, the lowest you would accept, before any call. Never tell a sponsor what it is.</p>
          </div>
          <div>
            <h3>Get the paperwork ready</h3>
            <Check items={["A bank account in the organisation's name, not a student's.", "PAN, and GST registration if your institute needs it for invoices.", "An invoice format and an MOU template (see chapter 5).", "Written permission from your institute or committee to approach sponsors."]} />
          </div>
        </Chapter>

        <Chapter c={CHAPTERS[1]}>
          <div>
            <h3>The fit test</h3>
            <p className="mt-2">A company is worth writing to when at least three of these are true:</p>
            <Check items={[
              "Your audience is their customer (students for edtech, food delivery, banks opening first accounts, phone brands).",
              "They have fresh budget: new funding, a new product launch, a new city, or they are hiring freshers.",
              "They sponsored events like yours before.",
              "They are present in your city, or want to be.",
              "Their size matches your event. A small one-day event does better with startups and local brands than with national giants.",
            ]} />
          </div>
          <div>
            <h3>Good categories by event type</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <tbody className="[&_td]:border-t [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top">
                  <tr><td className="font-medium">Tech fest, hackathon</td><td>Software and SaaS, cloud, edtech, fintech, recruiters, phone and laptop brands</td></tr>
                  <tr><td className="font-medium">Cultural fest</td><td>Food and beverages, fashion, beauty, music and streaming, telecom, travel</td></tr>
                  <tr><td className="font-medium">Sports event</td><td>Sportswear, energy drinks, health and fitness, insurance, banks</td></tr>
                  <tr><td className="font-medium">E-summit, conference</td><td>Banks, VCs and accelerators, consulting, SaaS, coworking, legal and tax firms</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3>Find the person who decides</h3>
            <p className="mt-2">Write to the <b>brand manager, marketing manager, campus or community lead, or employer branding lead</b>, not the CEO and not a general info@ address. At a large company, reach several relevant people (10 to 15), a few at a time, because one of them will own the budget.</p>
            <Tip>Use verified work emails. A bounced email hurts your sender reputation, and the next ones land in spam.</Tip>
          </div>
        </Chapter>

        <Chapter c={CHAPTERS[2]}>
          <div>
            <h3>The first email: five parts, under 120 words</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              <li><b>Subject</b> with their brand and your event: &quot;Zepto × Techfest 2027&quot;.</li>
              <li><b>Why them</b>, in one line: what you noticed about their goals.</li>
              <li><b>The offer</b>: what they would get, with one number about your audience.</li>
              <li><b>One small ask</b>: a 15-minute call, not &quot;please sponsor us&quot;.</li>
              <li><b>Signature</b> with name, role, phone, and a polite line to opt out.</li>
            </ol>
          </div>
          <div className="rounded-2xl border bg-card p-5 text-sm leading-relaxed">
            <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Sample</div>
            <p><b>Subject:</b> Zepto × Techfest 2027</p>
            <p className="mt-3">Hi Priya,</p>
            <p className="mt-2">Congratulations on the launch in Pune. Techfest brings 1,75,000 students from 2,500 colleges to IIT Bombay this December, the people who order late at night.</p>
            <p className="mt-2">A Zepto experience zone with live offer codes could put you in front of them for three days, and we would share redemption numbers after.</p>
            <p className="mt-2">Could we find 15 minutes next week?</p>
            <p className="mt-3">Vijay Patekar<br />Head, Sponsorships, Techfest 2027<br /><span className="text-muted-foreground">If this isn&apos;t for you, just reply &quot;no&quot; and I won&apos;t write again.</span></p>
          </div>
          <div>
            <h3>Follow up, kindly</h3>
            <p className="mt-2">Most yeses come after a follow-up. Send a short one on day 4, another on day 9, and a last one on day 16. Each should add something new: a number, a photo, a deadline. Then stop.</p>
          </div>
          <Tip>Send in small waves, a few people per company at a time. When one replies, stop writing to the others there.</Tip>
        </Chapter>

        <Chapter c={CHAPTERS[3]}>
          <div>
            <h3>A 15-minute call that works</h3>
            <Check items={["Two minutes on your event and audience.", "Ask what they want this year: new users, hiring, a launch, brand awareness in a city.", "Offer the one or two deliverables that serve that goal.", "Agree the next step and a date before the call ends."]} />
          </div>
          <div>
            <h3>Answers to the usual objections</h3>
            <div className="mt-3 space-y-3">
              {[
                ["“We have no budget.”", "Ask when their next budget is set and whether in-kind support (products, vouchers, credits) or a smaller tier works now."],
                ["“It's too expensive.”", "Don't cut the price. Remove a deliverable, move them to the next tier, or add something that costs you little, like an extra social post."],
                ["“Send us the deck.”", "Send it, with two lines on the deliverables that fit their goal, and ask for a call date."],
                ["“We did an event last year and saw no results.”", "Offer something measurable: offer codes, QR sign-ups, a hiring challenge, and promise a report with numbers."],
              ].map(([q, a]) => <div key={q} className="rounded-xl border p-3.5"><div className="font-semibold">{q}</div><p className="mt-1 text-muted-foreground">{a}</p></div>)}
            </div>
          </div>
          <Tip>Trade, don&apos;t discount. Every rupee you drop teaches the sponsor to ask for more next year.</Tip>
        </Chapter>

        <Chapter c={CHAPTERS[4]}>
          <div>
            <h3>What the MOU must say</h3>
            <Check items={["Both parties' legal names, addresses and signatories.", "The tier, the amount (cash and in-kind) and the payment schedule, for example 50% on signing and 50% before the event.", "Every deliverable, with numbers and dates: logo sizes, stall size, number of posts, stage minutes.", "Who provides artwork and by when.", "What happens if the event is postponed or cancelled.", "Signatures and date."]} />
          </div>
          <div>
            <h3>Deliver, and prove it</h3>
            <p className="mt-2">Keep a sheet of every promise per sponsor and tick each one off. During the event, photograph every logo, stall, banner and stage mention.</p>
          </div>
          <div>
            <h3>The report that earns next year</h3>
            <p className="mt-2">Within two weeks, send each sponsor a short report: footfall, reach of their posts, stall visitors or sign-ups, photos, and a thank-you. Then ask, while the memory is fresh, whether they would like to talk about next year.</p>
          </div>
        </Chapter>

        <section id="checklist" className="scroll-mt-6 rounded-3xl border-2 border-foreground p-6 break-before-page">
          <h2 className="text-xl font-bold tracking-tight">One-page checklist</h2>
          <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <Check items={["Dates, city and footfall confirmed", "Audience profile in numbers", "Deck of 8 to 10 slides, under 10 MB", "Four tiers priced, floor decided", "Bank account, PAN, invoice and MOU template", "Institute permission in writing"]} />
            <Check items={["Shortlist that passes the fit test", "Decision makers with verified emails", "Your own email draft, under 120 words", "Follow-ups on days 4, 9 and 16", "MOU signed, payment schedule agreed", "Report sent within 2 weeks"]} />
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 p-5 print:hidden">
          <div><div className="font-bold tracking-tight">Let Max do the heavy lifting</div><p className="text-sm text-muted-foreground">SponsorDesk prices your tiers, finds companies and decision makers, and writes to them for your approval.</p></div>
          <Link href="/login" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Start free</Link>
        </div>
      </article>
    </main>
  );
}
