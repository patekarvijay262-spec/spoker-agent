"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TOUR } from "@/lib/guide";

import { useDesk } from "./desk-provider";
import { api } from "./format";

// The guided tour: opens each page by itself, dims the screen around one thing and says what it is for. Next and
// Back, or Play to let it run on its own. Starts once on a person's first visit; Help (or /desk?tour=1) restarts it.

const PAD = 6;

export function Tour() {
  const router = useRouter();
  const path = usePathname();
  const { data } = useDesk();
  const meId = data?.me?.id || "";
  const [i, setI] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [play, setPlay] = useState(false);
  const step = i == null ? null : TOUR[i];

  // Start: on request (?tour=1), or once ever for a new person. "Seen" is kept on the server for the person, so it
  // never comes back on another device, browser or after clearing the browser; this device remembers it too.
  const seenOnServer = !!data?.me?.tour_seen;
  const started = useRef(false);
  useEffect(() => {
    if (!meId) return;
    const asked = new URLSearchParams(window.location.search).get("tour") === "1";
    if (asked) { window.history.replaceState({}, "", window.location.pathname); setI(0); return; }
    if (started.current || seenOnServer) return;
    const key = `sd_tour_seen:${meId}`;
    let seenHere = false;
    try { seenHere = !!localStorage.getItem(key); localStorage.setItem(key, "1"); } catch { /* storage blocked */ }
    started.current = true;
    api("/api/act", { op: "tour_seen" }).catch(() => {});
    if (!seenHere) setI(0);
  }, [meId, path, seenOnServer]);

  // Each step opens its page.
  useEffect(() => { if (step && path !== step.path) router.push(step.path); }, [step, path, router]);

  // Find the thing to point at (pages load their data first), keep the highlight on it while scrolling.
  useEffect(() => {
    setRect(null);
    if (!step || path !== step.path) return;
    const el = () => document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    let tries = 0;
    let timer = setTimeout(function find() {
      const e = el();
      if (e && e.getClientRects().length) { e.scrollIntoView({ block: "center", behavior: "smooth" }); timer = setTimeout(() => setRect(e.getBoundingClientRect()), 400); }
      else if (tries++ < 24) timer = setTimeout(find, 250);
    }, 150);
    const follow = () => { const e = el(); if (e && e.getClientRects().length) setRect(e.getBoundingClientRect()); };
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, true);
    return () => { clearTimeout(timer); window.removeEventListener("resize", follow); window.removeEventListener("scroll", follow, true); };
  }, [step, path]);

  // Play: moves on by itself, a little slower than reading speed.
  useEffect(() => {
    if (!play || i == null) return;
    const t = setTimeout(() => (i < TOUR.length - 1 ? setI(i + 1) : setPlay(false)), 6000);
    return () => clearTimeout(t);
  }, [play, i]);

  // Keyboard: arrows move, Esc closes.
  useEffect(() => {
    if (i == null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setI(null);
      if (e.key === "ArrowRight") setI((n) => (n == null ? n : Math.min(TOUR.length - 1, n + 1)));
      if (e.key === "ArrowLeft") setI((n) => (n == null ? n : Math.max(0, n - 1)));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [i]);

  if (!step || i == null) return null;
  const last = i === TOUR.length - 1;
  const close = () => { setI(null); setPlay(false); };
  // The card sits below what it points at, or above when there is no room; on a phone it docks to the bottom.
  const W = 340;
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const below = rect ? rect.bottom + PAD + 12 + 190 < window.innerHeight : true;
  const card: React.CSSProperties = phone || !rect
    ? { left: "50%", transform: "translateX(-50%)", ...(phone ? { bottom: 16 } : { top: "35%" }), width: `min(${W}px, calc(100vw - 2rem))` }
    : { left: Math.max(16, Math.min(rect.left, window.innerWidth - W - 16)), width: W, ...(below ? { top: rect.bottom + PAD + 12 } : { bottom: window.innerHeight - rect.top + PAD + 12 }) };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`Tour, step ${i + 1} of ${TOUR.length}: ${step.title}`}>
      {rect
        ? <div className="pointer-events-none fixed rounded-xl ring-2 ring-primary transition-all duration-300" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)" }} />
        : <div className="fixed inset-0 bg-black/45" />}
      <div className="fixed space-y-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg" style={card}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground num">Step {i + 1} of {TOUR.length}</span>
          <button type="button" onClick={close} aria-label="Close the tour" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="space-y-1">
          <div className="font-medium">{step.title}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${((i + 1) / TOUR.length) * 100}%` }} /></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setPlay(!play)} aria-label={play ? "Pause" : "Play the tour on its own"}>{play ? <Pause /> : <Play />}{play ? "Pause" : "Play"}</Button>
          <div className="ml-auto flex gap-2">
            {i > 0 && <Button size="sm" variant="outline" onClick={() => setI(i - 1)}><ChevronLeft />Back</Button>}
            <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Done" : <>Next<ChevronRight /></>}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
