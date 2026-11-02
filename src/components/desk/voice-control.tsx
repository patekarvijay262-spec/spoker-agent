"use client";

// Operate the desk by voice, Wispr Flow style: press Alt+V (or the mic), speak, and stop talking. Sarvam does the
// rest: Saaras transcribes, Mayura translates, Sarvam 105B understands, Bulbul answers out loud.
// - A text field has focus: what you say is typed into it (in English, whatever language you spoke).
// - Otherwise it is a command: go to a page, open a company, filter, ask a question, or start an action. Actions that
//   spend credits or lock prices wait for "yes" or a click on Confirm.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { cn } from "cn";
import { Check, Loader2, Mic, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useDesk } from "./desk-provider";
import { type Any, api } from "./format";

type Phase = "idle" | "listening" | "thinking";
type Pending = { op: string; count?: number; floor?: number; body?: Any; label: string } | null;
export const LANG_EVENT = "sd-answer-lang";
type Voice = { enabled: boolean; phase: Phase; toggle: () => void; cancel: () => void };

const MAX_MS = 25000; // Sarvam takes up to 30 s per request
const SILENCE_MS = 1300; // stop this long after you stop talking
const NO_SPEECH_MS = 6000;
export const VOICE_EXAMPLES = ["Open the outbox", "Show Zepto", "Approve the Zepto email", "Find 10 sponsors", "What should I do next?", "Score this", "Answer in Hindi", "Show fintech companies"];

const Ctx = createContext<Voice>({ enabled: false, phase: "idle", toggle: () => {}, cancel: () => {} });
export const useVoiceControl = () => useContext(Ctx);

function editableTarget(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement && /^(text|search|email|url|tel|)$/.test(el.type)) return el;
  return el.isContentEditable ? el : null;
}

/** Types into a React-controlled field the way a keyboard would, so its onChange fires and undo works. */
function insertText(el: HTMLElement, text: string) {
  el.focus();
  const before = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value.slice(0, el.selectionStart ?? el.value.length) : "";
  const spaced = before && !/\s$/.test(before) ? ` ${text}` : text;
  if (document.execCommand?.("insertText", false, spaced)) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, el.value + spaced);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { ask, openCompany, closeCompany, companyId, setChatOpen, autopilot, act, load, can } = useDesk();
  const { toggleSidebar } = useSidebar();
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<{ text: string; tone?: "error" } | null>(null);
  const [heard, setHeard] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [dictating, setDictating] = useState(false);
  const rec = useRef<{ stream: MediaStream; recorder: MediaRecorder; ctx: AudioContext; raf: number; cancelled: boolean; target: HTMLElement | null } | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { api("/api/voice").then((r) => setEnabled(!!r.enabled)).catch(() => {}); }, []);
  const show = useCallback((text: string, tone?: "error", ms = 2600) => {
    setNote({ text, tone });
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), ms);
  }, []);

  const runPending = useCallback(async (p: NonNullable<Pending>) => {
    setPending(null);
    if (p.op === "autopilot") {
      if (!can("operator")) return show("Your role cannot run discovery. Ask an admin.", "error");
      router.push("/desk");
      await autopilot(p.count || 8);
    } else if (p.op === "lock_floor") {
      if (!can("approver")) return show("Only an approver or admin can lock the floor.", "error");
      if (!p.floor) return show("Say the amount, for example: lock the floor at 3 lakh.", "error");
      await act("lock_floor", { floor: p.floor }, "Locking the floor");
    } else if (p.op === "signout") {
      await api("/api/logout", {}).catch(() => {});
      window.location.href = "/login";
    } else if (p.op === "cycle") {
      try { await api("/api/cycle", {}); await load(); show("Daily cycle finished"); } catch (e: Any) { show(e.message, "error", 4000); }
    } else {
      // Same operation, same role checks as the button: act() reports any refusal itself.
      const r = await act(p.op, p.body || {}, p.label);
      if (r) {
        show(`Done: ${p.label.toLowerCase()}`);
        if (p.op === "add_company" && r.id) { const added = await act("analyze", { company_id: r.id }, `Scoring ${p.body?.name}`); if (added) openCompany(r.id); }
      }
    }
  }, [act, autopilot, can, load, openCompany, router, show]);

  const execute = useCallback(async (intent: Any, lang: string) => {
    switch (intent.kind) {
      case "navigate": router.push(intent.to); show(intent.label); break;
      case "open_company": openCompany(intent.id); show(intent.label); break;
      case "search": router.push(`/desk/companies?q=${encodeURIComponent(intent.query)}`); show(intent.label); break;
      case "action": setPending({ op: intent.op, count: intent.count, floor: intent.floor, label: intent.label }); break;
      case "act": setPending({ op: intent.op, body: intent.body, label: intent.label }); break;
      case "note": show(intent.text, undefined, 5000); break;
      case "lang":
        try { localStorage.setItem("sd_assistant_lang", intent.code); } catch { /* storage blocked */ }
        window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: intent.code }));
        show(intent.label);
        break;
      case "confirm":
        if (pending && intent.yes) await runPending(pending);
        else if (pending) { setPending(null); show("Cancelled"); }
        else show(intent.yes ? "Nothing to confirm" : "OK");
        break;
      case "help": show(`Try: ${VOICE_EXAMPLES.slice(0, 4).join(" · ")}`, undefined, 6000); break;
      case "ask": ask(intent.question, { lang, spoken: true }); break;
      case "ui": {
        const a = intent.action;
        if (a === "dark" || a === "light") setPreference("theme_mode", a);
        else if (a === "back") router.back();
        else if (a === "scroll_down" || a === "scroll_up") window.scrollBy({ top: (a === "scroll_down" ? 1 : -1) * window.innerHeight * 0.7, behavior: "smooth" });
        else if (a === "close") { closeCompany(); setChatOpen(false); }
        else if (a === "sidebar") toggleSidebar();
        else if (a === "chat") setChatOpen(true);
        else if (a === "stop") document.querySelectorAll("audio").forEach((x) => x.pause());
        show(intent.label);
        break;
      }
    }
  }, [ask, closeCompany, openCompany, pending, router, runPending, setChatOpen, setPreference, show, toggleSidebar]);

  const handle = useCallback(async (blob: Blob, target: HTMLElement | null) => {
    setPhase("thinking");
    try {
      const form = new FormData();
      form.append("file", new File([blob], "audio.webm", { type: blob.type || "audio/webm" }));
      form.append("mode", target ? "translate" : "transcribe"); // dictation lands in English, commands keep the spoken language
      const res = await fetch("/api/voice", { method: "POST", body: form });
      const t: Any = await res.json().catch(() => ({}));
      if (!res.ok || t.error) throw new Error(t.error || `HTTP ${res.status}`);
      const text = String(t.text || "").trim();
      if (!text) return show("Didn't catch that. Try again.", "error");
      if (target && document.contains(target)) { insertText(target, text); show("Typed"); return; }
      setHeard(text);
      const r = await api("/api/voice/command", { text, lang: t.lang || "", path, focus: companyId });
      await execute(r.intent, t.lang || "");
    } catch (e: Any) {
      show(`Voice: ${e.message}`, "error", 4000);
    } finally { setPhase("idle"); setLevel(0); setTimeout(() => setHeard(""), 2500); }
  }, [execute, path, show, companyId]);

  const stop = useCallback((cancelled = false) => {
    const s = rec.current;
    if (!s) return;
    s.cancelled = cancelled;
    cancelAnimationFrame(s.raf);
    if (s.recorder.state === "recording") s.recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!enabled || rec.current) return;
    const target = editableTarget();
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { return show("Microphone is blocked. Allow it in the browser.", "error", 4000); }
    document.querySelectorAll("audio").forEach((x) => x.pause()); // never transcribe the desk's own voice
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const t0 = performance.now();
    let floor = 0.008, spoke = false, lastLoud = t0;
    const s = { stream, recorder, ctx, raf: 0, cancelled: false, target };
    rec.current = s;
    // Voice activity: learn the room's noise for 300 ms, then end the take after a pause in speech.
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (now - t0 < 300) floor = Math.max(floor, rms * 1.2);
      const loud = rms > Math.max(0.015, floor * 2.2);
      if (loud) { spoke = true; lastLoud = now; }
      setLevel(Math.min(1, rms / 0.12));
      if ((spoke && now - lastLoud > SILENCE_MS) || now - t0 > MAX_MS) return stop();
      if (!spoke && now - t0 > NO_SPEECH_MS) return stop(true);
      s.raf = requestAnimationFrame(tick);
    };
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((x) => x.stop());
      ctx.close().catch(() => {});
      rec.current = null;
      setDictating(false);
      if (s.cancelled || !chunks.length) { setPhase("idle"); setLevel(0); if (!spoke) show("Didn't hear anything"); return; }
      handle(new Blob(chunks, { type: recorder.mimeType }), target);
    };
    recorder.start();
    setDictating(!!target);
    setPhase("listening");
    s.raf = requestAnimationFrame(tick);
  }, [enabled, handle, show, stop]);

  const toggle = useCallback(() => { if (rec.current) stop(); else if (phase === "idle") start(); }, [phase, start, stop]);
  const cancel = useCallback(() => { stop(true); setPending(null); }, [stop]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyV") { e.preventDefault(); toggle(); }
      else if (e.key === "Escape" && (rec.current || pending)) cancel();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [toggle, cancel, pending]);

  const bars = [0.55, 0.85, 1, 0.75, 0.5];
  const visible = phase !== "idle" || note || pending;
  return (
    <Ctx.Provider value={{ enabled, phase, toggle, cancel }}>
      {children}
      {enabled && visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4" aria-live="polite">
          <div className="pointer-events-auto w-full max-w-sm rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg animate-rise">
            {pending ? (
              <div className="space-y-3">
                <div><div className="font-medium">{pending.label}?</div><div className="text-xs text-muted-foreground">Say "yes" or confirm below.</div></div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => runPending(pending)}><Check />Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => setPending(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {phase === "listening" ? (
                  <div className="flex h-5 w-8 shrink-0 items-center justify-center gap-0.5" aria-hidden>
                    {bars.map((b, i) => <span key={i} className="w-1 rounded-full bg-foreground transition-[height] duration-75" style={{ height: `${Math.max(0.2, Math.min(1, level * 2.4 * b)) * 1.25}rem` }} />)}
                  </div>
                ) : phase === "thinking" ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <Mic className={cn("size-4 shrink-0", note?.tone === "error" ? "text-destructive" : "text-muted-foreground")} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{phase === "listening" ? (dictating ? "Listening… your words will be typed" : "Listening…") : phase === "thinking" ? (heard ? `“${heard}”` : "Understanding…") : note?.text}</div>
                  {phase === "listening" && !dictating && <div className="truncate text-xs text-muted-foreground">Try “{VOICE_EXAMPLES[Math.floor(Date.now() / 4000) % VOICE_EXAMPLES.length]}”</div>}
                </div>
                {phase === "listening" && (
                  <button type="button" onClick={() => cancel()} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cancel listening"><X className="size-4" /></button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** The mic in the header. Hidden when Sarvam is not configured. */
export function VoiceButton({ className }: { className?: string }) {
  const { enabled, phase, toggle } = useVoiceControl();
  if (!enabled) return null;
  const on = phase === "listening";
  return (
    <Button variant={on ? "default" : "ghost"} size="icon" onClick={toggle} className={cn(on && "animate-ring", className)}
      onMouseDown={(e) => e.preventDefault()} /* keep focus in the text field, so a click dictates into it */
      aria-label={on ? "Stop listening" : "Talk to the desk (Alt+V)"} title={on ? "Stop listening" : "Talk to the desk (Alt+V)"}>
      {phase === "thinking" ? <Loader2 className="animate-spin" /> : <Mic />}
    </Button>
  );
}
