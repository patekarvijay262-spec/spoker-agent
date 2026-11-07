"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import {
  Activity, Bot, Building2, CalendarClock, ClipboardPen, Handshake, Inbox, KanbanSquare, LayoutDashboard, LogOut, Megaphone, PenLine, Send, Settings, Users,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

import { useDesk } from "./desk-provider";
import { type Any, api, lakh, OP_AGENT } from "./format";

export function AppSidebar() {
  const path = usePathname();
  const { data, busy, progress, me } = useDesk();
  const e = data?.event;
  const msgs: Any[] = data?.messages || [];
  const drafts = msgs.filter((m) => m.status === "drafted" || m.status === "needs_manual_review").length;
  const decisions = (data?.exceptions || []).filter((x: Any) => x.status === "open").length;
  const review = (data?.contacts || []).filter((c: Any) => c.is_primary && !c.reviewed_at && ["UNVERIFIED", "UNAVAILABLE", "OUTDATED"].includes(c.email_status)).length;
  const live = busy ? OP_AGENT[busy.op] : progress ? "A1" : "";

  // The organiser's own order: the event, the companies, their draft, then sending. Any step can come first, so
  // nothing here nags; counts are plain numbers, never alarms.
  void review;
  const groups: { label?: string; items: { title: string; url: string; icon: Any; badge?: number; live?: boolean }[] }[] = [
    { items: [
      { title: "Home", url: "/desk", icon: LayoutDashboard },
    ] },
    { label: "Your sponsorship", items: [
      { title: "Event", url: "/desk/brief", icon: ClipboardPen },
      { title: "Companies", url: "/desk/companies", icon: Building2, live: !!live },
      { title: "Your draft", url: "/desk/draft", icon: PenLine },
      { title: "Send", url: "/desk/outbox", icon: Send, badge: drafts },
      { title: "Replies", url: "/desk/inbox", icon: Inbox, badge: decisions },
    ] },
    { label: "After a yes", items: [
      { title: "Meetings", url: "/desk/meetings", icon: CalendarClock },
      { title: "Deals and MOUs", url: "/desk/deals", icon: Handshake },
      { title: "Sponsor updates", url: "/desk/sponsors", icon: Megaphone },
    ] },
    { label: "More", items: [
      { title: "People", url: "/desk/people", icon: Users },
      { title: "Pipeline", url: "/desk/pipeline", icon: KanbanSquare },
      { title: "Agents", url: "/desk/agents", icon: Bot },
    ] },
  ];
  const isOn = (url: string) => (url === "/desk" ? path === "/desk" : path?.startsWith(url));
  const goal = Number(e?.goal_inr || 0);
  const won = (data?.deals || []).reduce((s: number, d: Any) => s + Number(d.cash_inr || 0), 0);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/desk" prefetch={false} />} tooltip="SponsorDesk">
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">S</div>
              <div className="min-w-0 leading-tight">
                <div className="truncate font-medium">SponsorDesk</div>
                {e && <div className="truncate text-xs text-sidebar-foreground/60">{e.name}</div>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g, gi) => (
          <SidebarGroup key={g.label || gi}>
            {g.label && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton isActive={isOn(it.url)} tooltip={it.title} render={<Link href={it.url} prefetch={false} />}>
                      <it.icon />
                      <span>{it.title}</span>
                      {it.live && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-foreground group-data-[collapsible=icon]:hidden" aria-label="An agent is working" />}
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
        {goal > 0 && (
          <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
            <div className="flex justify-between text-xs text-sidebar-foreground/60"><span>{lakh(won)} signed</span><span>of {lakh(goal)}</span></div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sidebar-border"><div className="h-full rounded-full bg-sidebar-foreground/70" style={{ width: `${Math.min(100, (won / goal) * 100)}%` }} /></div>
          </div>
        )}
        <SidebarMenu>
          {me?.owner && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={isOn("/desk/admin")} tooltip="Activity" render={<Link href="/desk/admin" prefetch={false} />}>
                <Activity /><span>Activity</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isOn("/desk/settings")} tooltip="Settings" render={<Link href="/desk/settings" prefetch={false} />}>
              <Settings /><span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Sign out" onClick={() => api("/api/logout", {}).finally(() => { window.location.href = "/login"; })}>
              <div className="grid size-8 shrink-0 place-items-center rounded-md border text-xs font-medium">{String(me?.name || "?").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm">{me?.name || "Signed in"}</div>
                <div className="truncate text-xs text-sidebar-foreground/60 capitalize">{me?.role || ""}</div>
              </div>
              <LogOut className="size-4 opacity-60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
