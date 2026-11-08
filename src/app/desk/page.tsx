"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, Building2, ClipboardPen, PenLine, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDesk } from "@/components/desk/desk-provider";
import { todayItems } from "@/lib/today-items";
import { actorName, type Any, ago, brandName, clock, humanLog, isDecision, isHuman, visibleLog } from "@/components/desk/format";

// Home: the organiser's four steps side by side. Each one says plainly where it stands and opens with one click;
// none is locked behind another, so a team can start with whatever it already has.

function StepCard({ n, title, icon: Icon, href, status, children, tour }: { n: number; title: string; icon: Any; href: string; status: React.ReactNode; children?: React.ReactNode; tour?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 transition hover:border-foreground/20" data-tour={tour}>
      <Link href={href} className="group flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background num">{n}</span>
        <span className="flex-1 font-semibold tracking-tight group-hover:underline">{title}</span>
        <Icon className="size-4 text-muted-foreground" />
      </Link>
      <div className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">{status}</div>
      {children && <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">{children}</div>}
    </div>
  );
}

function Welcome() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8 md:py-12">
      <div className="space-y-3">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-balance">Start wherever you like</h1>
        <p className="text-muted-foreground">Most teams begin with the event name and dates. You can add the rest any time.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/desk/brief" className="rounded-xl border bg-card p-4 transition hover:bg-muted/50">
          <ClipboardPen className="mb-3 size-5 text-muted-foreground" />
          <div className="font-medium">Describe your event</div>
          <div className="text-sm text-muted-foreground">Name, dates and city are enough to begin.</div>
        </Link>
        <Link href="/desk/draft" className="rounded-xl border bg-card p-4 transition hover:bg-muted/50">
          <PenLine className="mb-3 size-5 text-muted-foreground" />
          <div className="font-medium">Write your email draft</div>
          <div className="text-sm text-muted-foreground">The desk fits it to every company and person.</div>
        </Link>
      </div>
    </div>
  );
}

/** Today, in a few lines: what needs a yes, what goes out on its own, meetings and new replies. Nothing to
 * remember; the same list arrives by email each morning. */
function Today() {
  const { data, act, can } = useDesk();
  const items = todayItems({ messages: data.messages || [], meetings: data.meetings || [], replies: data.replies || [], exceptions: data.exceptions || [], companies: data.companies || [] });
  const on = data.settings?.daily_reminder !== false;
  const gmail = !!data.settings?.gmail;
  return (
    <section className="rounded-2xl bg-foreground p-4 text-background md:p-5" data-tour="today">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Today</h2>
        {can("admin") && gmail && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-background/60">
            <input type="checkbox" checked={on} onChange={() => act("settings", { daily_reminder: !on }, "Saving")} />
            Email me this list at 9 am
          </label>
        )}
      </div>
      {items.length ? (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.text}><Link href={i.href} className="group flex items-center gap-2.5 rounded-lg bg-background/10 px-3 py-2 text-sm transition hover:bg-background/15"><span className="size-1.5 shrink-0 rounded-full bg-[#f5a524]" /><span className="flex-1">{i.text}</span><ArrowRight className="size-3.5 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></Link></li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-background/70">Nothing needs you today. Follow-ups and reminders run on their own.</p>}
      {!gmail && <p className="mt-3 text-xs text-background/50">Connect Gmail in Connectors to get this list by email every morning.</p>}
    </section>
  );
}

export default function Home() {
  const { data, busy, progress, autopilot, can } = useDesk();
  const [count, setCount] = useState(10);
  const e = data.event;
  if (!e) return <Welcome />;
  const cos: Any[] = data.companies.filter((c: Any) => c.stage !== "DISQUALIFIED");
  const contacts: Any[] = data.contacts || [];
  const withPeople = new Set(contacts.filter((c) => c.email).map((c) => c.company_id)).size;
  const msgs: Any[] = data.messages || [];
  const waiting = msgs.filter((m) => m.status === "drafted").length;
  const sent = msgs.filter((m) => m.status === "sent").length;
  const approved = msgs.filter((m) => m.status === "approved").length;
  const replies = (data.replies || []).length + (data.exceptions || []).filter(isDecision).length;
  const seatTotal = Object.entries(e.category_counts || {}).filter(([id]) => (e.sponsor_categories || []).includes(id)).reduce((s, [, n]) => s + (Number(n) || 0), 0);
  const past = (e.past_sponsor_list || []).length;
  const draft = data.settings?.outreach_template;
  const log = data.log.filter(visibleLog).slice(0, 5);
  const coName = (id: string) => brandName(data.companies.find((c: Any) => c.id === id) || { name: id });
  const running = !!busy || !!progress;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight">{e.name}</h1>
          <p className="text-[0.8125rem] text-muted-foreground">{[e.organizer, e.dates, e.city].filter(Boolean).join(" · ")}</p>
        </div>
        <dl className="flex gap-1.5 text-center">
          {[["Companies", cos.length], ["Waiting", waiting], ["Sent", sent], ["Replies", replies]].map(([k, v]) => (
            <div key={k as string} className="min-w-16 rounded-lg border bg-card px-2.5 py-1.5"><dd className="text-lg leading-none font-semibold num">{v as number}</dd><dt className="mt-1 text-[0.6875rem] text-muted-foreground">{k as string}</dt></div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Today />
        {log.length > 0 && (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Recently</h2>
            <ol className="space-y-2.5" aria-live="polite">
              {log.map((l: Any) => (
                <li key={l.id} className="text-[0.8125rem] leading-snug">
                  <span className="line-clamp-1">{l.company_id && <span className="mr-1 font-medium">{coName(l.company_id)}</span>}<span className="text-muted-foreground" title={humanLog(l).full}>{humanLog(l).text}</span></span>
                  <span className="text-[0.6875rem] text-muted-foreground/80" title={clock(l.ts)}>{isHuman(l.actor) ? "You" : actorName(l.actor)} · {ago(l.ts)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="steps">
        <StepCard n={1} title="Event" icon={ClipboardPen} href="/desk/brief"
          status={<>{/to be confirmed/i.test(e.dates || "") ? "Dates not set yet" : e.dates}{past ? ` · ${past} past sponsors` : " · add past sponsors to set the level"}</>}>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/desk/brief" />}>Open</Button>
        </StepCard>

        <StepCard tour="find" n={2} title="Companies" icon={Building2} href="/desk/companies"
          status={cos.length ? `${cos.length} companies · ${withPeople} with verified people` : "None yet. Pick a number and the desk finds them, with people, emails and LinkedIn."}>
          {seatTotal
            ? <span className="text-sm text-muted-foreground">{seatTotal} by category</span>
            : <Input type="number" inputMode="numeric" min={1} max={100} value={count || ""} onChange={(x) => setCount(Math.max(0, Math.min(100, Math.round(Number(x.target.value) || 0))))} aria-label="How many companies to find" className="h-8 w-20" />}
          <Button size="sm" disabled={running || !can("operator") || (!seatTotal && !count)} onClick={() => autopilot(seatTotal || count)}>{progress ? "Finding…" : cos.length ? "Find more" : "Find companies"}</Button>
          {cos.length > 0 && <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/desk/companies" />}>See them<ArrowRight /></Button>}
        </StepCard>

        <StepCard n={3} title="Your draft" icon={PenLine} href="/desk/draft"
          status={draft?.body ? "Written. Each email is fitted to the company and the person." : "Not written yet. Until you write one, the desk drafts its own."}>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/desk/draft" />}>{draft?.body ? "Edit" : "Write it"}</Button>
        </StepCard>

        <StepCard n={4} title="Send" icon={Send} href="/desk/outbox"
          status={waiting || approved || sent || replies ? [waiting && `${waiting} waiting for your yes`, approved && `${approved} approved, going out on schedule`, sent && `${sent} sent`, replies && `${replies} replies`].filter(Boolean).join(" · ") : "Nothing to send yet."}>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/desk/outbox" />}>Open</Button>
        </StepCard>
      </div>

    </>
  );
}
