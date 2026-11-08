"use client";

import { type ReactNode, useState } from "react";

import { cn } from "cn";
import { Check, ExternalLink, Lock, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/desk/bits";
import { BriefComposer } from "@/components/desk/brief-composer";
import { ConnectorStrip, MicButton, PromptBar } from "@/components/desk/composer-tools";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, api, host, inr, lakh } from "@/components/desk/format";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

// Compact cards that sit two to a row on wide screens, so most of the event fits in one or two scrolls.
function Section({ title, hint, children, tour, wide }: { title: string; hint?: ReactNode; children: ReactNode; tour?: string; wide?: boolean }) {
  return (
    <section className={cn("min-w-0 space-y-2.5 rounded-xl border bg-card p-3.5", wide && "lg:col-span-2")} data-tour={tour}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div>
      <div className="min-w-0 space-y-2.5">{children}</div>
    </section>
  );
}

/** Every detail stays editable: dates are often fixed after the brief, the address or signature change. */
function EditDetails({ onDone }: { onDone: () => void }) {
  const { data, load, flash, busy } = useDesk();
  const e = data.event;
  const [f, setF] = useState({ organizer: e.organizer || "", dates: e.dates || "", city: e.city || "", website: e.website || "", reach: String(e.reach || ""), postal_address: e.postal_address || "", name: e.sender?.name || "", title: e.sender?.title || "", phone: e.sender?.phone || "" });
  const field = (k: keyof typeof f, label: string, extra: Any = {}) => (
    <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">{label}</span><Input value={f[k]} onChange={(x) => setF({ ...f, [k]: x.target.value })} {...extra} /></label>
  );
  const save = async () => {
    const reach = Math.round(Number(f.reach.replace(/[^\d.]/g, "")) || 0);
    const profile = { ...e, organizer: f.organizer.trim(), dates: f.dates.trim(), city: f.city.trim(), website: f.website.trim(), postal_address: f.postal_address.trim(),
      ...(reach ? { reach, audience_short: String(e.audience_short || "").replace(/^[\d,]+\s*/, `${reach.toLocaleString("en-IN")} `) } : {}),
      sender: { ...(e.sender || {}), name: f.name.trim(), title: f.title.trim(), phone: f.phone.trim() } };
    try { await api("/api/event", { profile }); await load(); flash("Details saved", undefined, "success"); onDone(); }
    catch (x: Any) { flash("Could not save", x.message, "error"); }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("dates", "Dates", { placeholder: "18 to 21 Dec 2027" })}
        {field("city", "City")}
        {field("organizer", "Organiser")}
        {field("website", "Website", { inputMode: "url" })}
        {field("reach", "Expected footfall", { inputMode: "numeric" })}
        {field("postal_address", "Postal address (under every email)")}
        {field("name", "Your name")}
        {field("title", "Your title")}
        {field("phone", "Your phone", { inputMode: "tel" })}
      </div>
      <div className="flex gap-2"><Button disabled={!!busy} onClick={save}><Check />Save</Button><Button variant="ghost" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}

function Details() {
  const { data, can } = useDesk();
  const [editing, setEditing] = useState(false);
  const e = data.event;
  if (editing) return <Section title="Details"><EditDetails onDone={() => setEditing(false)} /></Section>;
  const verified = (e.proof_items || []).filter((p: Any) => p.verified);
  const rows: [string, ReactNode][] = [
    ["Organiser", e.organizer], ["Dates", [e.dates, e.days > 1 ? `${e.days} days` : ""].filter(Boolean).join(" · ")], ["City", e.city],
    ["Website", e.website ? <a className="underline-offset-2 hover:underline" href={e.website} target="_blank" rel="noreferrer">{host(e.website)}</a> : null],
    ["Instagram", e.instagram ? <a className="underline-offset-2 hover:underline" href={`https://www.instagram.com/${e.instagram}/`} target="_blank" rel="noreferrer">@{e.instagram}{e.social_followers ? ` · ${Number(e.social_followers).toLocaleString("en-IN")} followers` : ""}</a> : null],
    ["Audience", e.audience_short || e.audience], ["Proof", verified.length ? verified.map((p: Any) => p.claim).join("; ") : e.proof],
    ["Signature", [e.sender?.name, e.sender?.title, e.postal_address].filter(Boolean).join(", ")],
  ];
  return (
    <Section title="Details" tour="details">
      <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0">{v || <span className="text-muted-foreground">—</span>}</dd></div>)}
      </dl>
      {can("operator") && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil />Edit details</Button>}
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
    <Section wide title="Prices" hint={<span title={e.pricing_basis}>Suggested from your audience size. Change anything, any time.</span>}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-4">
        {tiers.map((t: Any, i: number) => (
          <div key={i} className="flex flex-col gap-1 bg-card px-3 py-2.5">
            {edit ? (
              <>
                <Input value={t.name} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, name: x.target.value } : y)))} aria-label="Tier name" />
                <Input type="number" value={t.price_inr} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, price_inr: Number(x.target.value) } : y)))} aria-label={`${t.name} price`} />
                <Textarea value={t.deliverables} onChange={(x) => setTiers(tiers.map((y, j) => (j === i ? { ...y, deliverables: x.target.value } : y)))} aria-label={`${t.name} deliverables`} />
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">{t.name}</div>
                <div className="text-xl font-semibold tracking-tight num">{lakh(t.price_inr)}</div>
                <div className="line-clamp-1 text-xs text-muted-foreground" title={t.deliverables}>{t.deliverables}</div>
              </>
            )}
          </div>
        ))}
      </div>
      {can("operator") && (
        <Button variant="ghost" size="sm" onClick={() => (edit ? save() : setEdit(true))}>{edit ? <><Check />Save tiers</> : <><Pencil />Edit tiers</>}</Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Lock className="size-3.5" />Lowest you would accept</div>
          <p className="text-xs text-muted-foreground">Agents never agree below this without you. Sponsors never see it.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" value={floor} onChange={(x) => setFloor(Number(x.target.value))} className="h-8 w-32" aria-label="Lowest price in rupees" />
          {(floor !== Number(e.floor_inr) || !e.floor_locked) && <Button variant="outline" disabled={!!busy || !floor || !can("approver")} onClick={() => act("lock_floor", { floor }, "Saving the lowest price")}>Save {lakh(floor)}</Button>}
        </div>
      </div>
      
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
  const [names, setNames] = useState("");
  const addNames = async () => { await act("add_past_sponsors", { names: names.split(",").map((x) => x.trim()).filter(Boolean) }, "Adding past sponsors"); setNames(""); };
  const lv = e.sponsor_level;
  return (
    <Section tour="past" title="Past sponsors" hint="They show the level of company you can reach, and they are written to first.">
      {can("operator") && (
        <form className="flex gap-2" onSubmit={(x) => { x.preventDefault(); if (names.trim()) addNames(); }}>
          <Input value={names} onChange={(x) => setNames(x.target.value)} placeholder="Add past sponsors, comma separated: Red Bull, SBI, boAt" aria-label="Add past sponsors" />
          <MicButton onText={(t) => setNames((n) => (n ? `${n}, ${t}` : t))} />
          <Button type="submit" variant="outline" disabled={!!busy || !names.trim()}>Add</Button>
        </form>
      )}
      {lv?.min_hc > 0 && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          Level we aim for: companies of about <span className="num">{Number(lv.min_hc).toLocaleString("en-IN")}+</span> people{lv.industries?.length ? <>, like your past sponsors in {lv.industries.slice(0, 3).join(", ")}</> : null}.
        </p>
      )}
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
      {e.links_hint && <p className="text-sm text-muted-foreground">{e.links_hint}</p>}
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
      ) : <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Read our website or Instagram again</Button>)}
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
  const [people, setPeople] = useState<number>(e.contacts_per_company || 12);
  const n = (id: string) => counts[id] || 2;
  const total = cats.reduce((s, id) => s + n(id), 0);
  const dirty = JSON.stringify(cats) !== JSON.stringify(e.sponsor_categories || []) || brands !== (e.wanted_brands || []).join(", ") || cats.some((id) => n(id) !== (e.category_counts || {})[id]) || people !== (e.contacts_per_company || 12);
  return (
    <Section tour="looking" title="Looking for" hint={cats.length ? `${total} sponsors: discovery fills each category to its number.` : "None picked: the desk chooses."}>
      <div className="flex flex-wrap gap-1.5">
        {SPONSOR_CATEGORIES.map((c) => {
          const on = cats.includes(c.id);
          return (
            <span key={c.id} className={cn("inline-flex items-center overflow-hidden rounded-full border text-xs transition", on ? "border-primary" : "")}>
              <button type="button" aria-pressed={on} title={c.hint} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])} className={cn("px-2.5 py-1", on ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>
              {on && <NumberBox value={n(c.id)} max={50} label={`How many ${c.label}`} onChange={(v) => setCounts({ ...counts, [c.id]: v })} className="w-10 border-0 border-l text-xs" />}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-1"><Input value={brands} onChange={(x) => setBrands(x.target.value)} placeholder="Brands you want, comma separated" aria-label="Brands you want" /><MicButton onText={(t) => setBrands((b) => (b ? `${b}, ${t}` : t))} /></div>
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
  const seen = new Set<string>();
  const list: Any[] = (data.event.sources || []).filter((s: Any) => { const k = (s.title || host(s.url)).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  if (!list.length) return null;
  return (
    <Section title="Sources" hint={`${list.length} pages the desk read`}>
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {list.slice(0, 8).map((s: Any, i: number) => (
          <li key={i} className="min-w-0 max-w-full"><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="size-3 shrink-0" /><span className="truncate">{s.title || host(s.url)}</span></a></li>
        ))}
      </ul>
    </Section>
  );
}

/** The Claude-style prompt bar: say any change in plain words, by typing, speaking or adding a file. */
function TellTheDesk() {
  const { data, act, busy, can, flash } = useDesk();
  const notes: string[] = data.event.notes || [];
  if (!can("operator")) return null;
  return (
    <div className="space-y-2">
      <PromptBar tour="event-prompt" busy={busy?.op === "event_text"}
        placeholder="Tell the desk anything: new dates, footfall, goal, past sponsors, brands you want…"
        hint="Type, speak, or add a file"
        onSubmit={async (text) => {
          const r = await act("event_text", { text }, "Updating your event");
          if (r?.changed?.length) flash("Event updated", r.changed.join(", "), "success");
          return !!r;
        }} />
      {notes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {notes.map((n, i) => (
            <li key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
              <span className="truncate" title={n}>{n}</span>
              <button type="button" aria-label="Remove this note" className="text-muted-foreground hover:text-foreground" onClick={() => act("event_note_remove", { index: i }, "Removing the note")}><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
        <Button variant="outline" size="sm" onClick={() => setRedo(true)}>New brief</Button>
      </PageHeader>
      <TellTheDesk />
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Tiers />
        <Details />
        <PastSponsors />
        <Prefs />
        <Sources />
      </div>
      <ConnectorStrip />
    </>
  );
}
