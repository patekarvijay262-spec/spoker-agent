"use client";

import { Printer } from "lucide-react";

/** Saves the booklet as a PDF through the browser's print dialog. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium hover:bg-muted">
      <Printer className="size-4" />Save as PDF
    </button>
  );
}
