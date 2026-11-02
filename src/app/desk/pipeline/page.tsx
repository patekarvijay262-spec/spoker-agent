"use client";


import { PageHeader, PriorityBadge, StageBadge } from "@/components/desk/bits";
import { useDesk } from "@/components/desk/desk-provider";
import { type Any, brandName, COLUMNS, money } from "@/components/desk/format";

export default function PipelinePage() {
  const { data, openCompany } = useDesk();
  const cos: Any[] = data.companies;
  return (
    <>
      <PageHeader title="Pipeline" description="Every deal, by stage." />
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((col) => {
            const items = cos.filter((c) => col.stages.includes(c.stage)).sort((a, b) => (b.intersection ?? -1) - (a.intersection ?? -1));
            return (
              <section key={col.title} className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50" aria-label={col.title}>
                <header className="flex items-center gap-2 px-4 pt-4 pb-3" title={col.hint}>
                  <h2 className="text-sm font-medium">{col.title}</h2>
                  <span className="text-sm text-muted-foreground num">{items.length}</span>
                </header>
                <div className="flex max-h-[calc(100dvh-16rem)] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 scrollbar-thin">
                  {items.map((c) => (
                    <button key={c.id} type="button" onClick={() => openCompany(c.id)} className="rounded-lg border bg-card p-3 text-left transition hover:border-foreground/20">
                      <div className="flex items-center gap-2.5">

                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{brandName(c)}</div><div className="truncate text-xs text-muted-foreground">{c.reasons?.about?.industry || c.domain}</div></div>
                        <PriorityBadge p={c.priority} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <StageBadge stage={c.stage} />
                        {c.price_range && <span className="ml-auto truncate">{money(c.price_range)}</span>}
                      </div>
                    </button>
                  ))}
                  {!items.length && <div className="p-4 text-center text-xs text-muted-foreground">Empty</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
