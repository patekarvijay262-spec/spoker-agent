import { requireUser, Role, runAs, User } from "./auth";

/** Route wrapper: auth (role), same-origin check for writes, JSON errors, and every query scoped to the user's workspace. */
export function wrap(fn: (req: Request, user: User) => Promise<any>, opts: { role?: Role } = {}) {
  return async (req: Request) => {
    const r = await requireUser(req, opts.role || "readonly");
    if (r.res) return r.res;
    try {
      const out = await runAs(r.user, () => fn(req, r.user));
      return out instanceof Response ? out : Response.json(out ?? { ok: true });
    } catch (e: any) {
      console.error(e);
      return Response.json({ error: e?.message || String(e) }, { status: 400 });
    }
  };
}
