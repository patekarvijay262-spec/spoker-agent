// A deck shared as a link (/f/<id>): the id is long and random, so only people who got the email can open it.
import { inWorkspace, publicLinkWorkspace } from "@/lib/db";
import { fileMeta, readFile } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) return new Response("Not found", { status: 404 });
  return inWorkspace(await publicLinkWorkspace(id), async () => {
    const f = await fileMeta(id);
    if (!f) return new Response("This deck is no longer shared.", { status: 404 });
    const data = await readFile(id);
    return new Response(new Uint8Array(data), { headers: {
      "content-type": f.mime, "content-length": String(data.length), "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="${String(f.name).replace(/[^\w .()-]/g, "_")}"`, "x-content-type-options": "nosniff",
    } });
  });
}
