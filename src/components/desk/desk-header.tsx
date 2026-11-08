"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Building2, Loader2, MessageCircle, Mic, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useDesk } from "./desk-provider";
import { type Any, AGENTS, brandName, OP_AGENT } from "./format";
import { LayoutControls } from "./layout-controls";
import { SearchDialog } from "./search";
import { ThemeSwitcher } from "./theme-switcher";
import { useVoiceControl, VOICE_EXAMPLES, VoiceButton } from "./voice-control";

const PAGES = [
  ["Home", "/desk"], ["Event", "/desk/brief"], ["Your draft", "/desk/draft"], ["Companies", "/desk/companies"], ["Pipeline", "/desk/pipeline"], ["Agents", "/desk/agents"],
  ["Send", "/desk/outbox"], ["Replies", "/desk/inbox"], ["People", "/desk/people"], ["Meetings", "/desk/meetings"], ["Deals and MOUs", "/desk/deals"],
  ["Sponsor updates", "/desk/sponsors"], ["Settings", "/desk/settings"], ["Help", "/desk/help"], ["Connectors", "/desk/connectors"],
];
const TITLES: Record<string, string> = { ...Object.fromEntries(PAGES.map(([t, u]) => [u, t])), "/desk/admin": "Activity" };

export function DeskHeader() {
  const path = usePathname() || "/desk";
  const router = useRouter();
  const { data, busy, progress, openCompany, ask, setChatOpen } = useDesk();
  const voice = useVoiceControl();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = /^(input|textarea|select)$/i.test(el?.tagName || "") || !!el?.isContentEditable;
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) { e.preventDefault(); setOpen((o) => !o); }
    };
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
        {/* Search sits top left as one icon (Ctrl+K or / also open it). */}
        <button type="button" onClick={() => setOpen(true)} aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <Search className="size-4" />
        </button>
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
        <div className="hidden text-sm font-medium lg:block">{title}</div>
        <div className="ml-auto flex items-center gap-1">
          {(busy || progress) && (
            <div className="mr-2 hidden items-center gap-2 text-xs text-muted-foreground md:flex" role="status" aria-live="polite" title={label}>
              <Loader2 className="size-3.5 animate-spin" />
              <span className="max-w-56 truncate">{agent ? `${agent.name}: ` : ""}{label}</span>
              {progress && <span className="num">{progress.done + 1}/{progress.total}</span>}
            </div>
          )}
          <VoiceButton className="hidden md:inline-flex" />
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" data-tour="ask" onClick={() => setChatOpen(true)}>
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
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
