/**
 * Built-in admin audit module helpers.
 *
 * @module
 *
 * @remarks
 * This entrypoint exposes the persistence helpers Curio ships for recording
 * and querying admin audit activity.
 */
// deno-coverage-ignore-start
import { getAuditRepo } from "@/admin/modules/repositories.ts";
import type {
  AdminAuditEventRecord,
  AdminDatabase,
} from "@/admin/modules/types.ts";
// deno-coverage-ignore-stop

/**
 * Records an admin audit event.
 *
 * @remarks
 * Audit events are append-only and are intended to capture auth, CRUD, and
 * custom admin flow activity.
 */
export const recordAdminAuditEvent = async (
  db: AdminDatabase,
  input: {
    actorUserId?: string | null;
    eventType: string;
    resource?: string | null;
    recordId?: string | null;
    summary: string;
    payload?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<AdminAuditEventRecord> => {
  return await getAuditRepo(db).create({
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    resource: input.resource ?? null,
    recordId: input.recordId ?? null,
    summary: input.summary,
    payload: input.payload ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
};

/**
 * Loads recent audit events for a specific resource record.
 *
 * @param db Admin database instance.
 * @param resource Resource key or label recorded on the audit event.
 * @param recordId Target record identifier.
 * @param limit Maximum number of rows to return. Defaults to `6`.
 */
export const loadRecentAuditEventsForRecord = async (
  db: AdminDatabase,
  resource: string,
  recordId: string,
  limit = 6,
): Promise<AdminAuditEventRecord[]> => {
  return await getAuditRepo(db).findMany({
    where: {
      resource,
      recordId,
    },
    orderBy: [{ createdAt: "desc" }],
    limit,
  });
};
