"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { toast } from "@/components/ui/toast";

import { type Any, api } from "./format";

type Busy = { op: string; label: string } | null;
type Progress = { done: number; total: number; label: string } | null;
type Desk = {
  data: Any;
  load: () => Promise<void>;
  act: (op: string, body?: Any, label?: string, reload?: boolean) => Promise<Any>;
  busy: Busy;
  progress: Progress;
  setProgress: (p: Progress) => void;
  flash: (title: string, description?: string, type?: "success" | "error" | "info") => void;
  openCompany: (id: string) => void;
  companyId: string;
  closeCompany: () => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  /** Opens the chat and asks. `spoken` answers out loud, in `lang` (the language it was asked in). */
  ask: (q: string, opts?: { lang?: string; spoken?: boolean }) => void;
  pendingQuestion: string;
  pendingVoice: { lang: string; spoken: boolean };
  clearPending: () => void;
  me: Any;
  can: (r: "readonly" | "operator" | "approver" | "admin") => boolean;
  autopilot: (count: number) => Promise<void>;
  findDifferent: () => Promise<void>;
};

/** One short line when a major task finishes; small edits stay quiet. */
function doneMessage(op: string, r: Any): [string, string?] | null {
  const n = (x: Any) => (Array.isArray(x) ? x.length : Number(x) || 0);
  switch (op) {
    case "brief": return r?.clarify ? null : ["Event packaged", "Prices and audience are ready. Find companies whenever you like."];
    case "prefs": return ["Preferences saved"];
    case "lock_floor": return ["Floor locked", "You can now find sponsors."];
    case "discover": return [`Found ${n(r?.added)} companies`, "Scoring them next."];
    case "analyze": return r?.dropped ? ["Company dropped", "It did not fit this event."] : [`Scored: ${r?.priority || "done"}`, r?.contact ? "Verified people found." : "No verified person yet."];
    case "rediscover": return ["People search finished"];
    case "past_sponsors": return ["Past sponsors updated"];
    case "add_past_sponsors": return [`Added ${r?.added || 0} past sponsors`, "They set the level for the next search."];
    case "schedule": return ["Meeting times sent for approval"];
    case "confirm_meeting": return ["Meeting booked"];
    case "send_mou": return ["MOU sent"];
    case "save_template": return r?.updated ? [`Draft saved and used for ${r.updated} waiting ${r.updated === 1 ? "email" : "emails"}`, r.failed?.length ? `${r.failed.length} could not be rewritten: ${r.failed[0]}` : undefined] : ["Draft saved", "New emails will use it."];
    case "replace_companies": return [`Set aside ${r?.removed || 0} companies`, "Finding different ones now."];
    case "prepare_outreach": case "next_wave": return r?.people?.length ? [`Drafted for ${r.people.join(", ")}`, "Waiting in the Outbox for your approval."] : ["Offer drafted", "Waiting in the Outbox for your approval."];
    case "approve": return ["Approved"];
    case "approve_many": return [`Approved ${n(r?.results)}`];
    case "send": return [`Sent ${n(r?.sent)}`];
    case "replies": return ["Inbox checked"];
    case "deck": return ["Deck ready"];
    case "mou": return ["MOU drafted"];
    case "add_company": return ["Company added"];
    default: return null;
  }
}

const Ctx = createContext<Desk | null>(null);
export const useDesk = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDesk outside DeskProvider");
  return c;
};
const RANK: Record<string, number> = { readonly: 0, operator: 1, approver: 2, admin: 3 };

export function DeskProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [data, setData] = useState<Any>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [companyId, setCompanyId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingQuestion, setPending] = useState("");
  const [pendingVoice, setPendingVoice] = useState({ lang: "", spoken: false });
  const loading = useRef(false);

  const flash = useCallback((title: string, description?: string, type: "success" | "error" | "info" = "info") => {
    toast.add({ title, description, type });
  }, []);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try { setData(await api("/api/state")); }
    catch (e: Any) { if (e.code !== 401) flash("Could not load the desk", e.message, "error"); }
    finally { loading.current = false; }
  }, [flash]);

  const act = useCallback(async (op: string, body: Any = {}, label = "", reload = true) => {
    setBusy({ op, label: label || op });
    try {
      const r = await api("/api/act", { op, ...body });
      if (reload) await load();
      const msg = doneMessage(op, r);
      if (msg) flash(msg[0], msg[1], "success");
      return r;
    } catch (e: Any) {
      if (e.code !== 401) flash("That did not work", e.message, "error");
      return null;
    } finally { setBusy(null); }
  }, [load, flash]);

  /** Discover, then score each company one by one (one Crustdata call at a time keeps within rate limits). */
  const autopilot = useCallback(async (count: number) => {
    const r = await act("discover", { count }, `Finding ${count} sponsors with fresh budget signals`);
    if (!r) return;
    const fresh = await api("/api/state").catch(() => null);
    const ids: string[] = [...(r.added || []), ...((fresh?.companies || []) as Any[]).filter((c) => c.stage === "PROSPECT" && !(r.added || []).includes(c.id)).map((c) => c.id)];
    for (let i = 0; i < ids.length; i++) {
      const name = (fresh?.companies || []).find((c: Any) => c.id === ids[i])?.name || ids[i];
      setProgress({ done: i, total: ids.length, label: `Scoring ${name}: both sides, decision maker, priced offer` });
      try { await api("/api/act", { op: "analyze", company_id: ids[i] }); } catch (err: Any) { if (err.code !== 401) flash(`Could not score ${name}`, err.message, "error"); }
      await load();
    }
    setProgress(null);
    flash("Companies ready", `${ids.length} researched, with people and emails. Drafts are waiting in Send.`, "success");
  }, [act, load, flash]);

  /** Not happy with the list: set aside the untouched ones and find the same number of different companies. */
  const findDifferent = useCallback(async () => {
    const r = await act("replace_companies", {}, "Setting these companies aside");
    if (r?.removed) await autopilot(r.removed);
  }, [act, autopilot]);

  useEffect(() => {
    const out = () => { setData(null); router.replace(`/login?next=${encodeURIComponent(path || "/desk")}`); };
    window.addEventListener("sd-signed-out", out);
    return () => window.removeEventListener("sd-signed-out", out);
  }, [router, path]);
  useEffect(() => {
    load();
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("gmail");
    if (q) { flash(q === "connected" ? "Google connected" : "Google", q === "connected" ? "Gmail and Calendar are live." : q, q === "connected" ? "success" : "error"); window.history.replaceState({}, "", window.location.pathname); }
    const ig = sp.get("instagram");
    if (ig) { const ok = ig.startsWith("connected:"); flash(ok ? `Instagram connected: @${ig.slice(10)}` : "Instagram", ok ? "Press Save and search under Past sponsors to read your posts." : ig, ok ? "success" : "error"); window.history.replaceState({}, "", window.location.pathname); }
  }, [load, flash]);
  // Continue where you left off: each person's last page is remembered on this device, and signing in returns there.
  const meId = data?.me?.id || "";
  const viewing = !!data?.me?.viewing;
  useEffect(() => {
    if (!meId || viewing) return;
    const key = `sd_last_path:${meId}`;
    const here = window.location.pathname + window.location.search;
    if (new URLSearchParams(window.location.search).get("resume") === "1") {
      let last = "";
      try { last = localStorage.getItem(key) || ""; } catch { /* storage blocked */ }
      const go = last.startsWith("/desk") && !last.includes("resume=") ? last : "/desk";
      router.replace(go);
      if (go !== "/desk") flash("Welcome back", "You are where you left off.", "info");
      return;
    }
    try { localStorage.setItem(key, here); } catch { /* storage blocked */ }
  }, [path, meId, viewing, router, flash]);
  // Live log while agents work, so the activity feed and agent flow move in real time.
  useEffect(() => {
    if (!busy && !progress) return;
    const t = setInterval(async () => {
      try { const r = await api("/api/state?log_only=1"); setData((d: Any) => (d ? { ...d, log: r.log } : d)); } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(t);
  }, [busy, progress]);

  const me = data?.me || { role: "readonly" };
  const value = useMemo<Desk>(() => ({
    data, load, act, busy, progress, setProgress, flash, me,
    can: (r) => (RANK[me.role] ?? 0) >= RANK[r],
    openCompany: (id) => setCompanyId(id), companyId, closeCompany: () => setCompanyId(""),
    chatOpen, setChatOpen,
    ask: (q, opts) => { setPendingVoice({ lang: opts?.lang || "", spoken: !!opts?.spoken }); setPending(q); setChatOpen(true); },
    pendingQuestion, pendingVoice, clearPending: () => setPending(""),
    autopilot, findDifferent,
  }), [data, load, act, busy, progress, flash, me, companyId, chatOpen, pendingQuestion, pendingVoice, autopilot, findDifferent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
