"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { cn } from "cn";
import { ArrowUp, Languages, Loader2, MessageCircle, Mic, RotateCcw, Square, Volume2, X } from "lucide-react";

import { RichText } from "./bits";
import { useDesk } from "./desk-provider";
import { type Any, AGENTS, api, OP_AGENT } from "./format";
import { playText, useVoice } from "./use-voice";
import { LANG_EVENT, useVoiceControl } from "./voice-control";

type Msg = { role: "user" | "assistant"; text: string; actions?: Any[]; suggestions?: string[]; engine?: string; lang?: string; t: number };

// Sarvam's languages (translation and Bulbul voice). "" = answer in whatever language the question came in.
const LANGS: { code: string; label: string; native: string }[] = [
  { code: "", label: "Auto", native: "Auto" },
  { code: "en-IN", label: "English", native: "English" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", label: "Odia", native: "ଓଡ଼ିଆ" },
];
const LANG_KEY = "sd_assistant_lang";
const ENGINE_NOTE: Record<string, string> = { gemini: "Gemini", sarvam: "Sarvam AI" };
const STARTERS = ["What's going on?", "What should I do next?", "Who should I pitch first?"];

/** Max, the desk's helper: a small round bot face that blinks. */
export function MaxFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <line x1="24" y1="9" x2="24" y2="4.5" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="4" r="2.6" fill="#f5a524" />
      <circle cx="24" cy="27" r="19" fill="#111" />
      <circle cx="24" cy="27" r="19" fill="none" stroke="#fff" strokeOpacity="0.18" />
      <g className="max-eye">
        <ellipse cx="17.5" cy="24.5" rx="4" ry="4.6" fill="#fff" />
        <ellipse cx="30.5" cy="24.5" rx="4" ry="4.6" fill="#fff" />
        <circle cx="18.4" cy="25.4" r="1.9" fill="#111" />
        <circle cx="31.4" cy="25.4" r="1.9" fill="#111" />
      </g>
      <circle cx="12.5" cy="31.5" r="2.2" fill="#f87171" opacity="0.55" />
      <circle cx="35.5" cy="31.5" r="2.2" fill="#f87171" opacity="0.55" />
      <path d="M19 33 Q24 37.5 29 33" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Assistant() {
  const { chatOpen, setChatOpen, pendingQuestion, pendingVoice, clearPending, busy, progress, openCompany } = useDesk();
  const control = useVoiceControl();
  const router = useRouter();
  const path = usePathname();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [unread, setUnread] = useState(false);
  const [replyLang, setReplyLang] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasWorking = useRef(false);
  const history = useRef<Msg[]>([]);
  history.current = msgs;

  useEffect(() => { try { setReplyLang(localStorage.getItem(LANG_KEY) || ""); } catch { /* storage blocked */ } }, []);
  // "Answer in Hindi" said to the voice control changes the language here too.
  useEffect(() => {
    const on = (e: Event) => setReplyLang(String((e as CustomEvent).detail || ""));
    window.addEventListener(LANG_EVENT, on);
    return () => window.removeEventListener(LANG_EVENT, on);
  }, []);
  const pickLang = (code: string) => {
    setReplyLang(code); setLangOpen(false);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* storage blocked */ }
  };
  const langLabel = LANGS.find((l) => l.code === replyLang) || LANGS[0];

  /** `lang` = language the question is in; `spokenLang` = answer in this language when the picker is on Auto. */
  const send = useCallback(async (text: string, lang = "", spoken = false, spokenLang = "") => {
    const q = text.trim();
    if (!q || thinking) return;
    const past = history.current.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q, t: Date.now() }]);
    setInput("");
    setThinking(true);
    try {
      const r = await api("/api/assist", { message: q, path, lang, replyLang: replyLang || spokenLang, history: past });
      setMsgs((m) => [...m, { role: "assistant", text: r.reply, actions: r.actions, suggestions: r.suggestions, engine: r.engine, lang: r.lang, t: Date.now() }]);
      if (spoken) playText(r.reply, r.lang).catch(() => {}); // asked out loud, answered out loud
    } catch (e: Any) {
      setMsgs((m) => [...m, { role: "assistant", text: `I could not reach the desk: ${e.message}`, t: Date.now() }]);
    } finally { setThinking(false); }
  }, [path, thinking, replyLang]);
  const voice = useVoice({
    mode: "transcribe",
    onText: (text, lang) => send(text, lang, true),
    onError: (message) => setMsgs((m) => [...m, { role: "assistant", text: `Voice did not work: ${message}`, t: Date.now() }]),
  });

  useEffect(() => {
    if (!chatOpen || !pendingQuestion) return;
    // A voice command arrives already in English; answer in the language it was spoken in.
    send(pendingQuestion, "", pendingVoice.spoken, pendingVoice.lang);
    clearPending();
  }, [chatOpen, pendingQuestion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (chatOpen) { setUnread(false); if (window.matchMedia("(pointer: fine)").matches) setTimeout(() => inputRef.current?.focus(), 150); } }, [chatOpen]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, thinking]);
  useEffect(() => {
    const working = !!(busy || progress);
    if (wasWorking.current && !working && !chatOpen) setUnread(true);
    wasWorking.current = working;
  }, [busy, progress, chatOpen]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && chatOpen) setChatOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [chatOpen, setChatOpen]);

  const agent = busy ? AGENTS.find((a) => a.id === OP_AGENT[busy.op]) : progress ? AGENTS[1] : null;
  const last = msgs[msgs.length - 1];
  const chips = (last?.role === "assistant" && last.suggestions?.length ? last.suggestions : STARTERS).slice(0, 3);

  return (
    <>
      {/* Max floats bottom right on every screen; phones also get the voice button (desktop has it in the header). */}
      {!chatOpen && (
        <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2">
          {control.enabled && (
            <button type="button" onClick={control.toggle} aria-label={control.phase === "listening" ? "Stop listening" : "Talk to the desk"}
              className={cn("grid size-11 place-items-center rounded-full border bg-background shadow-md md:hidden", control.phase === "listening" && "animate-ring bg-primary text-primary-foreground")}>
              {control.phase === "thinking" ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
            </button>
          )}
          <button type="button" onClick={() => setChatOpen(true)} aria-label="Ask Max" title="Ask Max" data-tour="ask"
            className="group relative grid size-14 place-items-center rounded-full bg-background shadow-lg ring-1 ring-border transition hover:scale-105">
            <MaxFace className="max-bob size-12" />
            <span className="pointer-events-none absolute right-full mr-2 hidden rounded-full bg-foreground px-2.5 py-1 text-xs whitespace-nowrap text-background shadow group-hover:block">Ask Max</span>
            {(unread || busy || progress) && <span className={cn("absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-background", unread ? "bg-warning" : "animate-pulse bg-success")} />}
          </button>
        </div>
      )}
      {chatOpen && (
        <section role="dialog" aria-label="Max, the desk's helper"
          className="fixed inset-0 z-50 flex flex-col bg-background animate-rise md:inset-auto md:top-16 md:right-4 md:bottom-4 md:w-[26rem] md:rounded-xl md:border md:shadow-lg">
          <header className="flex items-center gap-1 border-b py-2 pr-2 pl-4">
            <MaxFace className="mr-1 size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold tracking-tight">Max</div>
              <div className="truncate text-xs text-muted-foreground">
                {busy || progress ? `${agent?.name}: ${(busy?.label || progress?.label || "").slice(0, 48)}` : "Questions, advice, any language"}
              </div>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setLangOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={langOpen} aria-label={`Answer language: ${langLabel.label}`} title="Answer language"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <Languages className="size-4" /><span className="max-w-16 truncate">{langLabel.native}</span>
              </button>
              {langOpen && (
                <ul role="listbox" aria-label="Answer language" className="absolute right-0 z-10 mt-1 max-h-80 w-48 overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
                  {LANGS.map((l) => (
                    <li key={l.code || "auto"}>
                      <button type="button" role="option" aria-selected={l.code === replyLang} onClick={() => pickLang(l.code)}
                        className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted", l.code === replyLang && "bg-muted font-medium")}>
                        <span>{l.native}</span>{l.native !== l.label && <span className="text-xs text-muted-foreground">{l.label}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setMsgs([])} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="New conversation" title="New conversation"><RotateCcw className="size-4" /></button>
            <button type="button" onClick={() => setChatOpen(false)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X className="size-4" /></button>
          </header>

          <div ref={scroller} className="flex-1 space-y-6 overflow-y-auto px-4 py-6 scrollbar-thin">
            {!msgs.length && !thinking && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <MaxFace className="max-bob mb-2 size-16" />
                <div className="font-semibold">Hi, I'm Max</div>
                <div className="max-w-64 text-sm text-muted-foreground">Ask how to do anything here, about your sponsors, or anything else. Type or speak in 12 languages.</div>
              </div>
            )}
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end animate-rise"><div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">{m.text}</div></div>
            ) : (
              <div key={i} className="space-y-2 text-sm leading-relaxed animate-rise">
                <RichText text={m.text} />
                {!!m.actions?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.actions.map((a: Any, j: number) => (
                      <button key={j} type="button" onClick={() => { if (a.open) openCompany(a.open); else if (a.href) router.push(a.href); if (window.innerWidth < 768) setChatOpen(false); }}
                        className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">{a.label}</button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {voice.enabled && <button type="button" onClick={() => playText(m.text, m.lang).catch(() => {})} className="inline-flex items-center gap-1 hover:text-foreground"><Volume2 className="size-3.5" />Listen</button>}
                  {m.engine && ENGINE_NOTE[m.engine] && <span title="Desk numbers come only from the desk's own data">{ENGINE_NOTE[m.engine]}</span>}
                </div>
              </div>
            ))}
            {thinking && <div className="flex gap-1" aria-label="Thinking">{[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
          </div>

          <div className="space-y-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {!thinking && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
                {chips.map((c) => <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{c}</button>)}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-1 rounded-lg border bg-background p-1 pl-3 focus-within:ring-2 focus-within:ring-ring/30">
              <textarea ref={inputRef} id="assistant-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={replyLang && replyLang !== "en-IN" ? `Ask Max · answers in ${langLabel.label}` : "Ask Max anything"} aria-label="Your question"
                className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground" />
              {voice.enabled && (
                <button type="button" disabled={thinking || voice.working} onClick={voice.toggle} aria-label={voice.recording ? "Stop and send" : "Ask by voice"} title={voice.recording ? "Stop and send" : "Ask by voice"}
                  className={cn("grid size-8 shrink-0 place-items-center rounded-md transition disabled:opacity-40", voice.recording ? "bg-destructive text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  {voice.working ? <Loader2 className="size-4 animate-spin" /> : voice.recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
                </button>
              )}
              <button type="submit" disabled={!input.trim() || thinking} aria-label="Send" className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition disabled:opacity-30">
                <ArrowUp className="size-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
