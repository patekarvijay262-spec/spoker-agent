"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FitRing, Panel, PriorityBadge, Stat } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { actorName, type Any, ago, brandName, clock, humanLog, isHuman, lakh, money, visibleLog } from "@/components/desk/format";
import { useVoiceControl } from "@/components/desk/voice-control";

function Welcome() {
  const voice = useVoiceControl();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-16 text-center md:py-24">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Tell the desk about your event</h1>
        <p className="text-muted-foreground">It prices your package, finds sponsors with fresh budgets and drafts offers to the right person.</p>
      </div>
      <Button size="lg" nativeButton={false} render={<Link href="/desk/brief" />}>Write the event brief<ArrowRight /></Button>
      <ol className="grid w-full gap-4 pt-6 text-left text-sm sm:grid-cols-3">
        {[["Brief", "Describe the event"], ["Floor", "Lock your minimum price"], ["Sponsors", "Approve drafted offers"]].map(([t, d], i) => (
          <li key={t} className="border-t pt-3"><div className="text-muted-foreground num">0{i + 1}</div><div className="font-medium">{t}</div><div className="text-muted-foreground">{d}</div></li>
        ))}
      </ol>
      {voice.enabled && <p className="text-xs text-muted-foreground">Prefer talking? Press Alt+V and say “open the brief”.</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, busy, progress, autopilot, openCompany, can } = useDesk();
  const [count, setCount] = useState(8);
  const e = data.event;
  if (!e) return <Welcome />;
  const cos: Any[] = data.companies;
  const live = cos.filter((c) => c.stage !== "DISQUALIFIED");
  const scored = live.filter((c) => c.intersection != null).sort((a, b) => (b.intersection || 0) - (a.intersection || 0));
  const p1 = scored.filter((c) => c.priority === "P1").length;
  const drafts = data.messages.filter((m: Any) => m.status === "drafted");
  const ex = data.exceptions.filter((x: Any) => x.status === "open");
  const won = data.deals.reduce((s: number, d: Any) => s + Number(d.cash_inr || 0), 0);
  const goal = Number(e.goal_inr || 0);
  const prospects = cos.filter((c) => c.stage === "PROSPECT").length;
  const log = data.log.filter(visibleLog).slice(0, 6);
  const coName = (id: string) => brandName(cos.find((c) => c.id === id) || { name: id });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1>
          <p className="text-sm text-muted-foreground">{[e.organizer, e.dates, e.city].filter(Boolean).join(" · ")}</p>
        </div>
        {!e.floor_locked ? (
          <Button nativeButton={false} render={<Link href="/desk/brief" />}>Review tiers and lock the floor<ArrowRight /></Button>
        ) : (
          <div className="flex items-center gap-2">
            <NativeSelect value={String(count)} onChange={(x) => setCount(Number(x.target.value))} aria-label="How many companies to find" className="w-24">
              {[5, 8, 12, 15, 20].map((n) => <NativeSelectOption key={n} value={String(n)}>{n}</NativeSelectOption>)}
            </NativeSelect>
            <Button disabled={!!busy || !!progress || !can("operator")} onClick={() => autopilot(count)}>{progress ? "Running…" : "Find sponsors"}</Button>
          </div>
        )}
      </div>

      {progress && (
        <div className="space-y-2">
          <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${((progress.done + 1) / Math.max(progress.total, 1)) * 100}%` }} /></div>
          <p className="truncate text-xs text-muted-foreground">{progress.label}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Stat label="Companies" value={live.length} sub={prospects ? `${prospects} waiting to be scored` : `${p1} top priority`} />
        <Stat label="Offers to approve" value={drafts.length} sub={drafts.length ? <Link className="inline-flex items-center gap-0.5 text-foreground hover:underline" href="/desk/outbox">Open Outbox<ArrowUpRight className="size-3" /></Link> : "Nothing waiting"} />
        <Stat label="Decisions for you" value={ex.length} sub={ex.length ? <Link className="inline-flex items-center gap-0.5 text-foreground hover:underline" href="/desk/inbox">Open Inbox<ArrowUpRight className="size-3" /></Link> : "All clear"} />
        <Stat label="Signed" value={lakh(won)} sub={goal ? `of ${lakh(goal)} goal` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Top targets" action={<Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/desk/companies" />}>View all</Button>}>
          {scored.length ? (
            <ul className="-my-2 divide-y">
              {scored.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openCompany(c.id)} className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-80">

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="truncate font-medium">{brandName(c)}</span><PriorityBadge p={c.priority} /></div>
                      <div className="truncate text-sm text-muted-foreground">{c.reasons?.about?.industry || c.segment || ""}{c.price_range ? ` · ${money(c.price_range)}` : ""}</div>
                    </div>
                    <FitRing value={c.intersection} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{e.floor_locked ? "Press Find sponsors to start." : "Lock the floor first."}</p>
          )}
        </Panel>

        <Panel title="Activity">
          <ol className="space-y-4" aria-live="polite">
            {log.map((l: Any) => (
              <li key={l.id} className="text-sm">
                <div className="line-clamp-2">
                  {l.company_id && <button type="button" className="mr-1 font-medium hover:underline" onClick={() => openCompany(l.company_id)}>{coName(l.company_id)}</button>}
                  <span className="text-muted-foreground" title={humanLog(l).full}>{humanLog(l).text}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground" title={clock(l.ts)}>{isHuman(l.actor) ? "You" : actorName(l.actor)} · {ago(l.ts)}</div>
              </li>
            ))}
            {!log.length && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
          </ol>
        </Panel>
      </div>
    </>
  );
}
