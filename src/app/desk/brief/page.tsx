"use client";

import { type ReactNode, useState } from "react";

import { cn } from "cn";
import { Check, ExternalLink, Lock, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/desk/bits";
import { BriefComposer } from "@/components/desk/brief-composer";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, api, host, inr, lakh } from "@/components/desk/format";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div className="space-y-1"><h2 className="font-medium">{title}</h2>{hint && <div className="text-sm text-muted-foreground">{hint}</div>}</div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Details() {
  const { data } = useDesk();
  const e = data.event;
  const verified = (e.proof_items || []).filter((p: Any) => p.verified);
  const rows: [string, ReactNode][] = [
    ["Organiser", e.organizer], ["Dates", [e.dates, e.days > 1 ? `${e.days} days` : ""].filter(Boolean).join(" · ")], ["City", e.city],
    ["Website", e.website ? <a className="underline-offset-2 hover:underline" href={e.website} target="_blank" rel="noreferrer">{host(e.website)}</a> : null],
    ["Instagram", e.instagram ? <a className="underline-offset-2 hover:underline" href={`https://www.instagram.com/${e.instagram}/`} target="_blank" rel="noreferrer">@{e.instagram}{e.social_followers ? ` · ${Number(e.social_followers).toLocaleString("en-IN")} followers` : ""}</a> : null],
    ["Audience", e.audience_short || e.audience], ["Proof", verified.length ? verified.map((p: Any) => p.claim).join("; ") : e.proof],
    ["Signature", [e.sender?.name, e.sender?.title, e.postal_address].filter(Boolean).join(", ")],
  ];
  return (
    <Section title="Details">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0">{v || <span className="text-muted-foreground">—</span>}</dd></div>)}
      </dl>
    </Section>
  );
}

function Tiers() {
  const { data, act, busy, can, load, flash } = useDesk();
  const e = data.event;
  const [edit, setEdit] = useState(false);
  const [tiers, setTiers] = useState<Any[]>(e.tiers || []);
  const [floor, setFloor] = useState<number>(e.floor_inr || 0);
  const save = async () => {
    try { await api("/api/event", { profile: { ...e, tiers } }); await load(); setEdit(false); flash("Tiers saved", undefined, "success"); }
    catch (x: Any) { flash("Could not save", x.message, "error"); }
  };
  return (
    <Section title="Tiers and floor" hint={<span title={e.pricing_basis}>Edit before you lock the floor.</span>}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border xl:grid-cols-4">
        {tiers.map((t: Any, i: number) => (
          <div key={i} className="flex flex-col gap-2 bg-card p-4">
            {edit ? (
              <>
                <Input value={t.name} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, name: x.target.value } : y)))} aria-label="Tier name" />
                <Input type="number" value={t.price_inr} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, price_inr: Number(x.target.value) } : y)))} aria-label={`${t.name} price`} />
                <Textarea value={t.deliverables} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, deliverables: x.target.value } : y)))} aria-label={`${t.name} deliverables`} />
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">{t.name}</div>
                <div className="text-xl tracking-tight num md:text-2xl">{lakh(t.price_inr)}</div>
                <div className="line-clamp-3 text-xs text-muted-foreground" title={t.deliverables}>{t.deliverables}</div>
              </>
            )}
          </div>
        ))}
      </div>
      {!e.floor_locked && can("operator") && (
        <Button variant="ghost" size="sm" onClick={() => (edit ? save() : setEdit(true))}>{edit ? <><Check />Save tiers</> : <><Pencil />Edit tiers</>}</Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium"><Lock className="size-4" />Floor {e.floor_locked && <span className="text-xs font-normal text-success">Locked</span>}</div>
          <p className="text-sm text-muted-foreground">The smallest deal agents accept without you. Never shown to sponsors.</p>
        </div>
        {e.floor_locked ? <div className="text-2xl tracking-tight num">{inr(e.floor_inr)}</div> : (
          <div className="flex items-center gap-2">
            <Input type="number" value={floor} onChange={(x) => setFloor(Number(x.target.value))} className="w-36" aria-label="Floor in rupees" />
            <Button disabled={!!busy || !floor || !can("approver")} onClick={() => act("lock_floor", { floor }, "Locking the floor")}>Lock at {lakh(floor)}</Button>
          </div>
        )}
      </div>
      {!can("approver") && !e.floor_locked && <p className="text-xs text-muted-foreground">Only an approver or admin can lock the floor.</p>}
    </Section>
  );
}

const SRC_LABEL: Record<string, string> = { organiser: "You", website: "Website", instagram: "Instagram", web: "Web" };
/** The official way to read the event's own Instagram posts: the organiser connects the account. */
function InstagramConnect() {
  const { data, act, busy, can } = useDesk();
  const ig = data.settings?.instagram;
  if (!ig?.app || !can("operator")) return null;
  return ig.connected ? (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
      <span>Instagram connected as <span className="text-foreground">@{ig.handle}</span>{ig.followers ? ` · ${Number(ig.followers).toLocaleString("en-IN")} followers` : ""}. Your own posts are read for sponsor shout-outs.</span>
      <button type="button" disabled={!!busy} onClick={() => act("instagram_disconnect", {}, "Disconnecting Instagram")} className="underline-offset-2 hover:text-foreground hover:underline">Disconnect</button>
    </p>
  ) : (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/instagram/auth" />}>Connect Instagram</Button>
      <span className="text-xs text-muted-foreground">Reads your own posts' captions, read-only. Business or Creator accounts.</span>
    </div>
  );
}

function PastSponsors() {
  const { data, act, busy, can } = useDesk();
  const e = data.event;
  const list: Any[] = e.past_sponsor_list || [];
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState({ website: e.website || "", instagram: e.instagram || "", known: "" });
  const recheck = async () => { await act("past_sponsors", { links: { website: links.website, instagram: links.instagram, known: links.known.split(",").map((x) => x.trim()).filter(Boolean) } }, "Looking for past sponsors"); setOpen(false); };
  return (
    <Section title="Past sponsors" hint="Contacted first, as returning sponsors.">
      {list.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {list.map((s: Any) => (
            <li key={s.name} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm" title={[s.role, s.year].filter(Boolean).join(", ")}>
              {s.name}
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">{SRC_LABEL[s.source] || s.source}</a> : <span className="text-xs text-muted-foreground">{SRC_LABEL[s.source] || s.source}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">None found yet.</p>}
      {e.links_hint && <p className="text-sm text-warning">{e.links_hint}</p>}
      <InstagramConnect />

      {can("operator") && (open ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input value={links.website} onChange={(x) => setLinks({ ...links, website: x.target.value })} placeholder="Website" aria-label="Event website" />
            <Input value={links.instagram} onChange={(x) => setLinks({ ...links, instagram: x.target.value })} placeholder="@instagram" aria-label="Instagram handle" />
          </div>
          <Input value={links.known} onChange={(x) => setLinks({ ...links, known: x.target.value })} placeholder="Names you know, comma separated" aria-label="Past sponsors you know" />
          <div className="flex gap-2"><Button size="sm" disabled={!!busy} onClick={recheck}>Save and search</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </div>
      ) : <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add links or names</Button>)}
    </Section>
  );
}

/** A number anyone can type, 1 to `max`. Empty while typing; leaving it empty falls back to 1. */
function NumberBox({ value, max, label, onChange, className }: { value: number; max: number; label: string; onChange: (v: number) => void; className?: string }) {
  const [text, setText] = useState(String(value));
  return (
    <input type="number" inputMode="numeric" min={1} max={max} aria-label={label} value={text}
      onChange={(x) => { setText(x.target.value); const v = Math.round(Number(x.target.value)); if (v >= 1) onChange(Math.min(max, v)); }}
      onBlur={() => { const v = Math.max(1, Math.min(max, Math.round(Number(text)) || 1)); setText(String(v)); onChange(v); }}
      className={cn("h-full bg-transparent px-2 py-1 text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} />
  );
}

function Prefs() {
  const { data, act, busy, can } = useDesk();
  const e = data.event;
  const [cats, setCats] = useState<string[]>(e.sponsor_categories || []);
  const [brands, setBrands] = useState<string>((e.wanted_brands || []).join(", "));
  const [counts, setCounts] = useState<Record<string, number>>(e.category_counts || {});
  const [people, setPeople] = useState<number>(e.contacts_per_company || 2);
  const n = (id: string) => counts[id] || 2;
  const total = cats.reduce((s, id) => s + n(id), 0);
  const dirty = JSON.stringify(cats) !== JSON.stringify(e.sponsor_categories || []) || brands !== (e.wanted_brands || []).join(", ") || cats.some((id) => n(id) !== (e.category_counts || {})[id]) || people !== (e.contacts_per_company || 2);
  return (
    <Section title="Looking for" hint={cats.length ? `${total} sponsors: discovery fills each category to its number.` : "None picked: the desk chooses."}>
      <div className="flex flex-wrap gap-1.5">
        {SPONSOR_CATEGORIES.map((c) => {
          const on = cats.includes(c.id);
          return (
            <span key={c.id} className={cn("inline-flex items-center overflow-hidden rounded-md border text-sm transition", on ? "border-primary" : "")}>
              <button type="button" aria-pressed={on} title={c.hint} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])} className={cn("px-2.5 py-1", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>
              {on && <NumberBox value={n(c.id)} max={50} label={`How many ${c.label}`} onChange={(v) => setCounts({ ...counts, [c.id]: v })} className="w-12 border-0 border-l" />}
            </span>
          );
        })}
      </div>
      <Input value={brands} onChange={(x) => setBrands(x.target.value)} placeholder="Brands you want, comma separated" aria-label="Brands you want" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>People to find per company</span>
        <NumberBox value={people} max={50} label="People to find per company" onChange={setPeople} className="w-16 rounded-md border" />
        <span className="text-xs text-muted-foreground">Verified work emails only. Emails go 3 at a time.</span>
      </div>
      {dirty && <Button size="sm" disabled={!!busy || !can("operator")} onClick={() => act("prefs", { prefs: { categories: cats, people, counts: Object.fromEntries(cats.map((id) => [id, n(id)])), brands: brands.split(",").map((b) => b.trim()).filter(Boolean) } }, "Saving preferences")}>Save</Button>}
    </Section>
  );
}

function Sources() {
  const { data } = useDesk();
  const list: Any[] = data.event.sources || [];
  if (!list.length) return null;
  return (
    <Section title="Sources" hint="Pages the desk read.">
      <ul className="space-y-2 text-sm">
        {list.slice(0, 8).map((s: Any, i: number) => (
          <li key={i} className="min-w-0"><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground hover:text-foreground"><ExternalLink className="size-3.5 shrink-0" /><span className="truncate">{s.title || host(s.url)}</span></a></li>
        ))}
      </ul>
    </Section>
  );
}

export default function BriefPage() {
  const { data } = useDesk();
  const e = data.event;
  const [redo, setRedo] = useState(false);
  if (!e || redo) {
    return (
      <>
        <PageHeader title={e ? "New brief" : "Set up your event"} description="A complete brief gives sharper prices and better-matched sponsors.">
          {e && <Button variant="ghost" onClick={() => setRedo(false)}><X />Cancel</Button>}
        </PageHeader>
        <BriefComposer onDone={() => setRedo(false)} />
      </>
    );
  }
  return (
    <>
      <PageHeader title={e.name} description={e.one_line}>
        <Button variant="outline" onClick={() => setRedo(true)}>New brief</Button>
      </PageHeader>
      <div>
        <Tiers />
        <Details />
        <PastSponsors />
        <Prefs />
        <Sources />
      </div>
    </>
  );
}
