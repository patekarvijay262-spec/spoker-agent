"use client";

import type { ReactNode } from "react";

import { CheckCircle2, CircleAlert, CircleDashed, CircleHelp } from "lucide-react";

import { cn } from "cn";

import { type Any, STAGE_LABEL, VLABEL } from "./format";

/** Page title row. `eyebrow` is accepted for older call sites but no longer shown: the sidebar already says where you are. */
export function PageHeader({ title, description, children, tour }: { eyebrow?: string; title: string; description?: ReactNode; children?: ReactNode; tour?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3" data-tour={tour}>
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight text-balance">{title}</h1>
        {description && <p className="max-w-2xl text-[0.8125rem] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function PriorityBadge({ p, className }: { p?: string; className?: string }) {
  if (!p) return null;
  const tone = p === "P1" ? "bg-primary text-primary-foreground border-transparent" : p === "DQ" ? "border-destructive/30 text-destructive" : "text-muted-foreground";
  return <span className={cn("inline-flex h-5 items-center rounded-md border px-1.5 text-xs font-medium num", tone, className)}>{p}</span>;
}

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  const bad = ["DISQUALIFIED", "LOST", "OPTED_OUT", "BOUNCED", "NO_RESPONSE"].includes(stage);
  const won = ["PAID", "MOU_SIGNED", "INKIND_CONFIRMED", "NURTURE", "DELIVERED"].includes(stage);
  return (
    <span className={cn("inline-flex h-5 items-center rounded-md border px-1.5 text-xs", bad ? "border-destructive/30 text-destructive" : won ? "border-success/40 text-success" : "text-muted-foreground", className)}>
      {STAGE_LABEL[stage] || stage}
    </span>
  );
}

export function VerifyBadge({ s, className }: { s?: string; className?: string }) {
  if (!s) return null;
  const map: Record<string, [string, Any]> = {
    VERIFIED: ["text-success", CheckCircle2], CORROBORATED: ["text-info", CheckCircle2],
    UNVERIFIED: ["text-warning", CircleAlert], OUTDATED: ["text-warning", CircleAlert], UNAVAILABLE: ["text-muted-foreground", CircleDashed],
  };
  const [tone, Icon] = map[s] || ["text-muted-foreground", CircleHelp];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", tone, className)} title="Verified: Crustdata confirmed it is deliverable and it is on the company's own domain">
      <Icon className="size-3.5" />{VLABEL[s] || s}
    </span>
  );
}

/** Fit score (the lower of the two scores), as a plain number. */
export function FitRing({ value }: { value?: number | null; size?: number }) {
  return (
    <span className={cn("w-8 shrink-0 text-right text-sm num", value == null ? "text-muted-foreground" : value >= 70 ? "font-medium" : "text-muted-foreground")} title="Fit out of 100: the lower of our score and theirs">
      {value == null ? "–" : value}
    </span>
  );
}

export function ScoreBar({ label, value }: { label: string; value?: number | null; tone?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-12 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/80" style={{ width: `${value ?? 0}%` }} />
      </div>
      <span className="w-7 text-right font-medium num">{value ?? "–"}</span>
    </div>
  );
}

/** A KPI tile: label, big number, one quiet line underneath. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode; icon?: Any; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card px-3.5 py-3">
      <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 truncate text-2xl leading-none font-semibold tracking-tight num">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** A plain section card with an optional title row. */
export function Panel({ title, description, action, children, className }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3.5">
          <div className="min-w-0 space-y-0.5">
            {title && <h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-4 pt-3 pb-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children, action }: { icon?: Any; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Lightweight formatting for assistant answers: **bold**, bullet lines and numbered lines. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = String(text || "").split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-medium">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^(- |\d+\. )/.test(l.trim()) || !l.trim())) {
          const ordered = /^\d+\. /.test(lines[0].trim());
          const L = ordered ? "ol" : "ul";
          return <L key={i} className={cn("space-y-1 pl-4", ordered ? "list-decimal" : "list-disc")}>{lines.filter((l) => l.trim()).map((l, j) => <li key={j}>{inline(l.trim().replace(/^(- |\d+\. )/, ""))}</li>)}</L>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{l.startsWith("- ") ? <>• {inline(l.slice(2))}</> : inline(l)}</span>)}</p>;
      })}
    </div>
  );
}
