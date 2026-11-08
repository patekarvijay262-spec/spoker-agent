"use client";

import type { ReactNode } from "react";

import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { AppSidebar } from "./app-sidebar";
import { Assistant } from "./assistant";
import { CompanySheet } from "./company-sheet";
import { DeskHeader } from "./desk-header";
import { DeskProvider, useDesk } from "./desk-provider";
import { api } from "./format";
import { Tour } from "./tour";
import { VoiceProvider } from "./voice-control";

function Main({ children }: { children: ReactNode }) {
  const { data } = useDesk();
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8" aria-busy="true" aria-label="Opening the desk">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  return (
    <>
      {data.me?.viewing && <ViewingBar name={data.me.viewing.name} />}
      <main className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-32 md:p-8 md:pb-12">{children}</main>
      {!data.me?.viewing && <Tour />}
    </>
  );
}

/** The owner is looking at someone else's desk: everything is read-only until they exit. */
function ViewingBar({ name }: { name: string }) {
  const exit = async () => { await api("/api/admin", { view: null }).catch(() => {}); window.location.href = "/desk/admin"; };
  return (
    <div className="flex items-center gap-3 border-b bg-muted px-4 py-2 text-sm md:px-8" role="status">
      <Eye className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">Viewing <span className="font-medium">{name}</span> · read-only</span>
      <Button size="sm" variant="outline" onClick={exit}>Exit</Button>
    </div>
  );
}

export function DeskShell({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) {
  return (
    <DeskProvider>
      <SidebarProvider defaultOpen={defaultOpen} style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
        <VoiceProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-x-clip">
            <DeskHeader />
            <Main>{children}</Main>
          </SidebarInset>
          <CompanySheet />
          <Assistant />
        </VoiceProvider>
      </SidebarProvider>
    </DeskProvider>
  );
}
