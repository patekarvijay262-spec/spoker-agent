"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readBrief } from "@/lib/brief-parse";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

import { useDesk } from "./desk-provider";
import type { Any } from "./format";

const EXAMPLE = "Aavhan 2027, IIT Bombay, 24 to 26 Jan 2027, Mumbai, 15,000 footfall, college athletes and students from 120 colleges, goal ₹50 lakh, IIT Bombay Gymkhana, Powai, Mumbai 400076";
const ADD: Record<string, string> = {
  name: "Your Event 2027", organiser: "Organising institute or club", dates: "dates like 24 to 26 Jan 2027", city: "city", footfall: "15,000 footfall",
  audience: "who attends, e.g. college students and young professionals", goal: "goal ₹50 lakh", address: "postal address with 6-digit PIN",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div className="space-y-1"><h2 className="font-medium">{title}</h2>{hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>
      <div className="min-w-0 space-y-4">{children}</div>
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

  function add(key: string) {
    const sep = text.trim() ? (text.trim().endsWith(",") ? " " : ", ") : "";
    const snippet = ADD[key];
    const next = text.trimEnd() + sep + snippet;
    setText(next);
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length - snippet.length, next.length);
    });
  }
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

  return (
    <div>
      <Section title="Your event" hint="Describe it the way you would to a sponsor.">
        <div className="space-y-2">
          <Textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={5} aria-label="Describe your event"
            placeholder="Name and year, organiser, dates, city, footfall, who attends, goal in ₹, postal address with PIN"
            className="min-h-32 resize-y text-base leading-relaxed" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Name and dates are enough to start. Add the rest whenever you like.</span>
            {!text && <button type="button" onClick={() => setText(EXAMPLE)} className="underline-offset-2 hover:text-foreground hover:underline">Use an example</button>}
          </div>
        </div>
      </Section>

      <Section title="Signature" hint="Signs every email.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="snd-name">Name</Label><Input id="snd-name" value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="snd-title">Title</Label><Input id="snd-title" value={sender.title} onChange={(e) => setSender({ ...sender, title: e.target.value })} placeholder="Head, Sponsorships" /></div>
          <div className="space-y-1.5"><Label htmlFor="snd-phone">Phone</Label><Input id="snd-phone" value={sender.phone} onChange={(e) => setSender({ ...sender, phone: e.target.value })} inputMode="tel" /></div>
        </div>
      </Section>

      <Section title="Past sponsors" hint="They show the level of company you can reach, and they are your warmest leads.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="lnk-web">Website</Label><Input id="lnk-web" value={links.website} onChange={(e) => setLinks({ ...links, website: e.target.value })} placeholder="aavhan.iitb.ac.in" inputMode="url" /></div>
          <div className="space-y-1.5"><Label htmlFor="lnk-ig">Instagram</Label><Input id="lnk-ig" value={links.instagram} onChange={(e) => setLinks({ ...links, instagram: e.target.value })} placeholder="@aavhan_iitb" /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="lnk-known">Past sponsors you remember</Label><Input id="lnk-known" value={links.known} onChange={(e) => setLinks({ ...links, known: e.target.value })} placeholder="Red Bull, boAt, Zomato" /></div>
        <p className="text-xs text-muted-foreground">The desk also reads your website and Instagram for more.</p>
      </Section>

      <Section title="Preferences" hint="Optional. Otherwise the desk picks what fits.">
        {!prefsOpen ? (
          <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>Choose categories and brands<ChevronDown /></Button>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_CATEGORIES.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} title={c.hint} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])}
                    className={cn("rounded-md border px-2.5 py-1 text-sm transition", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>
                );
              })}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addBrand(); }} className="flex gap-2">
              <Input value={brandIn} onChange={(e) => setBrandIn(e.target.value)} placeholder="Brands you want, e.g. Red Bull, Decathlon" aria-label="Brands you have in mind" />
              <Button type="submit" variant="outline" disabled={!brandIn.trim()}>Add</Button>
            </form>
            {!!brands.length && (
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b) => <span key={b} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">{b}<button type="button" aria-label={`Remove ${b}`} onClick={() => setBrands(brands.filter((x) => x !== b))} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button></span>)}
              </div>
            )}
          </>
        )}
      </Section>

      {clarify && (
        <Section title="A few questions" hint={clarify.found}>
          <ol className="list-decimal space-y-1 pl-5 text-sm">{(clarify.questions || []).map((q: string, i: number) => <li key={i}>{q}</li>)}</ol>
          <Textarea value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="Your answers" aria-label="Your answers" />
          <Button disabled={!!busy || !answers.trim()} onClick={() => submit(answers)}>Answer and continue</Button>
        </Section>
      )}

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        {!sender.name && <span className="text-xs text-muted-foreground">Add your name to continue</span>}
        <Button size="lg" disabled={!!busy || !read.fields[0].found || !sender.name} onClick={() => submit()}>
          {busy?.op === "brief" ? <><Loader2 className="animate-spin" />Packaging…</> : "Package my event"}
        </Button>
      </div>
    </div>
  );
}
