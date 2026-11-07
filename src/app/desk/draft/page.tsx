"use client";

import { useMemo, useRef, useState } from "react";

import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, brandName } from "@/components/desk/format";
import { fillFor, fillTemplate, STARTER, TOKENS, unknownTokens } from "@/lib/template";

// The organiser writes the email once, the way they would send it; the desk only fits it to each company and person.
// The preview uses a real company and person from the desk, so what you read here is what lands in the Outbox.

const SAMPLE = { co: { name: "Zepto", angle: "Your quick-commerce launches reach exactly the students who order late at night.", tier: "Gold", price_range: "INR 8L–16L" }, ct: { full_name: "Priya Shah", position: "Head of Brand" } };

export default function DraftPage() {
  const { data, act, busy, can } = useDesk();
  const saved = data.settings?.outreach_template;
  const [subject, setSubject] = useState<string>(saved?.subject || STARTER.subject);
  const [body, setBody] = useState<string>(saved?.body || STARTER.body);
  const area = useRef<HTMLTextAreaElement>(null);
  const e = data.event || { name: "Your event", sender: { name: data.me?.name || "" } };

  // People with an email, best first, as preview choices.
  const choices = useMemo(() => {
    const cos: Any[] = data.companies || [];
    return (data.contacts || []).filter((c: Any) => c.email).sort((a: Any, b: Any) => (b.is_primary - a.is_primary) || ((b.relevance ?? 0) - (a.relevance ?? 0)))
      .map((ct: Any) => ({ ct, co: cos.find((c) => c.id === ct.company_id) })).filter((x: Any) => x.co).slice(0, 60);
  }, [data.companies, data.contacts]);
  const [pick, setPick] = useState(0);
  const target = choices[pick] || SAMPLE;
  const v = fillFor(target.co, target.ct, e);
  const bad = unknownTokens(`${subject} ${body}`);
  const waiting = (data.messages || []).filter((m: Any) => m.status === "drafted" && m.sequence === "cold").length;
  const dirty = subject !== (saved?.subject || STARTER.subject) || body !== (saved?.body || STARTER.body) || !saved;

  const insert = (key: string) => {
    const el = area.current;
    const token = `{${key}}`;
    if (!el) return setBody(body + token);
    const at = el.selectionStart ?? body.length;
    setBody(body.slice(0, at) + token + body.slice(el.selectionEnd ?? at));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(at + token.length, at + token.length); });
  };

  return (
    <>
      <PageHeader title="Your draft" description="Write it once, the way you would send it. The desk fits it to every company and person." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <Input value={subject} onChange={(x) => setSubject(x.target.value)} aria-label="Subject" placeholder="Subject" />
          <div className="flex flex-wrap gap-1.5">
            {TOKENS.map((t) => (
              <button key={t.key} type="button" title={t.hint} onClick={() => insert(t.key)}
                className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-solid hover:text-foreground">{t.label}</button>
            ))}
          </div>
          <Textarea ref={area} value={body} onChange={(x) => setBody(x.target.value)} rows={14} aria-label="Your email" className="resize-y text-sm leading-relaxed" />
          <p className="text-xs text-muted-foreground">Your signature and postal address are added under it, plus a one-line way to say no if your draft has none.</p>
          {bad.length > 0 && <p className="text-xs text-destructive">The desk does not know {bad.map((b) => `{${b}}`).join(", ")}. Use the buttons above.</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!!busy || !can("operator") || bad.length > 0 || !dirty} onClick={() => act("save_template", { subject, body }, "Saving your draft")}><Check />Save</Button>
            {waiting > 0 && saved && !dirty && (
              <Button variant="outline" disabled={!!busy || !can("operator")} onClick={() => act("save_template", { subject, body, apply: true }, "Rewriting waiting emails from your draft")}>
                Use it for the {waiting} waiting {waiting === 1 ? "email" : "emails"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setSubject(STARTER.subject); setBody(STARTER.body); }}><RotateCcw />Start from the example</Button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">How it reads</h2>
            {choices.length > 0 ? (
              <select value={pick} onChange={(x) => setPick(Number(x.target.value))} aria-label="Preview for"
                className="h-8 max-w-64 truncate rounded-md border bg-background px-2 text-sm">
                {choices.map((c: Any, i: number) => <option key={c.ct.id} value={i}>{c.ct.full_name}, {brandName(c.co)}</option>)}
              </select>
            ) : <span className="text-xs text-muted-foreground">An example person until companies are found</span>}
          </div>
          <div className="rounded-xl border p-5 text-sm leading-relaxed">
            <div className="mb-3 border-b pb-3 font-medium">{fillTemplate(subject, v)}</div>
            <div className="whitespace-pre-wrap">{fillTemplate(body, v)}</div>
            <div className="mt-4 whitespace-pre-wrap text-muted-foreground">{[e.sender?.name, e.sender?.title, e.sender?.org].filter(Boolean).join("\n") || "Your signature"}</div>
          </div>
        </section>
      </div>
    </>
  );
}
