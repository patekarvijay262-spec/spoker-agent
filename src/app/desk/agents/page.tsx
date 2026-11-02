"use client";

import { useState } from "react";

import { AgentFlow, useAgentStates } from "@/components/desk/agent-flow";
import { PageHeader, Panel } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { actorName, type Any, ago, AGENTS, brandName, humanLog, isHuman, visibleLog, when } from "@/components/desk/format";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export default function AgentsPage() {
  const { data, ask, openCompany } = useDesk();
  const states = useAgentStates();
  const [who, setWho] = useState("all");
  const [limit, setLimit] = useState(10);
  const needs = states.filter((s) => s.status === "needs");
  const all = (data.log || []).filter(visibleLog).filter((l: Any) => (who === "all" ? true : who === "you" ? isHuman(l.actor) : l.actor === who));
  const log = all.slice(0, limit);
  const coName = (id: string) => brandName(data.companies.find((c: Any) => c.id === id) || { name: id });
  return (
    <>
      <PageHeader title="Agents" description="They work on their own and stop only where a person must decide.">
        <Button variant="outline" onClick={() => ask("What's going on?")}>Explain what's happening</Button>
      </PageHeader>
      {needs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Waiting for you:</span>
          {needs.map((s) => <Button key={s.id} size="sm" variant="outline" nativeButton={false} render={<a href={s.cta?.href} />}>{s.name} · {s.cta?.label}</Button>)}
        </div>
      )}
      <Panel><AgentFlow /></Panel>

      <Panel title="Activity" action={
        <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter activity" className="w-44">
          <NativeSelectOption value="all">Everyone</NativeSelectOption>
          {AGENTS.map((a) => <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>)}
          <NativeSelectOption value="you">People</NativeSelectOption>
        </NativeSelect>
      }>
        <ol className="divide-y">
          {log.map((l: Any) => (
            <li key={l.id} className="grid gap-1 py-3 text-sm first:pt-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
              <div className="text-xs text-muted-foreground" title={when(l.ts)}>{isHuman(l.actor) ? "You" : actorName(l.actor)} · {ago(l.ts)}</div>
              <div className="min-w-0">
                {l.company_id && <button type="button" className="mr-1.5 font-medium hover:underline" onClick={() => openCompany(l.company_id)}>{coName(l.company_id)}</button>}
                <span className="text-muted-foreground" title={humanLog(l).full}>{humanLog(l).text}</span>
              </div>
            </li>
          ))}
          {!log.length && <li className="text-sm text-muted-foreground">No activity yet.</li>}
        </ol>
        {all.length > limit && <Button variant="ghost" size="sm" className="mt-4" onClick={() => setLimit(limit + 15)}>Show more</Button>}
      </Panel>
    </>
  );
}
