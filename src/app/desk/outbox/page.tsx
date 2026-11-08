"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowLeft, Check, CheckCheck, Inbox as InboxIcon, Info, Pencil, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, ago, brandName, when } from "@/components/desk/format";

const kindOf = (m: Any) => (m.sequence === "cold" ? (m.step === 0 ? "Priced offer" : `Follow-up ${m.step}`) : m.sequence === "reply" ? "Reply" : m.sequence === "meeting" ? "Meeting" : m.sequence === "recap" ? "Recap" : m.sequence === "mou" ? "MOU" : m.sequence === "nurture" ? "Update" : m.sequence);

export default function OutboxPage() {
  const { data, act, busy, flash, can, openCompany } = useDesk();
  const approver = can("approver");
  const msgs: Any[] = data.messages;
  const sets = {
    draft: msgs.filter((m) => m.status === "drafted"),
    queued: msgs.filter((m) => ["approved", "claimed", "failed"].includes(m.status)),
    check: msgs.filter((m) => ["send_unknown", "needs_manual_review"].includes(m.status)),
    sent: msgs.filter((m) => m.status === "sent"),
  };
  const [tab, setTab] = useState<keyof typeof sets>("draft");
  const list = sets[tab];
  const [sel, setSel] = useState<string>("");
  const [edit, setEdit] = useState<Any>(null);
  // Phones and tablets: the list, or one email. Wide screens show both side by side.
  const [reading, setReading] = useState(false);
  useEffect(() => { if (!list.find((m) => m.key === sel)) setSel(list[0]?.key || ""); }, [tab, list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = list.find((m) => m.key === sel);
  const co = (id: string) => data.companies.find((c: Any) => c.id === id) || { name: id };

  return (
    <>
      <PageHeader tour="send" title="Send" description="Nothing is sent until an approver says yes.">
        {sets.draft.length > 1 && <Button variant="outline" disabled={!!busy || !approver} onClick={() => act("approve_many", { keys: sets.draft.map((m) => m.key) }, "Approving").then((r: Any) => r && flash(`Approved ${r.results.filter((x: Any) => x.ok).length} emails`, undefined, "success"))}><CheckCheck className="size-4" />Approve all {sets.draft.length}</Button>}
        <Button disabled={!!busy || !approver} onClick={() => act("send", {}, "Sending approved emails").then((r: Any) => r && flash(`Sent ${r.sent}`, (r.notes || []).join(" "), "info"))}><Send className="size-4" />Send approved now</Button>
      </PageHeader>
      {!data.settings.gmail && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="size-4 shrink-0 text-warning" />Draft mode: connect Gmail in Connectors to send from your mailbox.</p>}
      {!approver && <p className="text-sm text-muted-foreground">Your role ({data.me?.role}) can edit drafts. An approver sends them.</p>}

      <div className="grid min-h-[60vh] overflow-hidden rounded-xl border bg-card lg:grid-cols-[19rem_1fr]">
        <div className={cn("flex min-w-0 flex-col lg:border-r", reading && "hidden lg:flex")}>
          <div className="flex gap-0.5 overflow-x-auto border-b bg-muted/40 p-1.5 scrollbar-thin">
            {([["draft", "To approve"], ["queued", "Queued"], ["check", "Check"], ["sent", "Sent"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={cn("shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[0.8125rem] transition", tab === k ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l} <span className="num text-muted-foreground">{sets[k].length}</span></button>
            ))}
          </div>
          <div className="max-h-[70vh] flex-1 overflow-y-auto">
            {list.map((m) => (
              <button key={m.key} type="button" onClick={() => { setSel(m.key); setEdit(null); setReading(true); }} className={cn("flex w-full gap-3 border-b border-l-2 border-l-transparent px-3 py-2.5 text-left transition", sel === m.key ? "lg:border-l-foreground lg:bg-muted/60" : "hover:bg-muted/40")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{brandName(co(m.company_id))}</span><span className="ml-auto shrink-0 text-[0.6875rem] text-muted-foreground">{ago(m.sent_at || m.created_at)}</span></div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="min-w-0 truncate">{m.to_email}</span><span className="shrink-0 rounded bg-muted px-1.5 py-px text-[0.625rem]">{kindOf(m)}</span></div>
                </div>
              </button>
            ))}
            {!list.length && <div className="p-8 text-center text-sm text-muted-foreground">{tab === "draft" ? "Nothing waiting for you." : "Empty."}</div>}
          </div>
        </div>
        <div className={cn("min-w-0 p-4 md:p-5", !reading && "hidden lg:block")}>
          <button type="button" onClick={() => setReading(false)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"><ArrowLeft className="size-4" />All emails</button>
          {!cur ? (
            <EmptyState icon={InboxIcon} title={tab === "draft" ? "Nothing to approve" : "Pick an email"}>{tab === "draft" ? "The agents put every draft here before it can go out." : "Choose one on the left to read it."}</EmptyState>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button type="button" className="text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={() => openCompany(cur.company_id)}>{co(cur.company_id).name}</button>
                  <h2 className="text-lg leading-snug font-bold tracking-tight">{edit ? "Editing draft" : cur.subject}</h2>
                  <div className="text-xs text-muted-foreground">To {cur.to_email} · {kindOf(cur)} · {cur.scheduled_for ? `due ${when(cur.scheduled_for)}` : when(cur.created_at)}</div>
                </div>
                {tab === "draft" && !edit && (
                  <div className="flex gap-2">
                    <Button disabled={!!busy || !approver} onClick={() => act("approve", { key: cur.key }, "Approving").then((r: Any) => r && !r.ok && flash("Not approved", r.reason, "error"))}><Check className="size-4" />Approve</Button>
                    <Button variant="outline" onClick={() => setEdit({ subject: cur.subject, body: cur.body })}><Pencil className="size-4" />Edit</Button>
                    {approver && <Button variant="ghost" className="text-destructive" disabled={!!busy} onClick={() => act("reject", { key: cur.key }, "Rejecting")}><Trash2 className="size-4" />Reject</Button>}
                  </div>
                )}
              </div>
              {tab === "check" && (
                <div className="space-y-2 rounded-lg border border-warning/40 p-4 text-sm">
                  <p>Gmail may or may not have delivered this email. It is never resent automatically. {cur.status === "send_unknown" ? "The next daily cycle checks your Sent folder." : "Look in your Gmail Sent folder, then choose."}</p>
                  {approver && <div className="flex gap-2"><Button size="sm" disabled={!!busy} onClick={() => act("delivery", { key: cur.key, outcome: "sent" }, "Marking as sent")}>It was sent</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("delivery", { key: cur.key, outcome: "resend" }, "Queuing a resend")}>Not in Sent: resend</Button></div>}
                </div>
              )}
              {edit ? (
                <div className="space-y-3">
                  <Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} aria-label="Subject" />
                  <Textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="min-h-80 font-mono text-sm" aria-label="Body" />
                  <div className="flex gap-2">
                    <Button onClick={() => act("edit", { key: cur.key, ...edit }, "Saving").then((r: Any) => { if (r?.ok) setEdit(null); else if (r) flash("Fix these first", (r.problems || [r.reason]).join("; "), "error"); })}>Save (style is re-checked)</Button>
                    <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <article className="max-w-2xl rounded-xl bg-muted/40 p-4">
                  <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{cur.body}</pre>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
