"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "cn";
import { Eye, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EmptyState, PageHeader } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, ago, api, when } from "@/components/desk/format";

// What each action means, in words an organiser would use.
const OP: Record<string, string> = {
  brief: "Wrote the event brief", past_sponsors: "Searched for past sponsors", prefs: "Changed sponsor preferences", edit_event: "Edited tiers or event details",
  lock_floor: "Locked the floor price", discover: "Ran sponsor discovery", analyze: "Scored a company", add_company: "Added a company", rediscover: "Searched for people again",
  set_email: "Added a contact email", set_primary: "Changed the primary contact", contact_reviewed: "Reviewed a contact", prepare_outreach: "Prepared an offer",
  approve: "Approved an email", approve_many: "Approved several emails", reject: "Rejected an email", edit: "Edited an email", send: "Sent approved emails", delivery: "Resolved a delivery check",
  schedule: "Drafted a meeting email", confirm_meeting: "Booked a meeting", deck: "Built a sponsor deck", notes: "Added meeting notes", gemini_notes: "Imported meeting notes",
  resolve: "Decided an exception", mou: "Drafted an MOU", send_mou: "Sent an MOU", nurture: "Wrote a sponsor update", replies: "Checked replies", stage: "Moved a deal",
  simulate: "Simulated a reply", reconcile: "Reconciled sent mail", suppress: "Suppressed an address", forget: "Erased a person's data", settings: "Changed settings", reset: "Reset the desk",
  user_add: "Invited a teammate", user_update: "Changed a teammate", sessions_revoke: "Signed someone out", google_connect: "Connected Gmail", google_disconnect: "Disconnected Gmail",
  cycle: "Ran the daily cycle", view_desk: "Opened a desk read-only", view_desk_end: "Closed a read-only view",
};
const detailText = (d: Any) => Object.entries(d || {}).map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ");
const device = (ua: string) => /iphone|android|mobile/i.test(ua) ? "Phone" : /ipad|tablet/i.test(ua) ? "Tablet" : ua ? "Computer" : "";

export default function AdminPage() {
  const { data, load, flash } = useDesk();
  const [tab, setTab] = useState<"people" | "actions" | "logins">("people");
  const [who, setWho] = useState("");
  const [d, setD] = useState<Any>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setD(await api(`/api/admin${who ? `?user=${encodeURIComponent(who)}` : ""}`)); } catch (e: Any) { flash("Could not load activity", e.message, "error"); } finally { setBusy(false); }
  }, [who, flash]);
  const isOwner = !!data.me?.owner;
  useEffect(() => { if (isOwner) refresh(); }, [refresh, isOwner]);

  if (!isOwner) return <EmptyState title="Owner only">Only the owner of SponsorDesk can see everyone's activity.</EmptyState>;
  const view = async (ws: string | null) => {
    try { await api("/api/admin", { view: ws }); await load(); window.location.href = "/desk"; } catch (e: Any) { flash("Could not open that desk", e.message, "error"); }
  };
  const nameOf = (id: string) => (d?.users || []).find((u: Any) => u.id === id)?.name || "";
  const deskOf = (ws: string) => (d?.desks || []).find((x: Any) => x.ws === ws);
  const myWs = (d?.users || []).find((x: Any) => x.id === data.me.id)?.workspace_id || "default";

  return (
    <>
      <PageHeader title="Activity" description="Who signed in, and what they did.">
        <Button variant="ghost" size="icon" onClick={refresh} disabled={busy} aria-label="Refresh"><RefreshCw className={cn(busy && "animate-spin")} /></Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted p-1">
          {([["people", "People"], ["actions", "Actions"], ["logins", "Sign-ins"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-md px-3 py-1 text-sm", tab === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        {tab !== "people" && (
          <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by person" className="w-52">
            <NativeSelectOption value="">Everyone</NativeSelectOption>
            {(d?.users || []).map((u: Any) => <NativeSelectOption key={u.id} value={u.id}>{u.name}</NativeSelectOption>)}
          </NativeSelect>
        )}
      </div>

      {!d ? <p className="text-sm text-muted-foreground">Loading…</p> : tab === "people" ? (
        <>
        {/* Phones: one row per person, no sideways scrolling. */}
        <ul className="divide-y rounded-xl border md:hidden">
          {d.users.map((u: Any) => {
            const desk = deskOf(u.workspace_id || "default");
            return (
              <li key={u.id} className="space-y-2 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="font-medium">{u.name}{Number(u.is_owner) ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">owner</span> : null}</div><div className="truncate text-xs text-muted-foreground">{u.email}</div></div>
                  {(u.workspace_id || "default") !== myWs && <Button size="sm" variant="outline" onClick={() => view(u.workspace_id || "default")}><Eye />Open</Button>}
                </div>
                <div className="text-muted-foreground">{desk?.event || "No brief yet"}{desk ? ` · ${desk.companies} compan${desk.companies === 1 ? "y" : "ies"} · ${desk.sent} sent` : ""}</div>
                <div className="text-xs text-muted-foreground">Last sign-in {u.last_login_at ? ago(u.last_login_at) : "never"} · <button type="button" className="hover:underline" onClick={() => { setWho(u.id); setTab("actions"); }}>{Number(u.actions || 0)} actions</button></div>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border md:block">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">{["Person", "Desk", "Event", "Progress", "Last sign-in", "Actions", ""].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {d.users.map((u: Any) => {
                const desk = deskOf(u.workspace_id || "default");
                const mine = (u.workspace_id || "default") === myWs;
                return (
                  <tr key={u.id} className={cn(u.disabled && "opacity-50")}>
                    <td className="px-4 py-3"><div className="font-medium">{u.name}{Number(u.is_owner) ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">owner</span> : null}</div><div className="text-xs text-muted-foreground">{u.email} · {u.role}</div></td>
                    <td className="px-4 py-3 text-muted-foreground">{desk?.name || "—"}</td>
                    <td className="px-4 py-3">{desk?.event || <span className="text-muted-foreground">No brief yet</span>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground num">{desk ? `${desk.companies} compan${desk.companies === 1 ? "y" : "ies"} · ${desk.sent} sent · ${desk.deals} MOUs` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground" title={u.last_login_at ? when(u.last_login_at) : ""}>{u.last_login_at ? ago(u.last_login_at) : "Never"}</td>
                    <td className="px-4 py-3"><button type="button" className="hover:underline num" onClick={() => { setWho(u.id); setTab("actions"); }}>{Number(u.actions || 0)}</button></td>
                    <td className="px-4 py-3 text-right">{!mine && <Button size="sm" variant="outline" onClick={() => view(u.workspace_id || "default")}><Eye />Open desk</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : tab === "actions" ? (
        d.actions.length ? (
          <ol className="divide-y rounded-xl border">
            {d.actions.map((a: Any) => (
              <li key={a.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <div className="text-xs text-muted-foreground" title={when(a.at)}>{ago(a.at)}</div>
                <div className="min-w-0">
                  <div><span className="font-medium">{a.name || nameOf(a.user_id)}</span> <span className={cn(!Number(a.ok) && "text-destructive")}>{(OP[a.op] || a.op).toLowerCase()}{!Number(a.ok) ? " (failed)" : ""}</span>{deskOf(a.ws) && <span className="text-muted-foreground"> · {deskOf(a.ws).name}</span>}</div>
                  {(detailText(a.detail) || a.error) && <div className="truncate text-xs text-muted-foreground" title={detailText(a.detail) + (a.error ? ` · ${a.error}` : "")}>{a.error || detailText(a.detail)}</div>}
                </div>
              </li>
            ))}
          </ol>
        ) : <EmptyState title="No actions yet" />
      ) : d.logins.length ? (
        <ol className="divide-y rounded-xl border">
          {d.logins.map((l: Any) => (
            <li key={l.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_10rem] sm:gap-4">
              <div className="text-xs text-muted-foreground" title={when(l.at)}>{ago(l.at)}</div>
              <div className="min-w-0 truncate">
                <span className="font-medium">{nameOf(l.user_id) || l.email || "Unknown"}</span>{" "}
                <span className={cn(Number(l.ok) ? "text-muted-foreground" : "text-destructive")}>{l.method === "logout" ? "signed out" : Number(l.ok) ? `signed in with ${l.method === "google" ? "Google" : "a password"}` : `failed to sign in${l.detail ? `: ${l.detail}` : ""}`}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground" title={l.user_agent}>{[device(l.user_agent), l.ip && l.ip !== "unknown" ? l.ip : ""].filter(Boolean).join(" · ")}</div>
            </li>
          ))}
        </ol>
      ) : <EmptyState title="No sign-ins yet" />}
    </>
  );
}
