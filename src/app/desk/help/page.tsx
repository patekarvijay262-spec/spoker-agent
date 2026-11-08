"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { MessageCircle, Play, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { HOWTOS } from "@/lib/guide";

// The user manual: every task in the order an organiser meets it, each with its steps and a button to the page.
// Same text as the tour and the Ask bot (src/lib/guide.ts).

const md = (s: string) => s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) =>
  p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith("*") ? <span key={i} className="rounded bg-muted px-1">{p.slice(1, -1)}</span> : p);

export default function HelpPage() {
  const router = useRouter();
  const { setChatOpen } = useDesk();
  const [q, setQ] = useState("");
  const shown = HOWTOS.filter((h) => !q.trim() || `${h.title} ${h.steps.join(" ")}`.toLowerCase().includes(q.toLowerCase().trim()));
  return (
    <>
      <PageHeader title="Help" description="How to do everything, in the order you will need it.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/desk?tour=1")}><Play />Start the tour</Button>
          <Button variant="outline" onClick={() => setChatOpen(true)}><MessageCircle />Ask a question</Button>
        </div>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Search the manual, e.g. deck, dates, reply" className="pl-9" aria-label="Search the manual" />
      </div>

      <nav className="flex flex-wrap gap-1.5 text-xs" aria-label="Topics">
        {shown.map((h) => <a key={h.id} href={`#${h.id}`} className="rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground">{h.title}</a>)}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((h, n) => (
          <section key={h.id} id={h.id} className="scroll-mt-20 space-y-3 rounded-xl border p-5">
            <h2 className="flex items-baseline gap-2 font-medium"><span className="text-sm text-muted-foreground num">{n + 1}.</span>{h.title}</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">{h.steps.map((s, i) => <li key={i}>{md(s)}</li>)}</ol>
            {h.tip && <p className="text-xs text-muted-foreground">{md(h.tip)}</p>}
            <div className="flex flex-wrap gap-2">{h.links.map((l) => <Button key={l.href} size="sm" variant="outline" nativeButton={false} render={<Link href={l.href} />}>{l.label}</Button>)}</div>
          </section>
        ))}
        {!shown.length && <p className="text-sm text-muted-foreground">Nothing matches. Try another word, or press Ask a question.</p>}
      </div>
    </>
  );
}
