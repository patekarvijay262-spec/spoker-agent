"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { ArrowUp, ChevronRight, FolderOpen, Mic, Paperclip, Plug, Plus, Settings2 } from "lucide-react";

import { useDesk } from "./desk-provider";
import { type Any, api } from "./format";

// Small tools that sit under any text box: a + menu (files, a folder, connectors) and a mic that types what you say.
// The mic is the browser's own free speech-to-text (Chrome, Edge, Safari); Sarvam is not used here.

const PIECE = 3 * 1024 * 1024; // under Vercel's 4.5 MB request limit once base64 adds a third
const DECK = /\.(pdf|pptx?|key)$/i;
const TEXT = /\.(txt|md|csv|json|tsv)$/i;

/** Uploads a PPT, PPTX or PDF as the deck that goes with every first email. */
export async function uploadDeckFile(file: File, onPct?: (n: number) => void) {
  const call = (body: Any) => api("/api/files", body);
  const { id } = await call({ op: "start", name: file.name, size: file.size });
  const buf = new Uint8Array(await file.arrayBuffer());
  for (let i = 0, idx = 0; i < buf.length; i += PIECE, idx++) {
    let bin = ""; const part = buf.subarray(i, i + PIECE);
    for (let j = 0; j < part.length; j += 0x8000) bin += String.fromCharCode(...part.subarray(j, j + 0x8000));
    await call({ op: "chunk", id, idx, data: btoa(bin) });
    onPct?.(Math.round(((i + part.length) / buf.length) * 100));
  }
  await call({ op: "finish", id });
}

/** Browser speech-to-text. Calls `onText` with each finished phrase. */
export function useDictation(onText: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Any>(null);
  const cb = useRef(onText);
  cb.current = onText;
  useEffect(() => { const w = window as Any; setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition)); }, []);
  useEffect(() => () => rec.current?.abort?.(), []);
  const toggle = useCallback(() => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as Any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = false;
    r.onresult = (e: Any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) cb.current(String(e.results[i][0].transcript).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start(); setListening(true);
  }, [listening]);
  return { supported, listening, toggle };
}

export function MicButton({ onText, className }: { onText: (t: string) => void; className?: string }) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  return (
    <button type="button" onClick={d.toggle} aria-pressed={d.listening} aria-label={d.listening ? "Stop dictation" : "Speak instead of typing"} title={d.listening ? "Listening… click to stop" : "Speak instead of typing"}
      className={cn("grid size-8 shrink-0 place-items-center rounded-full transition", d.listening ? "animate-pulse bg-destructive text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground", className)}>
      <Mic className="size-4" />
    </button>
  );
}

/** Every connector this desk knows, with whether it is on. */
export function useConnectorList() {
  const { data } = useDesk();
  const s = data?.settings || {};
  const list: { id: string; name: string; on: boolean; note?: string }[] = [
    { id: "google", name: "Gmail and Calendar", on: !!s.gmail, note: s.gmail || undefined },
    ...((s.connectors || []) as Any[]).map((c) => ({ id: c.id, name: c.name, on: c.source === "yours" || c.source === "shared" })),
    { id: "instagram", name: "Instagram", on: !!s.instagram?.connected, note: s.instagram?.handle ? `@${s.instagram.handle}` : undefined },
    ...((s.tools || []) as Any[]).map((t) => ({ id: `tool_${t.id}`, name: t.name, on: true })),
  ];
  return list;
}

const Dot = ({ on }: { on: boolean }) => <span className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-success" : "bg-muted-foreground/30")} />;

/** The + menu: add files, add a folder, or reach a connector. Text files are read into the box; a PPT or PDF becomes the deck. */
export function PlusMenu({ onText, className }: { onText: (t: string) => void; className?: string }) {
  const { load, flash, can } = useDesk();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const connectors = useConnectorList();
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setSub(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setSub(false); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { folder.current?.setAttribute("webkitdirectory", ""); folder.current?.setAttribute("directory", ""); }, []);

  const take = async (list: FileList | null) => {
    setOpen(false); setSub(false);
    const all = Array.from(list || []);
    if (!all.length) return;
    let texts = 0; let deck = "";
    for (const f of all) {
      if (TEXT.test(f.name) && f.size < 200_000) {
        const t = (await f.text()).trim().slice(0, 4000);
        if (t) { onText(t); texts++; }
      } else if (!deck && DECK.test(f.name) && can("operator")) {
        if (f.size > 15 * 1024 * 1024) { flash("Deck too large", `${f.name} is over 15 MB.`, "error"); continue; }
        try { setPct(0); await uploadDeckFile(f, setPct); deck = f.name; } catch (x: Any) { flash("Upload failed", x.message, "error"); } finally { setPct(null); }
      }
    }
    if (deck) await load();
    const skipped = all.length - texts - (deck ? 1 : 0);
    const said = [texts ? `${texts} text ${texts === 1 ? "file" : "files"} added to the box` : "", deck ? `${deck} is now your deck, sent with every first email` : "", skipped ? `${skipped} skipped (only text files and PPT or PDF decks are used)` : ""].filter(Boolean).join(". ");
    flash(texts || deck ? "Added" : "Nothing added", said, texts || deck ? "success" : "error");
  };

  const item = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted";
  return (
    <div ref={box} className={cn("relative", className)}>
      <button type="button" onClick={() => { setOpen(!open); setSub(false); }} aria-haspopup="menu" aria-expanded={open} aria-label="Add files, a folder or a connector" title="Add files, a folder or a connector"
        className={cn("grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground", open && "bg-muted text-foreground")}>
        {pct != null ? <span className="text-[0.625rem] num">{pct}%</span> : <Plus className="size-4.5" />}
      </button>
      <input ref={files} type="file" multiple className="sr-only" accept=".txt,.md,.csv,.tsv,.json,.pdf,.ppt,.pptx" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      <input ref={folder} type="file" multiple className="sr-only" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-rise">
          <button type="button" role="menuitem" className={item} onClick={() => files.current?.click()}><Paperclip className="size-4 text-muted-foreground" />Add files</button>
          <button type="button" role="menuitem" className={item} onClick={() => folder.current?.click()}><FolderOpen className="size-4 text-muted-foreground" />Add folder</button>
          <div className="my-1 h-px bg-border" />
          <button type="button" role="menuitem" aria-expanded={sub} className={cn(item, sub && "bg-muted")} onClick={() => setSub(!sub)} onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setSub(true)}>
            <Plug className="size-4 text-muted-foreground" />Connectors<span className="ml-auto text-xs text-muted-foreground num">{connectors.filter((c) => c.on).length}</span><ChevronRight className="size-3.5 text-muted-foreground" />
          </button>
          {sub && (
            <div className="absolute bottom-0 left-full ml-1 w-60 rounded-xl border bg-popover p-1 shadow-lg max-sm:static max-sm:mt-1 max-sm:ml-0 max-sm:w-auto max-sm:border-0 max-sm:p-0 max-sm:shadow-none">
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {connectors.map((c) => (
                  <Link key={c.id} href="/desk/connectors" prefetch={false} className={item} onClick={() => setOpen(false)}>
                    <Dot on={c.on} /><span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.on ? "On" : "Connect"}</span>
                  </Link>
                ))}
              </div>
              <div className="my-1 h-px bg-border" />
              <Link href="/desk/connectors" prefetch={false} className={item} onClick={() => setOpen(false)}><Settings2 className="size-4 text-muted-foreground" />Manage connectors</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A prompt box like Claude's: grows as you type, + and mic at the bottom left, a round send arrow at the right.
 *  Enter sends, Shift+Enter adds a line. `onSubmit` returns true to clear the box. */
export function PromptBar({ placeholder, onSubmit, busy, tour, hint }: { placeholder: string; onSubmit: (text: string) => Promise<boolean | void>; busy?: boolean; tour?: string; hint?: React.ReactNode }) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const append = (t: string) => { if (t) setText((cur) => { const c = cur.trimEnd(); return c ? `${c}${/[.,\n]$/.test(c) ? " " : ", "}${t}` : t; }); };
  useEffect(() => { const el = area.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 240)}px`; }, [text]);
  const send = async () => { const t = text.trim(); if (!t || busy) return; const ok = await onSubmit(t); if (ok !== false) setText(""); };
  return (
    <div className="rounded-[1.25rem] border bg-card shadow-[0_0.25rem_1.25rem_-0.5rem_rgb(0_0_0/0.12)] transition focus-within:border-foreground/25" data-tour={tour}>
      <textarea ref={area} value={text} rows={1} onChange={(e) => setText(e.target.value)} aria-label={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder={placeholder}
        className="block max-h-60 min-h-12 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted-foreground/80" />
      <div className="flex items-center gap-0.5 px-2 pb-2">
        <PlusMenu onText={append} />
        <MicButton onText={append} />
        {hint && <span className="ml-1.5 hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{hint}</span>}
        <button type="button" onClick={send} disabled={!text.trim() || busy} aria-label="Send"
          className="ml-auto grid size-8 place-items-center rounded-full bg-foreground text-background transition disabled:opacity-25">
          {busy ? <span className="size-3 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </div>
  );
}

/** A slim row of connector states for the bottom of a page. */
export function ConnectorStrip() {
  const list = useConnectorList();
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t pt-4" data-tour="event-connectors">
      <span className="mr-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Connectors</span>
      {list.map((c) => (
        <Link key={c.id} href="/desk/connectors" prefetch={false} title={c.note || (c.on ? "Connected" : "Not connected")}
          className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition hover:bg-muted", !c.on && "text-muted-foreground")}>
          <Dot on={c.on} />{c.name}
        </Link>
      ))}
      <Link href="/desk/connectors" prefetch={false} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed px-2.5 text-xs text-muted-foreground hover:text-foreground"><Plus className="size-3.5" />Connect</Link>
    </div>
  );
}
