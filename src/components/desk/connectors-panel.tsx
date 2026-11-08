"use client";

import { useState } from "react";

import { cn } from "cn";
import { Check, ExternalLink, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useDesk } from "./desk-provider";
import type { Any } from "./format";

// Connectors: every service the desk can use, in one place. Sign-in ones (Gmail and Calendar, Instagram), key ones
// (Crustdata, Apollo, Claude, Gemini) and any other tool the team uses (Canva, Drive, Notion...). Admins connect;
// everyone sees what is on. Keys are never shown again after saving, only their last 4 characters.

const SUGGEST = ["Canva", "Google Drive", "Google Slides", "Notion", "HubSpot", "Zoho CRM", "Slack", "WhatsApp Business", "Airtable", "Trello"];

function Status({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", on ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{on && <Check className="size-3" />}{children}</span>;
}

function Card({ name, what, status, children }: { name: string; what: string; status: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold tracking-tight">{name}</span>{status}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">{what}</p>
      {children && <div className="mt-auto space-y-2 pt-1">{children}</div>}
    </div>
  );
}

function KeyCard({ c }: { c: Any }) {
  const { act, busy, can } = useDesk();
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);
  const status = c.source === "yours" ? <Status on>Your key ····{c.ending}</Status> : c.source === "shared" ? <Status on>On (shared key)</Status> : <Status on={false}>Not connected</Status>;
  return (
    <Card name={c.name} what={c.what} status={status}>
      {can("admin") && (open ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act("connector_save", { id: c.id, key }, `Checking your ${c.name} key`).then((r) => { if (r) { setKey(""); setOpen(false); } }); }}>
          <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={c.hint} aria-label={`${c.name} API key`} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="submit" disabled={!!busy || key.trim().length < 8}>Check and save</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <a href={c.getKeyUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Get a key<ExternalLink className="size-3" /></a>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{c.source === "yours" ? "Change key" : "Connect"}</Button>
          {c.source === "yours" && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("connector_remove", { id: c.id }, `Removing your ${c.name} key`)}>Remove</Button>}
        </div>
      ))}
    </Card>
  );
}

function OtherTools() {
  const { data, act, busy, can } = useDesk();
  const tools: Any[] = data.settings?.tools || [];
  const [f, setF] = useState({ name: "", url: "", key: "", deck: false });
  const isDesign = /canva|slides|drive|docs\.google|figma|pitch\.com|gamma/i.test(f.url + f.name);
  return (
    <div className="space-y-3 rounded-xl border bg-card p-3.5">
      <div>
        <div className="font-semibold tracking-tight">Any other tool</div>
        <p className="text-xs text-muted-foreground">Canva, Google Drive, Notion, a CRM: save it here so the team finds it in one place. A Canva, Slides or Drive link to your deck can go with every first email.</p>
      </div>
      {tools.length > 0 && (
        <ul className="divide-y text-sm">
          {tools.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-2">
              <span className="font-medium">{t.name}</span>
              {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs text-muted-foreground hover:text-foreground">{t.url.replace(/^https:\/\//, "")}</a>}
              {t.has_key && <Status on>key saved</Status>}
              {can("admin") && <button type="button" aria-label={`Remove ${t.name}`} className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => act("tool_remove", { id: t.id }, `Removing ${t.name}`)}><X className="size-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      {can("admin") && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act("tool_add", { name: f.name, url: f.url, key: f.key, use_as_deck: f.deck }, `Saving ${f.name}`).then((r) => { if (r) setF({ name: "", url: "", key: "", deck: false }); }); }}>
          <div className="flex flex-wrap gap-1.5">
            {SUGGEST.filter((s) => !tools.some((t) => t.name === s)).map((s) => (
              <button key={s} type="button" onClick={() => setF({ ...f, name: s })} className={cn("rounded-md border px-2 py-0.5 text-xs", f.name === s ? "border-primary text-foreground" : "border-dashed text-muted-foreground hover:text-foreground")}>{s}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Tool name" aria-label="Tool name" />
            <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Link (https://…)" aria-label="Link" inputMode="url" />
            <Input type="password" autoComplete="off" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} placeholder="API key (optional)" aria-label="API key, optional" />
          </div>
          {f.url && isDesign && (
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.deck} onChange={(e) => setF({ ...f, deck: e.target.checked })} />Send this link as our deck with every first email</label>
          )}
          <Button size="sm" type="submit" variant="outline" disabled={!!busy || !f.name.trim()}><Plus />Add</Button>
        </form>
      )}
    </div>
  );
}

export function ConnectorsPanel({ compact = false }: { compact?: boolean }) {
  const { data, act, busy, can } = useDesk();
  const s = data.settings || {};
  const keys: Any[] = s.connectors || [];
  return (
    <div className="space-y-4">
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", !compact && "xl:grid-cols-3")}>
        <Card name="Gmail and Calendar" what="Send emails from your own mailbox, read replies, and book meetings with Google Meet links."
          status={s.gmail ? <Status on>{s.gmail}</Status> : <Status on={false}>Not connected</Status>}>
          {can("admin") && (s.googleApp
            ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/google/auth" />}>{s.gmail ? "Reconnect" : "Connect Google"}</Button>{s.gmail && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("google_disconnect", {}, "Disconnecting Google")}>Disconnect</Button>}</div>
            : <p className="text-xs text-muted-foreground">Needs Google sign-in set up for the site first (GOOGLE_CLIENT_ID in Vercel).</p>)}
        </Card>
        <Card name="Instagram" what="Reads your own posts to find past sponsors you tagged." status={s.instagram?.connected ? <Status on>@{s.instagram.handle}</Status> : <Status on={false}>Not connected</Status>}>
          {can("admin") && (s.instagram?.app
            ? <Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/instagram/auth" />}>{s.instagram?.connected ? "Reconnect" : "Connect Instagram"}</Button>
            : <p className="text-xs text-muted-foreground">Needs a Meta app for the site first (INSTAGRAM_APP_ID in Vercel).</p>)}
        </Card>
        {keys.map((c) => <KeyCard key={c.id} c={c} />)}
      </div>
      <OtherTools />
      {!can("admin") && <p className="text-xs text-muted-foreground">Only an admin can connect or remove services.</p>}
    </div>
  );
}
