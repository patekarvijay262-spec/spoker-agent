"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import {
  Activity, BookOpen, Bot, Building2, CalendarClock, ClipboardPen, Handshake, Inbox, KanbanSquare, LayoutDashboard, LifeBuoy, LogOut, Megaphone, PenLine, Plug, Send, Settings, Users,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

import { useDesk } from "./desk-provider";
import { type Any, api, isDecision, OP_AGENT } from "./format";

export function AppSidebar() {
  const path = usePathname();
  const { data, busy, progress, me } = useDesk();
  const e = data?.event;
  const msgs: Any[] = data?.messages || [];
  const drafts = msgs.filter((m) => m.status === "drafted" || m.status === "needs_manual_review").length;
  const decisions = (data?.replies || []).length + (data?.exceptions || []).filter(isDecision).length;
  const review = (data?.contacts || []).filter((c: Any) => c.is_primary && !c.reviewed_at && ["UNVERIFIED", "UNAVAILABLE", "OUTDATED"].includes(c.email_status)).length;
  const live = busy ? OP_AGENT[busy.op] : progress ? "A1" : "";

  // The organiser's own order: the event, the companies, their draft, then sending. Any step can come first, so
  // nothing here nags; counts are plain numbers, never alarms.
  void review;
  const groups: { label?: string; items: { title: string; url: string; icon: Any; badge?: number; live?: boolean }[] }[] = [
    { items: [
      { title: "Home", url: "/desk", icon: LayoutDashboard },
    ] },
    { label: "1 · Plan", items: [
      { title: "Event", url: "/desk/brief", icon: ClipboardPen },
    ] },
    { label: "2 · Find", items: [
      { title: "Companies", url: "/desk/companies", icon: Building2, live: !!live },
      { title: "People", url: "/desk/people", icon: Users },
    ] },
    { label: "3 · Reach", items: [
      { title: "Your draft", url: "/desk/draft", icon: PenLine },
      { title: "Send", url: "/desk/outbox", icon: Send, badge: drafts },
      { title: "Replies", url: "/desk/inbox", icon: Inbox, badge: decisions },
    ] },
    { label: "4 · Close", items: [
      { title: "Meetings", url: "/desk/meetings", icon: CalendarClock },
      { title: "Deals and MOUs", url: "/desk/deals", icon: Handshake },
      { title: "Sponsor updates", url: "/desk/sponsors", icon: Megaphone },
    ] },
    { label: "More", items: [
      { title: "Max's work", url: "/desk/agents", icon: Bot },
      { title: "Pipeline", url: "/desk/pipeline", icon: KanbanSquare },
    ] },
  ];
  const isOn = (url: string) => (url === "/desk" ? path === "/desk" : path?.startsWith(url));

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/desk" />} tooltip="SponsorDesk">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">S</div>
              <div className="min-w-0 leading-tight">
                <div className="truncate font-semibold tracking-tight">SponsorDesk</div>
                {e && <div className="truncate text-xs text-sidebar-foreground/60">{e.name}</div>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g, gi) => (
          <SidebarGroup key={g.label || gi} className="py-0.5">
            {g.label && <SidebarGroupLabel className="h-6 text-[0.6875rem] font-semibold tracking-wider text-sidebar-foreground/45 uppercase">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton isActive={isOn(it.url)} tooltip={it.title} className="text-sidebar-foreground/75 hover:text-sidebar-foreground data-[active]:font-medium data-[active]:text-sidebar-foreground" render={<Link href={it.url} />}>
                      <it.icon />
                      <span>{it.title}</span>
                      {it.live && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-sidebar-foreground group-data-[collapsible=icon]:hidden" aria-label="An agent is working" />}
                    </SidebarMenuButton>
                    {!!it.badge && (
                      <SidebarMenuBadge className="num text-sidebar-foreground/60">{it.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {me?.owner && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={isOn("/desk/admin")} tooltip="Activity" render={<Link href="/desk/admin" />}>
                <Activity /><span>Activity</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isOn("/desk/connectors")} tooltip="Connectors" render={<Link href="/desk/connectors" />}>
              <Plug /><span>Connectors</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sponsorship guide" render={<Link href="/guide" target="_blank" />}>
              <BookOpen /><span>Sponsorship guide</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem data-tour="help">
            <SidebarMenuButton isActive={isOn("/desk/help")} tooltip="Help" render={<Link href="/desk/help" />}>
              <LifeBuoy /><span>Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isOn("/desk/settings")} tooltip="Settings" render={<Link href="/desk/settings" />}>
              <Settings /><span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {data?.me && <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Sign out" onClick={() => api("/api/logout", {}).finally(() => { window.location.href = "/login"; })}>
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent text-xs font-medium">{String(me?.name || "?").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm">{me?.name || "Signed in"}</div>
                <div className="truncate text-xs text-sidebar-foreground/60 capitalize">{me?.role || ""}</div>
              </div>
              <LogOut className="size-4 opacity-60" />
            </SidebarMenuButton>
          </SidebarMenuItem>}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
