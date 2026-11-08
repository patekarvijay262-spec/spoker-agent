"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import { ChevronDown, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readBrief } from "@/lib/brief-parse";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

import { MicButton, PlusMenu } from "./composer-tools";
import { useDesk } from "./desk-provider";
import type { Any } from "./format";

const EXAMPLE = "Aavhan 2027, IIT Bombay, 24 to 26 Jan 2027, Mumbai, 15,000 footfall, college athletes and students from 120 colleges, goal ₹50 lakh, IIT Bombay Gymkhana, Powai, Mumbai 400076";

/** A small titled card; three of them sit side by side under the composer on wide screens. */
function Card({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 space-y-2.5 rounded-xl border bg-card p-3.5", className)}>
      <div><h2 className="text-sm font-semibold tracking-tight">{title}</h2>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </section>
  );
}

export function BriefComposer({ onDone, initial = "" }: { onDone?: () => void; initial?: string }) {
  const { act, busy, me, data } = useDesk();
  const [text, setText] = useState(initial);
  const [cats, setCats] = useState<string[]>(data?.event?.sponsor_categories || []);
  const [brands, setBrands] = useState<string[]>(data?.event?.wanted_brands || []);
  const [brandIn, setBrandIn] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(!!(data?.event?.sponsor_categories?.length || data?.event?.wanted_brands?.length));
  const [sender, setSender] = useState({ name: me?.name || "", title: "", phone: "" });
  const [clarify, setClarify] = useState<Any>(null);
  const [answers, setAnswers] = useState("");
  const [links, setLinks] = useState({ website: data?.event?.website || "", instagram: data?.event?.instagram || "", known: "" });
  // An unfinished brief is kept per person on this device, so signing out or closing the tab loses nothing.
  const draftKey = `sd_brief_draft:${me?.id || ""}`;
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !me?.id) return;
    restored.current = true;
    try { const s = JSON.parse(localStorage.getItem(draftKey) || "null"); if (s && !initial) { if (s.text) setText(s.text); if (s.links) setLinks(s.links); } } catch { /* storage blocked */ }
  }, [me?.id, draftKey, initial]);
  useEffect(() => {
    if (!restored.current) return;
    try { if (text || links.website || links.instagram || links.known) localStorage.setItem(draftKey, JSON.stringify({ text, links })); } catch { /* storage blocked */ }
  }, [text, links, draftKey]);
  const area = useRef<HTMLTextAreaElement>(null);
  const read = useMemo(() => readBrief(text), [text]);

  function addBrand() {
    const b = brandIn.split(",").map((x) => x.trim()).filter(Boolean);
    if (b.length) setBrands([...new Set([...brands, ...b])].slice(0, 25));
    setBrandIn("");
  }
  async function submit(withAnswers = "") {
    const parts = text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const addr = parts.find((p) => /\b\d{6}\b/.test(p));
    const audience = read.fields.find((f) => f.key === "audience")?.found;
    const ans = [withAnswers, addr ? `Address: ${parts.slice(Math.max(0, parts.indexOf(addr) - 2), parts.indexOf(addr) + 1).join(", ")}` : "", audience ? `Audience: ${audience}` : ""].filter(Boolean).join("\n");
    const r = await act("brief", { line: text.replace(/\n+/g, ", "), answers: ans, sender, prefs: { categories: cats, brands }, links: { website: links.website, instagram: links.instagram, known: links.known.split(",").map((x) => x.trim()).filter(Boolean) } }, links.website || links.instagram ? "Reading your website and Instagram, then pricing" : "Checking the web, then pricing");
    if (r?.clarify) { setClarify(r.clarify); return; }
    if (r?.profile) { setClarify(null); try { localStorage.removeItem(draftKey); } catch { /* storage blocked */ } onDone?.(); }
  }

  const append = (t: string) => {
    if (!t) return;
    setText((cur) => { const c = cur.trimEnd(); return c ? `${c}${/[.,\n]$/.test(c) ? " " : ", "}${t}` : t; });
  };
  const lbl = "text-xs text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* The event, the way you would tell a sponsor. Type, speak, or add files. */}
      <div className="rounded-2xl border bg-card shadow-sm transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20" data-tour="composer">
        <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label="Describe your event"
          placeholder="Tell the desk about your event: name and year, organiser, dates, city, footfall, who attends, goal in ₹, postal address with PIN"
          className="block max-h-80 min-h-28 w-full resize-y rounded-t-2xl bg-transparent px-4 pt-3.5 pb-1 text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
          <PlusMenu onText={append} />
          <MicButton onText={append} />
          <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">{text ? "Name and dates are enough to start." : <>Name and dates are enough. <button type="button" onClick={() => setText(EXAMPLE)} className="underline underline-offset-2 hover:text-foreground">Use an example</button></>}</span>
          <div className="ml-auto flex items-center gap-2">
            {!sender.name && <span className="text-xs text-muted-foreground">Add your name below</span>}
            <Button size="sm" className="rounded-full" disabled={!!busy || !read.fields[0].found || !sender.name} onClick={() => submit()}>
              {busy?.op === "brief" ? <><Loader2 className="animate-spin" />Packaging…</> : "Package my event"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
        <Card title="Signature" hint="Signs every email.">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1"><Label htmlFor="snd-name" className={lbl}>Name</Label><Input id="snd-name" value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="snd-title" className={lbl}>Title</Label><Input id="snd-title" value={sender.title} onChange={(e) => setSender({ ...sender, title: e.target.value })} placeholder="Head, Sponsorships" /></div>
            <div className="space-y-1"><Label htmlFor="snd-phone" className={lbl}>Phone</Label><Input id="snd-phone" value={sender.phone} onChange={(e) => setSender({ ...sender, phone: e.target.value })} inputMode="tel" /></div>
          </div>
        </Card>

        <Card title="Past sponsors" hint="They set the level, and they are your warmest leads.">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label htmlFor="lnk-web" className={lbl}>Website</Label><Input id="lnk-web" value={links.website} onChange={(e) => setLinks({ ...links, website: e.target.value })} placeholder="techfest.org" inputMode="url" /></div>
            <div className="space-y-1"><Label htmlFor="lnk-ig" className={lbl}>Instagram</Label><Input id="lnk-ig" value={links.instagram} onChange={(e) => setLinks({ ...links, instagram: e.target.value })} placeholder="@techfest_iitb" /></div>
            <div className="col-span-2 space-y-1"><Label htmlFor="lnk-known" className={lbl}>Names you remember</Label>
              <div className="flex items-center gap-1"><Input id="lnk-known" value={links.known} onChange={(e) => setLinks({ ...links, known: e.target.value })} placeholder="Red Bull, boAt, Zomato" />
                <MicButton onText={(t) => setLinks((l) => ({ ...l, known: l.known ? `${l.known}, ${t}` : t }))} /></div>
            </div>
          </div>
        </Card>

        <Card title="Preferences" hint="Optional. Otherwise the desk picks what fits.">
          {!prefsOpen ? (
            <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>Choose categories and brands<ChevronDown /></Button>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {SPONSOR_CATEGORIES.map((c) => {
                  const on = cats.includes(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} title={c.hint} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])}
                      className={cn("rounded-full border px-2 py-0.5 text-xs transition", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>
                  );
                })}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addBrand(); }} className="flex gap-1.5">
                <Input value={brandIn} onChange={(e) => setBrandIn(e.target.value)} placeholder="Brands you want" aria-label="Brands you have in mind" />
                <Button type="submit" size="sm" variant="outline" disabled={!brandIn.trim()}>Add</Button>
              </form>
              {!!brands.length && (
                <div className="flex flex-wrap gap-1">
                  {brands.map((b) => <span key={b} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">{b}<button type="button" aria-label={`Remove ${b}`} onClick={() => setBrands(brands.filter((x) => x !== b))} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button></span>)}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {clarify && (
        <Card title="A few questions" hint={clarify.found}>
          <ol className="list-decimal space-y-1 pl-5 text-sm">{(clarify.questions || []).map((q: string, i: number) => <li key={i}>{q}</li>)}</ol>
          <div className="flex items-start gap-1"><Textarea value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="Your answers" aria-label="Your answers" />
            <MicButton onText={(t) => setAnswers((a) => (a ? `${a} ${t}` : t))} /></div>
          <Button size="sm" disabled={!!busy || !answers.trim()} onClick={() => submit(answers)}>Answer and continue</Button>
        </Card>
      )}
    </div>
  );
}
