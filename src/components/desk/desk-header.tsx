"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Building2, Loader2, MessageCircle, Mic, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useDesk } from "./desk-provider";
import { type Any, AGENTS, brandName, OP_AGENT } from "./format";
import { LayoutControls } from "./layout-controls";
import { ThemeSwitcher } from "./theme-switcher";
import { useVoiceControl, VOICE_EXAMPLES, VoiceButton } from "./voice-control";

const PAGES = [
  ["Dashboard", "/desk"], ["Event brief", "/desk/brief"], ["Companies", "/desk/companies"], ["Pipeline", "/desk/pipeline"], ["Agents", "/desk/agents"],
  ["Outbox", "/desk/outbox"], ["Inbox", "/desk/inbox"], ["People", "/desk/people"], ["Meetings", "/desk/meetings"], ["Deals and MOUs", "/desk/deals"],
  ["Sponsor updates", "/desk/sponsors"], ["Settings", "/desk/settings"],
];
const TITLES: Record<string, string> = { ...Object.fromEntries(PAGES.map(([t, u]) => [u, t])), "/desk/admin": "Activity" };

export function DeskHeader() {
  const path = usePathname() || "/desk";
  const router = useRouter();
  const { data, busy, progress, openCompany, ask, setChatOpen } = useDesk();
  const voice = useVoiceControl();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const agent = busy ? AGENTS.find((a) => a.id === OP_AGENT[busy.op]) : progress ? AGENTS[1] : null;
  const label = busy?.label || progress?.label || "";
  const title = TITLES[path] || "SponsorDesk";
  const go = (u: string) => { setOpen(false); router.push(u); };

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center border-b bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
        <div className="hidden text-sm font-medium lg:block">{title}</div>
        <button type="button" onClick={() => setOpen(true)} aria-label="Search"
          className="flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground lg:ml-3">
          <Search className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">Search</span>
          <kbd className="hidden rounded border px-1 font-mono text-[0.65rem] md:inline">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1">
          {(busy || progress) && (
            <div className="mr-2 hidden items-center gap-2 text-xs text-muted-foreground md:flex" role="status" aria-live="polite" title={label}>
              <Loader2 className="size-3.5 animate-spin" />
              <span className="max-w-56 truncate">{agent ? `${agent.name}: ` : ""}{label}</span>
              {progress && <span className="num">{progress.done + 1}/{progress.total}</span>}
            </div>
          )}
          <VoiceButton className="hidden md:inline-flex" />
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => setChatOpen(true)}>
            <MessageCircle />Ask
          </Button>
          <LayoutControls />
          <ThemeSwitcher />
        </div>
        {/* Progress along the top edge on every screen size: a moving sliver while one task runs, a filling bar when
            the desk knows how many steps there are (scoring company 3 of 12). */}
        {(busy || progress) && (
          <div className="absolute inset-x-0 bottom-0 h-[0.1875rem] overflow-hidden bg-muted" role="progressbar" aria-label={label}
            {...(progress ? { "aria-valuemin": 0, "aria-valuemax": progress.total, "aria-valuenow": progress.done } : {})}>
            {progress
              ? <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(((progress.done + 0.5) / Math.max(1, progress.total)) * 100)}%` }} />
              : <div className="sd-indeterminate h-full w-1/3 bg-primary" />}
          </div>
        )}
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a company, a page or a question..." />
        <CommandList>
          <CommandEmpty>Nothing found. Press Enter in the chat to ask the desk instead.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            {voice.enabled && <CommandItem value={`talk voice ${VOICE_EXAMPLES.join(" ")}`} onSelect={() => { setOpen(false); voice.toggle(); }}><Mic />Talk to the desk<span className="ml-auto text-xs text-muted-foreground">Alt+V</span></CommandItem>}
            <CommandItem onSelect={() => { setOpen(false); ask("What's going on?"); }}><MessageCircle />Ask: what's going on?</CommandItem>
            <CommandItem onSelect={() => { setOpen(false); ask("What should I do next?"); }}><MessageCircle />Ask: what should I do next?</CommandItem>
            <CommandItem onSelect={() => go("/desk/brief")}>Edit the event brief</CommandItem>
            <CommandItem onSelect={() => go("/desk/outbox")}>Review drafts in the Outbox</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Companies">
            {(data?.companies || []).slice(0, 60).map((c: Any) => (
              <CommandItem key={c.id} value={`${c.name} ${c.domain}`} onSelect={() => { setOpen(false); openCompany(c.id); }}>
                <Building2 />{brandName(c)}<span className="ml-auto text-xs text-muted-foreground">{c.priority || ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pages">
            {PAGES.map(([t, u]) => <CommandItem key={u} onSelect={() => go(u)}>{t}</CommandItem>)}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
