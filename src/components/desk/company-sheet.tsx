"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import {
  AlertTriangle, Building2, CalendarClock, Check, Copy, ExternalLink, FileSignature, Globe, Landmark, Mail, MapPin, MessageSquareReply, Phone, Presentation,
  ChevronDown, MessageCircle, NotebookPen, RefreshCw, Star, Target, Users, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { PriorityBadge, StageBadge, VerifyBadge } from "./bits";
import { useDesk } from "./desk-provider";
import { actorName, type Any, api, brandName, host, humanLog, inr, lakh, localInput, MODEL_LABEL, money, nextSlots, STAGE_LABEL, when } from "./format";
import { useVoice } from "./use-voice";

export function CompanySheet() {
  const { data, companyId, closeCompany } = useDesk();
  const c = (data?.companies || []).find((x: Any) => x.id === companyId);
  return (
    <Sheet open={!!c} onOpenChange={(o) => !o && closeCompany()}>
      <SheetContent side="right" showCloseButton={false} initialFocus={false} className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-3xl">
        {c && <CompanyBody c={c} />}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ icon: Icon, children }: { icon: Any; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{children}</span>;
}

function CompanyBody({ c }: { c: Any }) {
  const { data, act, busy, closeCompany, ask } = useDesk();
  const contacts = (data.contacts || []).filter((x: Any) => x.company_id === c.id);
  const primary = contacts.find((x: Any) => x.is_primary) || contacts[0];
  const r = c.reasons || {};
  const ab = r.about || {};
  const brand = brandName(c);
  const why: string[] = r.why_fit || [];
  const watch: string[] = r.watch_outs || [];
  const sig: Any[] = (r.signals || []).filter((s: Any) => !/^(Negative|Caution)/.test(s.claim));
  const risk: Any[] = (r.signals || []).filter((s: Any) => /^(Negative|Caution)/.test(s.claim));
  const drafts = (data.messages || []).filter((m: Any) => m.company_id === c.id && m.status === "drafted").length;
  const [tab, setTab] = useState("overview");
  const [whyOpen, setWhyOpen] = useState(false);
  useEffect(() => { setTab("overview"); setWhyOpen(false); }, [c.id]);

  return (
    <div className="min-h-full">
      <div className="shrink-0 px-5 pt-6 pb-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <SheetTitle className="text-xl font-semibold tracking-tight">{c.name}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <PriorityBadge p={c.priority} />
              <StageBadge stage={c.stage} />
              {c.price_range && <span className="text-sm text-muted-foreground">{money(c.price_range)}</span>}
              {r.past_sponsor && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3" />Past sponsor</span>}
              {r.requested && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3" />You asked for it</span>}
            </SheetDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={closeCompany} aria-label="Close"><X /></Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {drafts > 0 && <Button size="sm" nativeButton={false} render={<a href="/desk/outbox" />}>{drafts} draft to approve</Button>}
          <Button size="sm" variant="outline" onClick={() => ask(`Tell me about ${brand}`)}><MessageCircle />Ask</Button>
          {c.domain && <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`https://${host(c.domain)}`} target="_blank" rel="noreferrer" />}><Globe />{host(c.domain)}</Button>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-0">
        <div className="sticky top-0 z-10 overflow-x-auto border-b bg-popover/95 px-5 backdrop-blur scrollbar-thin sm:px-8">
          <TabsList variant="line" className="h-11 w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="next">Next steps</TabsTrigger>
            <TabsTrigger value="people">People {contacts.length ? `(${contacts.length})` : ""}</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 p-5 sm:p-8">
          <section>
            <p className="text-sm leading-relaxed">{ab.description || c.why_now || "No description on Crustdata yet."}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {ab.industry && <Fact icon={Target}>{ab.industry}</Fact>}
              {ab.headcount && <Fact icon={Users}>{Number(ab.headcount).toLocaleString("en-IN")} people</Fact>}
              {ab.founded && <Fact icon={CalendarClock}>Founded {ab.founded}</Fact>}
              {ab.hq && <Fact icon={MapPin}>{ab.hq}</Fact>}
              {ab.funding_total_usd && <Fact icon={Landmark}>USD {+(ab.funding_total_usd / 1e6).toFixed(1)}M raised{ab.last_round ? ` · last: ${ab.last_round}` : ""}</Fact>}
            </div>
          </section>

          {c.intersection != null && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y py-4 text-sm" title="Fit is the lower of the two scores, so a rich brand with no audience match cannot jump the queue.">
              <div><dt className="text-muted-foreground">Fit</dt><dd className="text-2xl tracking-tight num">{c.intersection}</dd></div>
              <div><dt className="text-muted-foreground">Our view</dt><dd className="text-2xl tracking-tight text-muted-foreground num">{c.our_pov}</dd></div>
              <div><dt className="text-muted-foreground">Their view</dt><dd className="text-2xl tracking-tight text-muted-foreground num">{c.their_pov}</dd></div>
            </dl>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Why it fits</h3>
            {why.length ? (
              <>
                <ul className="space-y-2">
                  {why.slice(0, whyOpen ? why.length : 3).map((w, i) => <li key={i} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-foreground" /><span>{w}</span></li>)}
                </ul>
                {why.length > 3 && !whyOpen && <button type="button" onClick={() => setWhyOpen(true)} className="text-sm text-muted-foreground hover:text-foreground">{why.length - 3} more</button>}
              </>
            ) : <p className="text-sm text-muted-foreground">Score this company to see why it fits.</p>}
          </section>

          {(watch.length > 0 || risk.length > 0) && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-warning"><AlertTriangle className="size-4" />Watch out</h3>
              <ul className="space-y-1.5 text-sm">
                {watch.map((w, i) => <li key={i}>• {w}</li>)}
                {!watch.length && risk.map((s, i) => <li key={i}>• {s.claim}</li>)}
              </ul>
            </section>
          )}

          {c.our_pov == null ? (
            <section className="rounded-lg border border-dashed p-5 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Not scored yet. About 10 Crustdata credits.</p>
              <Button disabled={!!busy} onClick={() => act("analyze", { company_id: c.id }, `Scoring ${c.name}`)}>Score and find the contact</Button>
            </section>
          ) : (
            <details className="group rounded-xl border">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">How the score was worked out<ChevronDown className="float-right size-4 text-muted-foreground transition group-open:rotate-180" /></summary>
              <div className="grid gap-6 border-t p-4 md:grid-cols-2">
                {(["our_pov", "their_pov"] as const).map((k) => (
                  <div key={k}>
                    <div className="mb-3 text-sm text-muted-foreground">{k === "our_pov" ? "Why we want them" : "Why they would say yes"}</div>
                    <div className="space-y-3">
                      {(r[k]?.factors || []).map((f: Any, i: number) => (
                        <div key={i} title={f.why}>
                          <div className="flex items-center justify-between text-xs"><span>{f.factor}</span><span className="num text-muted-foreground">{f.points}/{f.max}</span></div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${(f.points / Math.max(1, f.max)) * 100}%` }} /></div>
                          <div className="mt-1 text-xs text-muted-foreground">{f.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {(sig.length > 0 || risk.length > 0) && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Signals</h3>
              <ol className="relative space-y-3 border-l pl-4">
                {[...sig, ...risk].map((s: Any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className={cn("absolute -left-[0.3125rem] mt-1.5 size-2.5 rounded-full border-2 border-background", /^(Negative|Caution)/.test(s.claim) ? "bg-warning" : "bg-foreground/60")} />
                    <div>{s.claim}</div>
                    <div className="text-xs text-muted-foreground">
                      {/^https?:/.test(s.source || "") ? <a className="underline-offset-2 hover:underline" href={s.source} target="_blank" rel="noreferrer">{host(s.source)}</a> : (s.source === "crustdata" ? "Crustdata" : s.source)}
                      {s.date && s.date !== "unknown" ? ` · ${s.date}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {primary && (
            <button type="button" onClick={() => setTab("people")} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:bg-muted/50">
              <div className="grid size-9 place-items-center rounded-md border bg-muted text-sm text-muted-foreground">{String(primary.full_name || "?").slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Decision maker</div>
                <div className="truncate text-sm font-medium">{primary.full_name} <span className="font-normal text-muted-foreground">· {primary.position}</span></div>
              </div>
              <VerifyBadge s={primary.email_status} />
            </button>
          )}
        </TabsContent>

        <TabsContent value="next" className="p-5 sm:p-8"><NextSteps c={c} primary={primary} /></TabsContent>
        <TabsContent value="people" className="space-y-4 p-5 sm:p-8">
          {contacts.length ? [...contacts].sort((a: Any, b: Any) => (b.is_primary - a.is_primary) || ((b.relevance ?? -1) - (a.relevance ?? -1))).map((ct: Any) => <ContactCard key={ct.id} ct={ct} co={c} />)
            : <p className="text-sm text-muted-foreground">No decision maker yet. Score the company to find the right people.</p>}
          <Button variant="outline" disabled={!!busy} onClick={() => act("rediscover", { company_id: c.id }, `Rediscovering people at ${c.name}`)}><RefreshCw className="size-4" />Find people again</Button>
        </TabsContent>
        <TabsContent value="timeline" className="p-5 sm:p-8"><Timeline c={c} /></TabsContent>
      </Tabs>
    </div>
  );
}

export function ContactCard({ ct, co }: { ct: Any; co: Any }) {
  const { act, busy, flash } = useDesk();
  const [mail, setMail] = useState("");
  const parts: Any[] = ct.relevance_parts || [];
  const kind = ct.is_primary ? "Primary" : ct.kind === "fallback" ? "Fallback" : "Alternative";
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => flash("Copied", t, "success")).catch(() => flash("Copy failed", "Select the text and copy it instead.", "error")); };
  return (
    <div className={cn("rounded-xl border p-4", ct.is_primary && "border-foreground/30")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="font-medium">{ct.full_name}</span><span className={cn("rounded-md border px-1.5 text-xs", ct.is_primary ? "border-transparent bg-primary text-primary-foreground" : "text-muted-foreground")}>{kind}</span></div>
          <div className="text-sm text-muted-foreground">{[ct.position, ct.department].filter(Boolean).join(" · ")}</div>
        </div>
        {ct.relevance != null && <div className="rounded-xl bg-muted px-2.5 py-1 text-center"><div className="text-lg font-semibold leading-none num">{ct.relevance}</div><div className="text-[0.6rem] text-muted-foreground">relevance</div></div>}
      </div>
      {ct.reason && <p className="mt-2 text-sm"><span className="font-medium">Why this person:</span> {ct.reason}</p>}
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0 text-muted-foreground" />{ct.email ? <><span className="truncate">{ct.email}</span><VerifyBadge s={ct.email_status} /></> : <span className="text-muted-foreground">No work email found</span>}</div>
        <div className="flex min-w-0 items-center gap-2"><Phone className="size-4 shrink-0 text-muted-foreground" />{ct.phone ? <span className="truncate">{ct.phone}{ct.phone_type === "switchboard" ? " (switchboard)" : ""}</span> : <span className="text-muted-foreground">No business phone</span>}</div>
      </div>
      {ct.warm_path && <p className="mt-2 rounded-lg bg-success/10 px-3 py-1.5 text-xs text-success">{ct.warm_path}</p>}
      {(ct.email_check || []).length > 0 && <p className="mt-2 text-[0.7rem] text-muted-foreground">Checks: {ct.email_check.join(" · ")}</p>}
      {parts.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">How the {ct.relevance}/100 was worked out</summary>
          <div className="mt-2 space-y-1">{parts.map((p: Any, i: number) => <div key={i} className="flex gap-2"><span className="w-44 shrink-0">{p.factor}</span><span className="w-12 num">{p.points}/{p.max}</span><span className="text-muted-foreground">{p.why}</span></div>)}</div>
        </details>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {ct.email && <Button size="sm" variant="outline" onClick={() => copy(ct.email)}><Copy className="size-3.5" />Copy email</Button>}
        {(ct.evidence || [])[0]?.url && <Button size="sm" variant="outline" nativeButton={false} render={<a href={ct.evidence[0].url} target="_blank" rel="noreferrer" />}><ExternalLink className="size-3.5" />Profile</Button>}
        {!ct.is_primary && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("set_primary", { contact_id: ct.id }, "Changing the primary contact")}>Make primary</Button>}
        {!ct.reviewed_at && ct.email && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("contact_reviewed", { contact_id: ct.id }, "Marking as reviewed")}><Check className="size-3.5" />Mark reviewed</Button>}
        {ct.is_primary && ct.email && <Button size="sm" disabled={!!busy} onClick={() => act("prepare_outreach", { company_id: co.id }, "Preparing the priced offer")}>Prepare offer</Button>}
      </div>
      {!ct.email && (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); act("set_email", { contact_id: ct.id, email: mail }, "Checking the email").then(() => setMail("")); }}>
          <Input value={mail} onChange={(e) => setMail(e.target.value)} placeholder="Add their work email" aria-label={`Email for ${ct.full_name}`} />
          <Button type="submit" disabled={!!busy || !mail}>Add</Button>
        </form>
      )}
    </div>
  );
}

function Step({ id, title, icon: Icon, children, done }: { id: string; title: string; icon: Any; children: React.ReactNode; done?: boolean }) {
  return (
    <section className="relative rounded-lg border bg-card p-4 pl-14">
      <div className={cn("absolute top-4 left-4 grid size-7 place-items-center rounded-lg text-[0.65rem] font-semibold", done ? "bg-success text-white" : "bg-muted text-foreground")}>{done ? <Check className="size-3.5" /> : id}</div>
      <div className="mb-2 flex items-center gap-2 font-medium"><Icon className="size-4 text-muted-foreground" />{title}</div>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function NextSteps({ c, primary }: { c: Any; primary: Any }) {
  const { data, act, busy, me } = useDesk();
  const [sim, setSim] = useState("");
  const [tpl, setTpl] = useState("first_call");
  const [slots, setSlots] = useState(nextSlots(3));
  const [start, setStart] = useState(localInput(2, 11));
  const [mins, setMins] = useState(30);
  const [notes, setNotes] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [tidying, setTidying] = useState(false);
  const dictate = useVoice({ mode: "translate", continuous: true, onText: (text) => { setVoiceNote(""); setNotes((n) => (n ? `${n} ${text}` : text)); }, onError: setVoiceNote });
  const tidy = async () => {
    setTidying(true); setVoiceNote("");
    try { setNotes((await api("/api/voice", { tidy: notes })).text); } catch (e: Any) { setVoiceNote(e.message); } finally { setTidying(false); }
  };
  const tiers = data.event?.tiers || [];
  const t0 = tiers.find((t: Any) => t.name === c.tier) || tiers[0] || {};
  const [ds, setDs] = useState({ tier: t0.name || "", cash_inr: t0.price_inr || 0, deliverables: t0.deliverables || "", in_kind: "", sponsor_entity: "", sponsor_signatory: "", payment_terms: "" });
  const deck = (data.decks || []).find((d: Any) => d.company_id === c.id);
  const meets = (data.meetings || []).filter((m: Any) => m.company_id === c.id);
  const deal = (data.deals || []).find((d: Any) => d.company_id === c.id);
  const lastDigest = meets.find((m: Any) => m.digest)?.digest;
  const sent = (data.messages || []).some((m: Any) => m.company_id === c.id && m.status === "sent");
  return (
    <div className="space-y-3">
      <Step id="A2" title="Priced offer and replies" icon={MessageSquareReply} done={sent}>
        <p className="text-muted-foreground">{primary?.email ? `The offer goes to ${primary.full_name} <${primary.email}>.` : primary ? `${primary.full_name} has no confirmed email yet. Add or check it on the People tab.` : "No contact yet: score the company first."}</p>
        {c.angle && <p className="rounded-xl bg-muted/60 p-3">{c.angle}{c.model ? ` Offer type: ${MODEL_LABEL(c.model)}.` : ""}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("analyze", { company_id: c.id }, `Re-checking ${c.name}`)}><RefreshCw className="size-3.5" />Re-check signals</Button>
        </div>
        <label className="block text-xs font-medium text-muted-foreground" htmlFor={`sim-${c.id}`}>Try a reply (demo, marked as simulated)</label>
        <Textarea id={`sim-${c.id}`} value={sim} onChange={(e) => setSim(e.target.value)} placeholder="e.g. Looks interesting. We could do ₹1.5 lakh this quarter. Can we talk Thursday?" />
        <Button size="sm" variant="outline" disabled={!!busy || !sim || !primary} onClick={() => act("simulate", { company_id: c.id, text: sim }, "Reading the reply").then(() => setSim(""))}>Run the reply through the agents</Button>
      </Step>
      {primary && (
        <Step id="A3" title="Book a meeting" icon={CalendarClock} done={meets.some((m: Any) => m.status === "scheduled")}>
          <p className="text-muted-foreground">Drafts the scheduling email in the same thread. When they pick a time, confirm it to send a Google Meet invite.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground" htmlFor={`tpl-${c.id}`}>Style</label>
              <NativeSelect id={`tpl-${c.id}`} className="w-full" value={tpl} onChange={(e) => setTpl(e.target.value)}>
                {[["first_call", "First call"], ["executive", "Senior executive"], ["assistant", "Via their assistant"], ["team", "Several people"], ["second_meeting", "Follow-up meeting"], ["in_person", "In person"], ["reschedule", "Reschedule"]].map(([v, l]) => <NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>)}
              </NativeSelect></div>
            <div className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Times to offer</span>{slots.map((s, i) => <Input key={i} value={s} aria-label={`Time ${i + 1}`} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} />)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={!!busy || !primary?.email} onClick={() => act("schedule", { company_id: c.id, template: tpl, slots }, "Drafting the scheduling email")}>Draft scheduling email</Button>
            <Input type="datetime-local" className="w-auto" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Meeting time" />
            <NativeSelect value={String(mins)} onChange={(e) => setMins(Number(e.target.value))} aria-label="Length">{[20, 30, 45, 60].map((m) => <NativeSelectOption key={m} value={String(m)}>{m} min</NativeSelectOption>)}</NativeSelect>
            <Button size="sm" disabled={!!busy || !primary?.email} onClick={() => act("confirm_meeting", { company_id: c.id, start, minutes: mins, approver: me?.name }, "Booking the meeting")}>Confirm and invite</Button>
          </div>
          {meets.filter((m: Any) => m.meet_link).slice(0, 1).map((m: Any) => <p key={m.id}>Booked {when(m.start_at)}: <a className="text-primary underline" href={m.meet_link} target="_blank" rel="noreferrer">Google Meet</a></p>)}
        </Step>
      )}
      {c.our_pov != null && (
        <Step id="A4" title={`Pitch deck for ${brandName(c)}`} icon={Presentation} done={!!deck}>
          <p className="text-muted-foreground">Ten slides about their goals, a one-pager and a talk track for your team. The deck link can be shared with the sponsor.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("deck", { company_id: c.id }, `Building the ${brandName(c)} deck`)}>{deck ? "Rebuild deck" : "Build deck"}</Button>
            {deck && <Button size="sm" nativeButton={false} render={<a href={`/d/${deck.id}`} target="_blank" rel="noreferrer" />}>Open deck</Button>}
            {deck && <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/d/${deck.id}?team=1`} target="_blank" rel="noreferrer" />}>With talk track</Button>}
          </div>
        </Step>
      )}
      {primary && (
        <Step id="A5" title="After the meeting" icon={NotebookPen} done={!!lastDigest}>
          <p className="text-muted-foreground">Paste the meeting notes. The agent pulls out goals, budget, objections and promises, drafts the recap, and flags anything below your floor.</p>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste meeting notes here" aria-label="Meeting notes" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy || !data.settings.gmail} onClick={() => act("gemini_notes", { company_id: c.id }, "Looking for meeting notes in Gmail", false).then((r: Any) => r?.text && setNotes(r.text))}>Fetch notes from Gmail</Button>
            {dictate.enabled && <Button size="sm" variant="outline" disabled={!!busy || dictate.working && !dictate.recording} onClick={dictate.toggle}>{dictate.recording ? "Stop dictating" : dictate.working ? "Writing it down" : "Dictate notes (any Indian language)"}</Button>}
            {dictate.enabled && <Button size="sm" variant="outline" disabled={!!busy || !notes || tidying || dictate.recording} onClick={tidy}>{tidying ? "Tidying" : "Tidy with Sarvam"}</Button>}
            <Button size="sm" disabled={!!busy || !notes} onClick={() => act("notes", { company_id: c.id, notes }, "Reading the meeting").then(() => setNotes(""))}>Digest and draft recap</Button>
          </div>
          {voiceNote && <p className="text-xs text-rose-600">{voiceNote}</p>}
          {lastDigest && <div className="rounded-xl bg-muted/60 p-3"><span className="font-semibold">Last meeting · {lastDigest.temperature}</span><p>{lastDigest.summary}</p></div>}
        </Step>
      )}
      {c.our_pov != null && (
        <Step id="A6" title="MOU" icon={FileSignature} done={!!deal}>
          <p className="text-muted-foreground">Drafted from the deal sheet. Amounts below your floor go to your Inbox first.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground" htmlFor={`tier-${c.id}`}>Tier</label>
              <NativeSelect id={`tier-${c.id}`} className="w-full" value={ds.tier} onChange={(e) => { const t = tiers.find((x: Any) => x.name === e.target.value) || {}; setDs({ ...ds, tier: e.target.value, cash_inr: t.price_inr ?? ds.cash_inr, deliverables: t.deliverables ?? ds.deliverables }); }}>
                {tiers.map((t: Any) => <NativeSelectOption key={t.name} value={t.name}>{t.name} · {lakh(t.price_inr)}</NativeSelectOption>)}
              </NativeSelect></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground" htmlFor={`cash-${c.id}`}>Cash in ₹ (0 for in-kind)</label><Input id={`cash-${c.id}`} type="number" value={ds.cash_inr} onChange={(e) => setDs({ ...ds, cash_inr: Number(e.target.value) })} /></div>
            <Input value={ds.sponsor_entity} onChange={(e) => setDs({ ...ds, sponsor_entity: e.target.value })} placeholder="Sponsor legal entity (optional)" aria-label="Sponsor legal entity" />
            <Input value={ds.sponsor_signatory} onChange={(e) => setDs({ ...ds, sponsor_signatory: e.target.value })} placeholder="Sponsor signatory (optional)" aria-label="Sponsor signatory" />
          </div>
          <Textarea value={ds.deliverables} onChange={(e) => setDs({ ...ds, deliverables: e.target.value })} aria-label="Deliverables" />
          <Input value={ds.in_kind} onChange={(e) => setDs({ ...ds, in_kind: e.target.value })} placeholder="In-kind from them, e.g. drinks for 5,000 athletes" aria-label="In-kind" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("mou", { company_id: c.id, deal: ds }, "Drafting the MOU")}>{deal ? "Redraft MOU" : "Draft MOU"}</Button>
            {deal?.share_id && <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/m/${deal.share_id}`} target="_blank" rel="noreferrer" />}>Open MOU</Button>}
            {deal?.share_id && primary?.email && <Button size="sm" disabled={!!busy} onClick={() => act("send_mou", { company_id: c.id }, "Drafting the MOU email")}>Email for signature</Button>}
          </div>
        </Step>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
        Move the stage by hand:
        <NativeSelect value={c.stage} onChange={(e) => act("stage", { company_id: c.id, stage: e.target.value, reason: "manual" })} aria-label="Stage">
          {Object.entries(STAGE_LABEL).map(([k, v]) => <NativeSelectOption key={k} value={k}>{v}</NativeSelectOption>)}
        </NativeSelect>
      </div>
    </div>
  );
}

function Timeline({ c }: { c: Any }) {
  const { data } = useDesk();
  const items = [
    ...(data.messages || []).filter((m: Any) => m.company_id === c.id).map((m: Any) => ({ t: m.sent_at || m.created_at, k: "msg", m })),
    ...(data.replies || []).filter((r: Any) => r.company_id === c.id).map((r: Any) => ({ t: r.received_at, k: "rep", r })),
    ...(data.meetings || []).filter((m: Any) => m.company_id === c.id).map((m: Any) => ({ t: m.start_at || m.created_at, k: "meet", m })),
    ...(data.log || []).filter((l: Any) => l.company_id === c.id && !["stage"].includes(l.action)).map((l: Any) => ({ t: l.ts, k: "log", l })),
  ].sort((a, b) => String(b.t).localeCompare(String(a.t)));
  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing yet.</p>;
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((x: Any, i) => (
        <li key={i} className="text-sm">
          <span className={cn("absolute -left-[0.375rem] mt-1 size-3 rounded-full border-2 border-background", x.k === "msg" ? "bg-primary" : x.k === "rep" ? "bg-foreground" : x.k === "meet" ? "bg-success" : "bg-muted-foreground/40")} />
          <div className="text-xs text-muted-foreground">{when(x.t)}</div>
          {x.k === "msg" && <div className="mt-1 rounded-xl border bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{x.m.subject}</span><span className="text-xs text-muted-foreground">{x.m.status} · to {x.m.to_email}</span></div><pre className="mt-2 font-sans text-xs whitespace-pre-wrap text-muted-foreground">{x.m.body}</pre></div>}
          {x.k === "rep" && <div className="mt-1"><span className="font-semibold">Reply: {x.r.classification}.</span> {x.r.summary} {x.r.offer_inr ? <span className="font-semibold text-foreground">Offered {inr(x.r.offer_inr)}</span> : null}</div>}
          {x.k === "meet" && <div className="mt-1"><span className="font-semibold">Meeting {x.m.n}</span> {x.m.meet_link && <a className="text-primary underline" href={x.m.meet_link} target="_blank" rel="noreferrer">Meet link</a>}{x.m.digest?.summary && <p className="text-muted-foreground">{x.m.digest.summary}</p>}</div>}
          {x.k === "log" && <div className="mt-0.5" title={humanLog(x.l).full}><span className="mr-1.5 text-xs text-muted-foreground">{actorName(x.l.actor)}</span>{humanLog(x.l).text}</div>}
        </li>
      ))}
    </ol>
  );
}
