"use client";

import { PageHeader } from "@/components/desk/bits";
import { ConnectorsPanel } from "@/components/desk/connectors-panel";

export default function ConnectorsPage() {
  return (
    <>
      <PageHeader tour="connectors" title="Connectors" description="Plug in the services and tools your team uses. Keys are stored encrypted for this desk only." />
      <ConnectorsPanel />
    </>
  );
}
