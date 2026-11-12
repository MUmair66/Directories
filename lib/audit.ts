import "server-only";
import { db, schema, type Tx } from "@/lib/db";

/** Records an admin/owner action. Pass `t` to write inside an open transaction. */
export async function audit(
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string | null; diff?: Record<string, unknown>; ip?: string },
  t?: Tx,
) {
  const values = { ...entry, entityId: entry.entityId ?? null };
  if (t) await t.insert(schema.auditLog).values(values);
  else await db.insert(schema.auditLog).values(values);
}

/** In-app notification (bell) for a user. */
export async function notify(
  entry: { userId: string; type: "review" | "lead" | "ticket" | "listing_status" | "claim"; title: string; body?: string; link?: string },
  t?: Tx,
) {
  if (t) await t.insert(schema.notifications).values(entry);
  else await db.insert(schema.notifications).values(entry);
}
