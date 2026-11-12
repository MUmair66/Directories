import "server-only";
import { z } from "zod";
import { getSession, hasRole, type Role, type SessionUser } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Standard result for every Server Action. Client forms show `message` as a toast
 * and map `fieldErrors` onto inputs.
 */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

type Bucket = Parameters<typeof rateLimit>[0];

type Options<S extends z.ZodType> = {
  schema: S;
  /** Require a signed-in user (default true). */
  auth?: boolean;
  roles?: Role[];
  rateLimit?: Bucket;
  /** Verify a Turnstile token sent as `turnstileToken` in the input. */
  turnstile?: boolean;
};

type Ctx<A extends boolean | undefined> = { user: A extends false ? SessionUser | null : SessionUser; ip: string };

export class ActionError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Flattens a Zod error into { field: firstMessage }. */
export function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Wraps a Server Action body with the standard flow:
 * Zod validation → session check → role check → rate limit (+ Turnstile) → handler (DB write + revalidateTag).
 * Ownership checks live inside handlers (they need the record).
 */
export function action<S extends z.ZodType, R = undefined, A extends boolean | undefined = undefined>(
  opts: Options<S> & { auth?: A },
  handler: (input: z.infer<S>, ctx: Ctx<A>) => Promise<ActionResult<R> | void>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
      }
      const session = await getSession();
      const user = session?.user ?? null;
      if (opts.auth !== false && !user) return { ok: false, message: "Please log in to continue." };
      if (opts.roles && !hasRole(user, ...opts.roles)) return { ok: false, message: "You don't have permission to do that." };
      if (user?.banned) return { ok: false, message: "Your account is suspended." };

      const ip = await clientIp();
      if (opts.turnstile) {
        const token = (raw as { turnstileToken?: string } | undefined)?.turnstileToken;
        if (!(await verifyTurnstile(token, ip))) return { ok: false, message: "Please complete the security check and try again." };
      }
      if (opts.rateLimit) {
        const { success } = await rateLimit(opts.rateLimit, user?.id ?? ip);
        if (!success) return { ok: false, message: "Too many requests. Please wait a moment and try again." };
      }
      const result = await handler(parsed.data, { user, ip } as Ctx<A>);
      return result ?? { ok: true };
    } catch (e) {
      if (e instanceof ActionError) return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
      // Let Next.js redirect()/notFound() propagate.
      if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_")) throw e;
      if (isUniqueViolation(e)) return { ok: false, message: "That value is already taken." };
      console.error("[action]", e);
      return { ok: false, message: "Something went wrong. Please try again." };
    }
  };
}

export function isUniqueViolation(e: unknown) {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}
