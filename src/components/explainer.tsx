"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

import { MaxFace } from "./desk/assistant";

// "How SponsorDesk works": a short animated explainer in the style of a product video. Seven scenes, one line of
// voiceover each (a female voice, /public/explainer/s0.mp3 … s6.mp3). Each scene waits for its clip to end, so
// picture and voice stay in step; without the clips it runs on timers with captions.

export const SCENES = [
  { title: "Sponsorship season", say: "Sponsorship season. Hundreds of companies, a few weeks, and one big question: who will say yes?", secs: 7.5 },
  { title: "Meet Max", say: "Meet Max, your sponsorship employee. Max does the heavy lifting and checks with you first.", secs: 7 },
  { title: "1 · Plan", say: "Tell Max your event size, budget and dates. Max prices four sponsor tiers to match.", secs: 7 },
  { title: "2 · Find", say: "Max finds companies that fit, and the people who decide, with verified emails.", secs: 6.5 },
  { title: "3 · Reach", say: "Write your email once. Max fits it to everyone, and nothing goes out without your yes.", secs: 7 },
  { title: "4 · Close", say: "Replies, meetings and MOUs, all tracked, with one short list every morning.", secs: 6.5 },
  { title: "SponsorDesk", say: "SponsorDesk. Your sponsorship employee.", secs: 4 },
] as const;

const PINK = "#ff4f8b", VIOLET = "#7c4dff", AMBER = "#f5a524", MINT = "#2ecc9a", SKY = "#4aa8ff";
const grad = `linear-gradient(135deg, ${PINK}, ${VIOLET})`;
const anim = (name: string, delay = 0, dur = 600) => ({ animation: `${name} ${dur}ms cubic-bezier(.2,.8,.2,1) ${delay}ms both` });

const DOTS = Array.from({ length: 22 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53 + 11) % 100, r: 6 + ((i * 7) % 14), c: [PINK, VIOLET, AMBER, MINT, SKY][i % 5], d: (i % 6) * 0.6 }));

function Dots({ calm }: { calm?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.r, height: d.r, background: d.c, opacity: calm ? 0.35 : 0.7, animation: `ex-float ${5 + (i % 4)}s ease-in-out ${d.d}s infinite` }} />
      ))}
    </div>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return <h3 className="absolute inset-x-0 top-[9%] text-center text-[clamp(1.1rem,5.1cqw,2rem)] font-bold tracking-tight text-[#141414]" style={anim("ex-rise", 100)}>{children}</h3>;
}

/** One card in the scenes: white, soft shadow, rounded. */
function Card({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return <div className={cn("absolute rounded-xl bg-white shadow-[0_0.5rem_1.5rem_-0.5rem_rgb(20_20_20/0.25)]", className)} style={style}>{children}</div>;
}

function Scene({ i }: { i: number }) {
  if (i === 0) return (
    <>
      <Dots calm />
      <Headline>Who will say yes?</Headline>
      <Card className="top-[30%] left-[30%] h-[46%] w-[40%] p-[2%]" style={anim("ex-pop", 250)}>
        <div className="mb-[4%] flex gap-1">{[0, 1, 2].map((k) => <span key={k} className="size-2 rounded-full bg-[#141414]/15" />)}</div>
        {Array.from({ length: 6 }, (_, k) => <div key={k} className="mb-[3%] h-[9%] rounded bg-[#141414]/8" style={{ width: `${90 - k * 9}%`, ...anim("ex-grow", 500 + k * 120) }} />)}
      </Card>
      {[[18, 30], [72, 26], [14, 62], [78, 60], [24, 80], [70, 82]].map(([x, y], k) => (
        <span key={k} className="absolute grid size-[7%] place-items-center rounded-lg text-white" style={{ left: `${x}%`, top: `${y}%`, background: grad, ...anim("ex-pop", 900 + k * 180) }}>
          <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
        </span>
      ))}
      <span className="absolute top-[40%] left-[47%] text-[clamp(2rem,10.5cqw,4rem)] font-black" style={{ color: VIOLET, ...anim("ex-pop", 2200) }}>?</span>
    </>
  );
  if (i === 1) return (
    <>
      <Dots />
      <Headline>Meet Max</Headline>
      <div className="absolute top-[30%] left-1/2 w-[24%] -translate-x-1/2" style={anim("ex-pop", 300, 800)}><MaxFace className="max-bob w-full" /></div>
      <div className="absolute inset-x-0 top-[78%] text-center text-[clamp(0.8rem,3.0cqw,1.1rem)] font-semibold text-[#141414]/70" style={anim("ex-rise", 1200)}>Your sponsorship employee</div>
    </>
  );
  if (i === 2) return (
    <>
      <Dots calm />
      <Headline>Tell Max your event</Headline>
      <Card className="top-[28%] left-[10%] w-[36%] space-y-[6%] p-[2.5%]" style={anim("ex-pop", 200)}>
        {[["Size", "5,000 people"], ["Budget", "₹10 lakh"], ["Dates", "2 days, Jan"]].map(([k, v], n) => (
          <div key={k} className="flex items-center justify-between rounded-lg bg-[#141414]/5 px-[5%] py-[3%] text-[clamp(0.55rem,2.1cqw,0.85rem)]" style={anim("ex-rise", 600 + n * 400)}>
            <span className="text-[#141414]/55">{k}</span><span className="font-semibold text-[#141414]">{v}</span>
          </div>
        ))}
      </Card>
      <div className="absolute top-[30%] left-[54%] flex h-[46%] w-[36%] items-end gap-[6%]">
        {[[100, "Title"], [55, "Platinum"], [32, "Gold"], [16, "Silver"]].map(([h, label], n) => (
          <div key={label as string} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
            <div className="w-full rounded-t-lg" style={{ height: `${h}%`, background: grad, transformOrigin: "bottom", ...anim("ex-growy", 1800 + n * 250, 700) }} />
            <span className="text-[clamp(0.5rem,1.8cqw,0.75rem)] font-semibold text-[#141414]/70">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
  if (i === 3) return (
    <>
      <Dots />
      <Headline>Max finds who fits, and who decides</Headline>
      {[[14, 32], [40, 32], [66, 32], [27, 60], [53, 60]].map(([x, y], n) => (
        <Card key={n} className="h-[22%] w-[22%] p-[1.5%]" style={{ left: `${x}%`, top: `${y}%`, ...anim("ex-pop", 400 + n * 300) }}>
          <div className="flex items-center gap-[6%]">
            <span className="size-[1.6em] shrink-0 rounded-md text-[clamp(0.6rem,2.1cqw,0.9rem)]" style={{ background: [PINK, VIOLET, SKY, MINT, AMBER][n] }} />
            <div className="h-[0.5em] flex-1 rounded bg-[#141414]/15 text-[clamp(0.6rem,2.1cqw,0.9rem)]" />
          </div>
          <div className="mt-[8%] flex items-center gap-[5%] text-[clamp(0.45rem,1.7cqw,0.7rem)] text-[#141414]/60">
            <span className="grid size-[1.4em] place-items-center rounded-full text-white" style={{ background: MINT, ...anim("ex-pop", 1400 + n * 300) }}>✓</span>verified email
          </div>
        </Card>
      ))}
    </>
  );
  if (i === 4) return (
    <>
      <Dots calm />
      <Headline>Write once. Max fits it to everyone.</Headline>
      <Card className="top-[32%] left-[8%] w-[30%] space-y-[5%] p-[2.5%]" style={anim("ex-pop", 200)}>
        <div className="h-[0.6em] w-1/2 rounded bg-[#141414]/70 text-[clamp(0.6rem,2.1cqw,0.9rem)]" />
        {[90, 80, 86, 60].map((w, n) => <div key={n} className="h-[0.45em] rounded bg-[#141414]/12 text-[clamp(0.6rem,2.1cqw,0.9rem)]" style={{ width: `${w}%`, ...anim("ex-grow", 500 + n * 150) }} />)}
        <div className="inline-flex items-center gap-1 rounded-full px-[6%] py-[2%] text-[clamp(0.5rem,1.8cqw,0.75rem)] font-semibold text-white" style={{ background: "#141414", ...anim("ex-pop", 2600) }}>✓ Your yes</div>
      </Card>
      {[0, 1, 2].map((n) => (
        <span key={n} className="absolute grid size-[7%] place-items-center rounded-lg text-white" style={{ left: "40%", top: `${36 + n * 14}%`, background: grad, animation: `ex-fly 1400ms cubic-bezier(.2,.8,.2,1) ${3000 + n * 350}ms both` }}>
          <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
        </span>
      ))}
      {[0, 1, 2].map((n) => <Card key={n} className="right-[8%] h-[13%] w-[22%]" style={{ top: `${33 + n * 15}%`, ...anim("ex-pop", 800 + n * 200) }}><div className="m-[5%] h-[30%] w-2/3 rounded bg-[#141414]/12" /></Card>)}
    </>
  );
  if (i === 5) return (
    <>
      <Dots />
      <Headline>Replies, meetings, MOUs. Tracked.</Headline>
      <Card className="top-[30%] left-[10%] w-[24%] p-[2%]" style={anim("ex-pop", 200)}>
        <div className="mb-[6%] h-[0.5em] w-1/2 rounded text-[clamp(0.6rem,2.1cqw,0.9rem)]" style={{ background: PINK }} />
        <div className="grid grid-cols-5 gap-[6%]">{Array.from({ length: 15 }, (_, k) => <span key={k} className="aspect-square rounded-sm" style={{ background: k === 8 ? VIOLET : "rgb(20 20 20 / 0.08)", ...(k === 8 ? anim("ex-pop", 1200) : {}) }} />)}</div>
      </Card>
      <Card className="top-[30%] left-[39%] w-[22%] space-y-[6%] p-[2%]" style={anim("ex-pop", 700)}>
        <div className="text-center text-[clamp(0.55rem,2.1cqw,0.85rem)] font-bold text-[#141414]">MOU</div>
        {[80, 90, 70].map((w, n) => <div key={n} className="h-[0.4em] rounded bg-[#141414]/12 text-[clamp(0.6rem,2.1cqw,0.9rem)]" style={{ width: `${w}%` }} />)}
        <svg viewBox="0 0 100 30" className="w-3/4"><path d="M5 22 C 20 2, 30 30, 45 14 S 70 4, 95 18" fill="none" stroke={VIOLET} strokeWidth="3" strokeLinecap="round" style={{ strokeDasharray: 140, animation: "ex-draw 1200ms ease-out 1800ms both" }} /></svg>
      </Card>
      <Card className="top-[30%] right-[10%] w-[24%] p-[2%]" style={anim("ex-pop", 1200)}>
        <div className="text-[clamp(0.5rem,1.8cqw,0.75rem)] text-[#141414]/60">Raised</div>
        <div className="text-[clamp(0.9rem,3.6cqw,1.5rem)] font-bold text-[#141414]">₹10 lakh</div>
        <div className="mt-[8%] h-[0.5em] overflow-hidden rounded-full bg-[#141414]/10 text-[clamp(0.6rem,2.1cqw,0.9rem)]"><div className="h-full rounded-full" style={{ background: grad, width: "100%", transformOrigin: "left", ...anim("ex-grow", 2200, 1600) }} /></div>
      </Card>
    </>
  );
  return (
    <div className="absolute inset-0 grid place-items-center text-white" style={{ background: grad }}>
      <div className="text-center">
        <div className="mx-auto mb-[4%] w-[16%] min-w-16" style={anim("ex-pop", 200, 800)}><MaxFace className="w-full rounded-full bg-white" /></div>
        <div className="text-[clamp(1.4rem,7.5cqw,3rem)] font-bold tracking-tight" style={anim("ex-rise", 500)}>SponsorDesk</div>
        <div className="text-[clamp(0.8rem,3.0cqw,1.15rem)] opacity-85" style={anim("ex-rise", 900)}>Your sponsorship employee</div>
        <div className="mt-[3%] text-[clamp(0.6rem,2.1cqw,0.85rem)] opacity-70" style={anim("ex-rise", 1300)}>spoker-agent-one.vercel.app</div>
      </div>
    </div>
  );
}

/** The player: one scene at a time, voiceover per scene, captions, play and pause, sound on or off. */
export function Explainer({ onClose, startMuted = false }: { onClose?: () => void; startMuted?: boolean }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(startMuted);
  const [run, setRun] = useState(0); // remounts a scene to replay its animation
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const next = useCallback(() => { setI((n) => { if (n >= SCENES.length - 1) { setPlaying(false); return n; } return n + 1; }); }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    audio.current?.pause();
    if (!playing) return;
    const a = new Audio(`/explainer/s${i}.mp3`);
    a.muted = muted;
    audio.current = a;
    let fallback = true;
    a.onended = () => next();
    a.onplaying = () => { fallback = false; };
    a.play().catch(() => { /* no clip or autoplay blocked: timers carry the scene */ });
    // If the clip never starts (missing file), move on after the scene's own length.
    timer.current = setTimeout(function tick() { if (fallback) next(); }, SCENES[i].secs * 1000 + 400);
    return () => { a.pause(); a.onended = null; if (timer.current) clearTimeout(timer.current); };
  }, [i, playing, run]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const restart = () => { setI(0); setRun((r) => r + 1); setPlaying(true); };
  return (
    <div className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#fff7ec] [container-type:inline-size]" onClick={() => setPlaying((p) => !p)}>
        <div key={`${i}-${run}`} className="absolute inset-0">{<Scene i={i} />}</div>
        <div className="absolute inset-x-[6%] bottom-[5%] text-center">
          <span className="inline rounded-md bg-[#141414]/80 box-decoration-clone px-2 py-0.5 text-[clamp(0.5rem,2.1cqw,0.9rem)] leading-relaxed text-white">{SCENES[i].say}</span>
        </div>
        {!playing && <div className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid size-14 place-items-center rounded-full bg-white/90 text-[#141414] shadow-lg"><Play className="ml-0.5 size-6" /></span></div>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="grid size-8 place-items-center rounded-full bg-foreground text-background">{playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}</button>
        <button type="button" onClick={restart} aria-label="Start again" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><RotateCcw className="size-4" /></button>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
        <div className="ml-1 flex flex-1 gap-1">
          {SCENES.map((s, n) => <button key={s.title} type="button" onClick={() => { setI(n); setRun((r) => r + 1); setPlaying(true); }} aria-label={s.title} title={s.title} className={cn("h-1.5 flex-1 rounded-full transition", n < i ? "bg-foreground" : n === i ? "bg-foreground/60" : "bg-muted")} />)}
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>}
      </div>
    </div>
  );
}

/** "Watch how it works": opens the explainer over the page. */
export function WatchButton({ className, label = "Watch how it works" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-9 items-center gap-2 rounded-full border bg-card pr-3.5 pl-1 text-sm font-medium transition hover:border-foreground/30", className)}>
        <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: grad }}><Play className="ml-0.5 size-3.5" /></span>{label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="How SponsorDesk works" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-4xl rounded-2xl bg-card p-2.5 shadow-2xl sm:p-3"><Explainer onClose={() => setOpen(false)} /></div>
        </div>
      )}
    </>
  );
}
