"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useRouter } from "next/navigation";

import { BookOpen, Building2, FileText, Mail, MessageCircle, Play, Search, User, Zap } from "lucide-react";

import { HOWTOS } from "@/lib/guide";

import { useDesk } from "./desk-provider";
import { type Any, brandName } from "./format";

// One search for everything that matters: companies, people (name, role, email), emails, pages, how-to answers and
// quick actions. Built without a command-menu library (that one crashed the page); a plain dialog that cannot.

type Hit = { group: string; icon: Any; label: string; sub?: string; run: () => void; score: number };

const PAGES: [string, string][] = [
  ["Home", "/desk"], ["Event", "/desk/brief"], ["Companies", "/desk/companies"], ["Your draft", "/desk/draft"], ["Send", "/desk/outbox"],
  ["Replies", "/desk/inbox"], ["People", "/desk/people"], ["Meetings", "/desk/meetings"], ["Deals and MOUs", "/desk/deals"],
  ["Sponsor updates", "/desk/sponsors"], ["Pipeline", "/desk/pipeline"], ["Agents", "/desk/agents"], ["Settings", "/desk/settings"], ["Help", "/desk/help"],
];
const GROUPS = ["Actions", "Companies", "People", "Emails", "Pages", "Help"];

/** 0 when it does not match; higher for a match at the start of a word, and for every word of the query found. */
function score(q: string, text: string) {
  const t = text.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let s = 0;
  for (const w of words) {
    const at = t.indexOf(w);
    if (at < 0) return 0;
    s += at === 0 ? 3 : /\W/.test(t[at - 1] || "") ? 2 : 1;
  }
  return s;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data, openCompany, ask, openSearch, setChatOpen, can } = useDesk();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 20); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const go = (u: string) => () => { onClose(); router.push(u); };
    const cos: Any[] = data?.companies || [];
    const coName = (id: string) => brandName(cos.find((c) => c.id === id) || { name: "" });
    const all: Hit[] = [];
    const actions: [string, () => void, string][] = [
      ["Find companies", go("/desk"), "find sponsors search discover"],
      ["Write or edit your email draft", go("/desk/draft"), "template draft email"],
      ["Upload your deck", go("/desk/draft"), "deck ppt pdf attach"],
      ["Approve emails waiting in Send", go("/desk/outbox"), "approve send outbox"],
      ["Change event dates or address", go("/desk/brief"), "dates city address signature edit details"],
      ["Start the tour", go("/desk?tour=1"), "tour help learn guide walkthrough"],
      ["Ask Max a question", () => { onClose(); setChatOpen(true); }, "ask max chat question bot help"],
      ["Ask: what should I do next?", () => { onClose(); ask("What should I do next?"); }, "next todo what now"],
      ...(can("operator") ? [["Find sponsors", () => { onClose(); openSearch("more"); }, "find sponsors search new companies"] as [string, () => void, string]] : []),
    ];
    for (const [label, run, words] of actions) all.push({ group: "Actions", icon: label.startsWith("Start the tour") ? Play : label.startsWith("Ask") ? MessageCircle : Zap, label, run, score: q ? score(q, `${label} ${words}`) : 1 });
    if (q.trim()) {
      // A small lift so companies and pages lead when they match as well as a person or email does.
      const lift = (s: number) => (s ? s + 1 : 0);
      for (const c of cos) all.push({ group: "Companies", icon: Building2, label: brandName(c), sub: [c.reasons?.about?.industry, c.priority, c.stage === "DISQUALIFIED" ? "set aside" : ""].filter(Boolean).join(" · "), run: () => { onClose(); openCompany(c.id); }, score: lift(score(q, `${c.name} ${c.domain || ""} ${c.reasons?.about?.industry || ""}`)) });
      for (const p of (data?.contacts || []) as Any[]) all.push({ group: "People", icon: User, label: p.full_name, sub: [p.position, coName(p.company_id), p.email].filter(Boolean).join(" · "), run: () => { onClose(); openCompany(p.company_id); }, score: score(q, `${p.full_name} ${p.position || ""} ${p.email || ""} ${coName(p.company_id)}`) });
      for (const m of (data?.messages || []) as Any[]) all.push({ group: "Emails", icon: Mail, label: m.subject || "(no subject)", sub: [m.status, coName(m.company_id)].filter(Boolean).join(" · "), run: go("/desk/outbox"), score: score(q, `${m.subject || ""} ${coName(m.company_id)} ${m.to_email || ""}`) });
      for (const [t, u] of PAGES) all.push({ group: "Pages", icon: FileText, label: t, run: go(u), score: lift(score(q, t)) });
      for (const h of HOWTOS) all.push({ group: "Help", icon: BookOpen, label: h.title, sub: h.steps[0].replace(/\*/g, ""), run: go(`/desk/help#${h.id}`), score: score(q, `${h.title} ${h.steps.join(" ")}`) });
    }
    // Best first inside each group, a few per group, groups in a fixed order.
    return GROUPS.flatMap((g) => all.filter((h) => h.group === g && h.score > 0).sort((a, b) => b.score - a.score).slice(0, g === "Actions" && q ? 3 : 6));
  }, [q, data, onClose, router, openCompany, ask, openSearch, setChatOpen, can]);

  useEffect(() => { setSel(0); }, [q]);
  if (!open) return null;
  const pick = (i: number) => hits[i]?.run();
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hits.length) pick(sel); else if (q.trim()) { onClose(); ask(q.trim()); } }
    else if (e.key === "Escape") onClose();
  };
  let last = "";
  // Rendered on the page body: inside the blurred header a fixed panel would be clipped to the header.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl" onKeyDown={key}>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, people, emails, help…" aria-label="Search"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <kbd className="hidden rounded border px-1 font-mono text-[0.65rem] text-muted-foreground sm:inline">Esc</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5" role="listbox">
          {hits.map((h, i) => {
            const head = h.group !== last ? (last = h.group) : null;
            return (
              <li key={`${h.group}-${i}`}>
                {head && <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">{head}</div>}
                <button type="button" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => pick(i)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm ${i === sel ? "bg-muted" : ""}`}>
                  <h.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1"><span className="block truncate">{h.label}</span>{h.sub && <span className="block truncate text-xs text-muted-foreground">{h.sub}</span>}</span>
                </button>
              </li>
            );
          })}
          {!hits.length && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing found for “{q}”. Press Enter to ask the desk instead.
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
