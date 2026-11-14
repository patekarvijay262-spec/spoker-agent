"use client";

import Link from "next/link";

import { cn } from "cn";
import { ArrowRight, BadgeCheck, Box, CalendarClock, FileSignature, Hand, Loader2, Mail, Megaphone, MessageSquareReply, Presentation, Radar, Scale } from "lucide-react";

import { useDesk } from "./desk-provider";
import { type Any, ago, AGENTS, humanLog, lakh, OP_AGENT, STAGES } from "./format";

const ICON: Record<string, Any> = { A0: Box, A1: Radar, A2: MessageSquareReply, A3: CalendarClock, A4: Presentation, A5: Scale, A6: FileSignature, A7: Megaphone, Email: Mail };
type Status = "working" | "needs" | "done" | "idle";
export type AgentState = { id: string; name: string; job: string; status: Status; metric: string; detail: string; needs: number; cta?: { label: string; href: string }; last?: Any };

export function useAgentStates(): AgentState[] {
  const { data, busy, progress } = useDesk();
  const e = data?.event;
  const cos: Any[] = data?.companies || [];
  const msgs: Any[] = data?.messages || [];
  const ex: Any[] = (data?.exceptions || []).filter((x: Any) => x.status === "open");
  const contacts: Any[] = data?.contacts || [];
  const live = busy ? OP_AGENT[busy.op] : progress ? "A1" : "";
  const count = (f: (c: Any) => boolean) => cos.filter(f).length;
  const scored = count((c) => c.intersection != null && c.stage !== "DISQUALIFIED");
  const p1 = count((c) => c.priority === "P1" && c.stage !== "DISQUALIFIED");
  const drafts = msgs.filter((m) => m.status === "drafted").length;
  const verified = contacts.filter((c) => c.is_primary && c.email_status === "VERIFIED").length;
  const review = contacts.filter((c) => c.is_primary && !c.reviewed_at && ["UNVERIFIED", "UNAVAILABLE", "OUTDATED"].includes(c.email_status)).length;
  const meets = (data?.meetings || []).length;
  const decks = (data?.decks || []).length;
  const deals = (data?.deals || []).length;
  const sent = msgs.filter((m) => m.status === "sent").length;
  const signed = count((c) => ["MOU_SIGNED", "PAID", "NURTURE", "INKIND_CONFIRMED"].includes(c.stage));
  const below = ex.filter((x) => /below_floor/.test(x.kind)).length;
  const m: Record<string, Omit<AgentState, "id" | "name" | "job" | "status" | "last">> = {
    A0: !e ? { metric: "No brief yet", detail: "Waiting for your event brief", needs: 1, cta: { label: "Write the brief", href: "/desk/brief" } }
      : !e.floor_locked ? { metric: `Floor ${lakh(e.floor_inr)} suggested`, detail: "Used as is unless you change it on Event", needs: 0 }
      : { metric: `Floor ${lakh(e.floor_inr)} locked`, detail: `${(e.tiers || []).length} tiers, goal ${lakh(e.goal_inr || 0)}`, needs: 0, cta: { label: "View brief", href: "/desk/brief" } },
    A1: { metric: cos.length ? `${scored} scored · ${p1} P1` : "No companies yet", detail: cos.length ? `${count((c) => c.stage === "PROSPECT")} waiting to be scored, ${count((c) => c.stage === "DISQUALIFIED")} dropped` : "Runs after the floor is locked", needs: 0, cta: { label: "See companies", href: "/desk/companies" } },
    A2: { metric: `${verified} verified contacts`, detail: drafts ? `${drafts} offers waiting for your approval` : review ? `${review} contacts need a check` : `${msgs.filter((x) => x.sequence === "cold").length} offers written`, needs: drafts + review, cta: drafts ? { label: "Approve offers", href: "/desk/outbox" } : review ? { label: "Check contacts", href: "/desk/people" } : { label: "See people", href: "/desk/people" } },
    A3: { metric: `${meets} meeting${meets === 1 ? "" : "s"}`, detail: meets ? "Booked with Google Meet links" : "Starts when a sponsor asks to talk", needs: 0, cta: { label: "Meetings", href: "/desk/meetings" } },
    A4: { metric: `${decks} deck${decks === 1 ? "" : "s"}`, detail: decks ? "Company-specific, shareable" : "Build one from a company page", needs: 0, cta: { label: "Companies", href: "/desk/companies" } },
    A5: { metric: below ? `${below} below your floor` : "No counters yet", detail: below ? "Trade-based counters waiting for you" : "Reads meeting notes and replies", needs: below, cta: { label: below ? "Decide" : "Inbox", href: "/desk/inbox" } },
    A6: { metric: `${deals} MOU${deals === 1 ? "" : "s"}`, detail: deals ? "Drafted from deal sheets" : "Drafts once terms are agreed", needs: 0, cta: { label: "Deals", href: "/desk/deals" } },
    A7: { metric: `${signed} signed sponsor${signed === 1 ? "" : "s"}`, detail: signed ? "Fortnightly updates ready to write" : "Starts after the first signature", needs: 0, cta: { label: "Updates", href: "/desk/sponsors" } },
    Email: { metric: `${sent} sent · ${drafts} to approve`, detail: data?.settings?.gmail ? `Sending as ${data.settings.gmail}` : "Draft mode: connect Gmail to send", needs: 0, cta: { label: "Outbox", href: "/desk/outbox" } },
  };
  return AGENTS.map((a) => {
    const last = (data?.log || []).find((l: Any) => l.actor === a.id);
    const x = m[a.id];
    const status: Status = live === a.id ? "working" : x.needs > 0 ? "needs" : last ? "done" : "idle";
    return { id: a.id, name: a.name, job: a.job, status, last, ...x, detail: live === a.id ? (busy?.label || progress?.label || x.detail) : x.detail };
  });
}

const TONE: Record<Status, { ring: string; chip: string; label: string }> = {
  working: { ring: "border-foreground/40", chip: "text-foreground", label: "Working" },
  needs: { ring: "border-warning/50", chip: "text-warning", label: "Needs you" },
  done: { ring: "", chip: "text-success", label: "Active" },
  idle: { ring: "border-dashed", chip: "text-muted-foreground", label: "Waiting" },
};

export function AgentCard({ a, compact }: { a: AgentState; compact?: boolean }) {
  const Icon = ICON[a.id];
  const t = TONE[a.status];
  return (
    <div className={cn("flex h-full min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 transition", t.ring, a.status === "idle" && "opacity-70")}>
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 text-muted-foreground">{a.status === "working" ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{a.name}</div>
          <div className={cn("text-xs", t.chip)}>{t.label}{a.needs > 0 && a.status === "needs" ? ` · ${a.needs}` : ""}</div>
        </div>
      </div>
      <div className="text-sm num">{a.metric}</div>
      {!compact && a.last && <div className="truncate text-xs text-muted-foreground" title={humanLog(a.last).full}>{humanLog(a.last).text} · {ago(a.last.ts)}</div>}
      {a.cta && (
        <Link href={a.cta.href} className={cn("mt-auto inline-flex items-center gap-1 self-start text-xs transition hover:underline", a.status === "needs" ? "font-medium text-foreground" : "text-muted-foreground")}>
          {a.status === "needs" && <Hand className="size-3" />}{a.cta.label}<ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

const DOT: Record<Status, string> = { working: "animate-pulse bg-foreground", needs: "bg-warning", done: "bg-success", idle: "bg-muted-foreground/30" };

/** Max's four stages side by side. Each stage lists every job in it, with what it has done and what needs you. */
export function AgentFlow({ compact }: { compact?: boolean }) {
  const states = useAgentStates();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((st) => {
        const jobs = st.agents.map((id) => states.find((s) => s.id === id)!).filter(Boolean);
        const status: Status = jobs.some((j) => j.status === "working") ? "working" : jobs.some((j) => j.status === "needs") ? "needs" : jobs.some((j) => j.status === "done") ? "done" : "idle";
        const needs = jobs.reduce((n, j) => n + (j.status === "needs" ? j.needs : 0), 0);
        return (
          <section key={st.id} className={cn("flex min-w-0 flex-col rounded-2xl border bg-card", status === "working" && "border-foreground/40", status === "needs" && "border-warning/50")}>
            <header className="flex items-center gap-2.5 border-b px-3.5 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background num">{st.n}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold tracking-tight">{st.name}{status === "working" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}</div>
                <div className="truncate text-xs text-muted-foreground">{st.verb}</div>
              </div>
              {needs > 0 && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-warning num">{needs} for you</span>}
            </header>
            <ul className="flex-1 divide-y">
              {jobs.map((j) => {
                const Icon = ICON[j.id];
                return (
                  <li key={j.id} className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{j.name}</span>
                      <span className={cn("ml-auto size-1.5 shrink-0 rounded-full", DOT[j.status])} title={TONE[j.status].label} />
                    </div>
                    <div className="mt-0.5 pl-5.5 text-xs text-muted-foreground num">{j.metric}</div>
                    {!compact && j.status === "needs" && j.cta && (
                      <Link href={j.cta.href} className="mt-1 ml-5.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"><Hand className="size-3" />{j.cta.label}<ArrowRight className="size-3" /></Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <Link href={st.href} className="flex items-center justify-between border-t px-3.5 py-2 text-xs text-muted-foreground transition hover:bg-muted/50 hover:text-foreground">Open {st.name.toLowerCase()}<ArrowRight className="size-3.5" /></Link>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:col-span-2 xl:col-span-4">
        <BadgeCheck className="size-4 text-success" />
        <span className="text-muted-foreground">Every email waits for your yes and is sent once.</span>
      </div>
    </div>
  );
}
