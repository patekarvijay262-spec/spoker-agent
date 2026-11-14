"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

import { MaxFace } from "./assistant";
import { useDesk } from "./desk-provider";
import type { Any } from "./format";

// Every sponsor search starts with a short form, like briefing a colleague: how big the event is, the budget you
// want to raise, how many days, where, and how many sponsors of which kinds. A small one-day event and a
// three-day fest get different companies and different prices.

const SIZES = [
  { label: "Small", hint: "under 1,000", reach: 500 },
  { label: "Medium", hint: "1,000 to 5,000", reach: 3000 },
  { label: "Large", hint: "5,000 to 20,000", reach: 12000 },
  { label: "Very large", hint: "20,000+", reach: 50000 },
];

const field = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function FindSponsorsDialog() {
  const { data, act, autopilot, findDifferent, searchMode, openSearch, busy, progress } = useDesk();
  const e: Any = data?.event || {};
  const [f, setF] = useState({ reach: "", days: "", goal: "", city: "", count: "", cats: [] as string[] });
  useEffect(() => {
    if (!searchMode) return;
    const counts = e.category_counts || {};
    const seat = (e.sponsor_categories || []).reduce((s: number, id: string) => s + (Number(counts[id]) || 2), 0);
    setF({
      reach: e.reach ? String(e.reach) : "", days: e.days ? String(e.days) : "", goal: e.goal_inr ? String(Math.round(e.goal_inr / 1e5 * 10) / 10) : "",
      city: e.city || "", count: String(searchMode === "different" ? Math.max(1, (data?.companies || []).filter((c: Any) => ["PROSPECT", "QUALIFIED", "CONTACT_READY"].includes(c.stage)).length) : seat || 10),
      cats: e.sponsor_categories || [],
    });
  }, [searchMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!searchMode) return;
    const k = (x: KeyboardEvent) => { if (x.key === "Escape") openSearch(""); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [searchMode, openSearch]);
  if (!searchMode) return null;

  const num = (v: string) => Number(String(v).replace(/[^\d.]/g, "")) || 0;
  const count = Math.max(1, Math.min(100, Math.round(num(f.count)) || 10));
  const start = async () => {
    const counts = Object.fromEntries(f.cats.map((id) => [id, Math.max(1, Math.round(count / Math.max(1, f.cats.length)))]));
    const r = await act("search", { search: { reach: num(f.reach), days: num(f.days), goal_inr: Math.round(num(f.goal) * 1e5), city: f.city, count, categories: f.cats, counts } }, "Saving the search");
    if (!r) return;
    const mode = searchMode;
    openSearch("");
    if (mode === "different") await findDifferent(); else await autopilot(count);
  };
  const working = !!busy || !!progress;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="New sponsor search" onMouseDown={(x) => { if (x.target === x.currentTarget) openSearch(""); }}>
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border bg-card shadow-xl animate-rise sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start gap-3 border-b px-4 py-3.5">
          <MaxFace className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold tracking-tight">{searchMode === "different" ? "Find different sponsors" : "Brief me for this search"}</h2>
            <p className="text-xs text-muted-foreground">Tell me the size and budget. I&apos;ll match companies and prices to it.</p>
          </div>
          <button type="button" onClick={() => openSearch("")} aria-label="Close" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold">How big is the event?</div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {SIZES.map((s) => {
                const r = num(f.reach);
                const on = r > 0 && (r < 1000 ? 0 : r < 5000 ? 1 : r < 20000 ? 2 : 3) === SIZES.indexOf(s);
                return (
                  <button key={s.label} type="button" onClick={() => setF({ ...f, reach: String(s.reach) })}
                    className={cn("rounded-lg border px-2 py-1.5 text-left transition", on ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>
                    <div className="text-sm font-semibold">{s.label}</div><div className={cn("text-[0.6875rem]", on ? "text-background/70" : "text-muted-foreground")}>{s.hint}</div>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">or exact footfall<input inputMode="numeric" value={f.reach} onChange={(x) => setF({ ...f, reach: x.target.value })} className={cn(field, "h-8 w-32")} aria-label="Expected footfall" /></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5"><span className="text-xs font-semibold">Budget to raise (₹ lakh)</span><input inputMode="decimal" value={f.goal} onChange={(x) => setF({ ...f, goal: x.target.value })} placeholder="e.g. 5" className={field} /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold">How many days</span><input inputMode="numeric" value={f.days} onChange={(x) => setF({ ...f, days: x.target.value })} placeholder="1" className={field} /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold">City</span><input value={f.city} onChange={(x) => setF({ ...f, city: x.target.value })} placeholder="Mumbai" className={field} /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold">How many sponsors</span><input inputMode="numeric" value={f.count} onChange={(x) => setF({ ...f, count: x.target.value })} className={field} /></label>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold">Kinds of sponsors <span className="font-normal text-muted-foreground">(optional, I pick if empty)</span></div>
            <div className="flex flex-wrap gap-1">
              {SPONSOR_CATEGORIES.map((c) => {
                const on = f.cats.includes(c.id);
                return <button key={c.id} type="button" title={c.hint} aria-pressed={on} onClick={() => setF({ ...f, cats: on ? f.cats.filter((x) => x !== c.id) : [...f.cats, c.id] })}
                  className={cn("rounded-full border px-2.5 py-1 text-xs transition", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>;
              })}
            </div>
          </div>
          {num(f.goal) > 0 && <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">I&apos;ll size your four tiers so about 13 sponsors reach ₹{num(f.goal)} lakh{e.floor_locked ? ", and keep the lowest price you locked" : ""}.</p>}
        </div>

        <div className="flex items-center gap-2 border-t px-4 py-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{searchMode === "different" ? "Companies you have not written to are set aside." : "About a minute per company, with people and emails."}</span>
          <Button className="ml-auto rounded-full" disabled={working} onClick={start}><Search />{searchMode === "different" ? "Find different ones" : `Find ${count} sponsors`}</Button>
        </div>
      </div>
    </div>
  );
}
