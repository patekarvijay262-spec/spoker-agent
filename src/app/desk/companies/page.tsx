"use client";

import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { cn } from "cn";
import { AlertTriangle, Building2, LayoutGrid, Mail, Plus, RefreshCw, Search, Star, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EmptyState, FitRing, PageHeader, PriorityBadge, StageBadge, VerifyBadge } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, brandName, money } from "@/components/desk/format";

const GROUPS = [
  { key: "P1", title: "Pitch now", sub: "Both scores 70 or more", test: (c: Any) => c.priority === "P1" && c.stage !== "DISQUALIFIED" },
  { key: "P2", title: "Worth a pitch", sub: "Both scores 50 or more", test: (c: Any) => c.priority === "P2" && c.stage !== "DISQUALIFIED" },
  { key: "P3", title: "Low priority", sub: "Smaller ask or partial fit", test: (c: Any) => c.priority === "P3" && c.stage !== "DISQUALIFIED" },
  { key: "new", title: "Not scored yet", sub: "Found by discovery or added by you", test: (c: Any) => c.intersection == null && c.stage !== "DISQUALIFIED" },
  { key: "drop", title: "Dropped", sub: "Brand safety, distress or poor fit", test: (c: Any) => c.stage === "DISQUALIFIED" },
];

function CompanyCard({ c, primary }: { c: Any; primary: Any }) {
  const { openCompany, act, busy } = useDesk();
  const r = c.reasons || {};
  const ab = r.about || {};
  const risky = (r.signals || []).some((s: Any) => /^(Negative|Caution)/.test(s.claim));
  const brand = brandName(c);
  return (
    <article className="flex flex-col rounded-xl border bg-card transition hover:border-foreground/20">
      <button type="button" onClick={() => openCompany(c.id)} className="flex flex-1 flex-col gap-3 p-5 text-left">
        <div className="flex w-full items-start gap-3">

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><h3 className="truncate font-medium">{brand}</h3><PriorityBadge p={c.priority} />{(r.requested || r.past_sponsor) && <Star className="size-3.5 text-muted-foreground" aria-label={r.past_sponsor ? "Past sponsor" : "You asked for this brand"} />}</div>
            <div className="truncate text-sm text-muted-foreground">{[ab.industry || r.industry, ab.headcount ? `${Number(ab.headcount).toLocaleString("en-IN")} people` : ""].filter(Boolean).join(" · ") || c.domain}</div>
          </div>
          <FitRing value={c.intersection} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{ab.description || c.why_now || "No description yet."}</p>
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-5 py-3 text-xs text-muted-foreground">
        {c.price_range ? <span className="text-foreground">{money(c.price_range)}</span> : <StageBadge stage={c.stage} />}
        {risky && <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="size-3.5" />News to check</span>}
        <span className="ml-auto" />
        {primary ? (
          <span className="inline-flex min-w-0 items-center gap-1.5"><span className="max-w-32 truncate">{primary.full_name}</span><VerifyBadge s={primary.email_status} /></span>
        ) : c.intersection == null && c.stage !== "DISQUALIFIED" ? (
          <Button size="xs" variant="outline" disabled={!!busy} onClick={() => act("analyze", { company_id: c.id }, `Scoring ${c.name}`)}>Score</Button>
        ) : null}
      </div>
    </article>
  );
}

// Spoken or typed shorthand ("fintech", "food") also matches the industry Crustdata uses.
const SYNONYMS: Record<string, string> = {
  fintech: "financial|bank|payment|insurance|lending|fintech", food: "food|beverage|restaurant|dairy|snack", drinks: "beverage|drink",
  fashion: "apparel|fashion|clothing", tech: "software|technology|internet|it services|computer", edtech: "e-learning|education|edtech",
  gaming: "gaming|games|entertainment", media: "media|entertainment|video|audio|advertising", health: "health|wellness|fitness|hospital|pharma",
  startup: "seed|startup|early", travel: "travel|hospitality|transport|airline",
};
function matches(c: Any, q: string) {
  const hay = `${c.name} ${c.domain} ${c.reasons?.about?.industry || c.reasons?.industry || ""} ${c.reasons?.about?.description || ""} ${c.segment || ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w) || (SYNONYMS[w.replace(/s$/, "")] ? new RegExp(SYNONYMS[w.replace(/s$/, "")]).test(hay) : false));
}

export default function CompaniesPage() {
  const { data, act, busy, progress, openCompany, can, findDifferent } = useDesk();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  useEffect(() => { const v = params.get("q"); if (v !== null) setQ(v); }, [params]);
  const [pri, setPri] = useState("all");
  const [ind, setInd] = useState("");
  const [sort, setSort] = useState("fit");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [add, setAdd] = useState({ name: "", domain: "" });
  const [adding, setAdding] = useState(false);
  const cos: Any[] = data.companies;
  const primaryOf = (id: string) => data.contacts.find((x: Any) => x.company_id === id && x.is_primary);
  const industries = useMemo(() => [...new Set(cos.map((c) => c.reasons?.about?.industry || c.reasons?.industry).filter(Boolean))].sort() as string[], [cos]);
  const list = cos
    .filter((c) => !q || matches(c, q))
    .filter((c) => !ind || (c.reasons?.about?.industry || c.reasons?.industry) === ind)
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? (b.reasons?.about?.headcount || 0) - (a.reasons?.about?.headcount || 0) : (b.intersection ?? -1) - (a.intersection ?? -1));
  const groups = GROUPS.filter((g) => pri === "all" || g.key === pri).map((g) => ({ ...g, items: list.filter(g.test) })).filter((g) => g.items.length);
  const counts = Object.fromEntries(GROUPS.map((g) => [g.key, cos.filter(g.test).length]));

  return (
    <>
      <PageHeader title="Companies" description="Best fit first. Open one for the full story.">
        <div className="flex flex-wrap gap-2">
          {data.companies.some((c: Any) => ["PROSPECT", "QUALIFIED", "CONTACT_READY"].includes(c.stage)) && (
            <Button variant="outline" disabled={!!busy || !!progress || !can("operator")} title="Sets aside the ones you have not written to yet and finds the same number of new companies"
              onClick={() => findDifferent()}><RefreshCw />Find different companies</Button>
          )}
          <Button variant={adding ? "secondary" : "outline"} onClick={() => setAdding(!adding)}><Plus />Add a company</Button>
        </div>
      </PageHeader>

      {adding && (
        <form className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4" onSubmit={(e) => { e.preventDefault(); act("add_company", add).then((r: Any) => { if (r?.id) { const n = add.name; setAdd({ name: "", domain: "" }); setAdding(false); act("analyze", { company_id: r.id }, `Scoring ${n}`).then(() => openCompany(r.id)); } }); }}>
          <div className="min-w-48 flex-1 space-y-1"><label htmlFor="add-name" className="text-xs font-medium text-muted-foreground">Company or brand</label><Input id="add-name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="e.g. Decathlon India" /></div>
          <div className="min-w-40 flex-1 space-y-1"><label htmlFor="add-domain" className="text-xs font-medium text-muted-foreground">Website</label><Input id="add-domain" value={add.domain} onChange={(e) => setAdd({ ...add, domain: e.target.value })} placeholder="decathlon.in" /></div>
          <Button type="submit" disabled={!add.name || !!busy || !can("operator")}>Add and score</Button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 scrollbar-thin">
          {[["all", `All ${cos.length}`], ["P1", `P1 ${counts.P1}`], ["P2", `P2 ${counts.P2}`], ["new", `New ${counts.new}`], ["drop", `Dropped ${counts.drop}`]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setPri(k)} className={cn("shrink-0 rounded-md px-3 py-1 text-sm transition num", pri === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        <div className="relative min-w-48 flex-1"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, or try “fintech”" className="pl-8" aria-label="Search companies" /></div>
        <NativeSelect value={ind} onChange={(e) => setInd(e.target.value)} aria-label="Industry" className="hidden md:block"><NativeSelectOption value="">All industries</NativeSelectOption>{industries.map((i) => <NativeSelectOption key={i} value={i}>{i}</NativeSelectOption>)}</NativeSelect>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="hidden md:block"><NativeSelectOption value="fit">Best fit</NativeSelectOption><NativeSelectOption value="size">Biggest</NativeSelectOption><NativeSelectOption value="name">A to Z</NativeSelectOption></NativeSelect>
        <div className="hidden rounded-lg bg-muted p-1 md:flex">
          <button type="button" aria-label="Card view" onClick={() => setView("cards")} className={cn("rounded-md p-1.5 text-muted-foreground", view === "cards" && "bg-background text-foreground shadow-sm")}><LayoutGrid className="size-4" /></button>
          <button type="button" aria-label="Table view" onClick={() => setView("table")} className={cn("rounded-md p-1.5 text-muted-foreground", view === "table" && "bg-background text-foreground shadow-sm")}><Table2 className="size-4" /></button>
        </div>
      </div>

      {!cos.length ? (
        <EmptyState icon={Building2} title="No companies yet">Pick a number on Home and the desk finds them, or add a company you already know.</EmptyState>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[53.75rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Company", "Priority", "Fit", "Ours / theirs", "Offer", "Decision maker", "Stage"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((c) => { const p = primaryOf(c.id); return (
                <tr key={c.id} onClick={() => openCompany(c.id)} className="cursor-pointer border-t transition hover:bg-muted/40">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><div className="min-w-0"><div className="font-semibold">{brandName(c)}</div><div className="max-w-72 truncate text-xs text-muted-foreground">{c.reasons?.about?.industry || c.domain}</div></div></div></td>
                  <td className="px-4 py-2.5"><PriorityBadge p={c.priority} /></td>
                  <td className="px-4 py-2.5 font-semibold num">{c.intersection ?? "–"}</td>
                  <td className="px-4 py-2.5 num text-muted-foreground">{c.our_pov ?? "–"} / {c.their_pov ?? "–"}</td>
                  <td className="px-4 py-2.5 text-xs">{c.price_range || "–"}</td>
                  <td className="px-4 py-2.5">{p ? <div className="flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" /><span className="max-w-40 truncate">{p.full_name}</span><VerifyBadge s={p.email_status} /></div> : <span className="text-muted-foreground">–</span>}</td>
                  <td className="px-4 py-2.5"><StageBadge stage={c.stage} /></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-baseline gap-2"><h2 className="font-medium">{g.title}</h2><span className="text-sm text-muted-foreground num">{g.items.length}</span></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{g.items.map((c) => <CompanyCard key={c.id} c={c} primary={primaryOf(c.id)} />)}</div>
            </section>
          ))}
          {!groups.length && <EmptyState icon={Search} title="Nothing matches">Try another filter or search.</EmptyState>}
        </div>
      )}
    </>
  );
}
