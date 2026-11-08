import type { ReactNode } from "react";

import { DeskShell } from "@/components/desk/desk-shell";

// No server work here: every desk page renders in the browser from one data call, so the pages are static and
// switching between them is instant. The sidebar remembers open or closed in the browser.
export default function DeskLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DeskShell>{children}</DeskShell>;
}
