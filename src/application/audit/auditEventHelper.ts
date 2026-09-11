import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import { logger } from '../../infrastructure/logging/Logger';
import { sanitizeAndSerializeMetadata } from './metadataSanitizer';
import { RecordAuditEventInput } from './types';

export async function logAuditEventSafely(input: RecordAuditEventInput): Promise<void> {
  try {
    const auditService = repositoryFactory.getAuditService();
    await auditService.recordEvent(input);
  } catch (err) {
    logger.warn('logAuditEventSafely', 'Failed to safely record audit event', {
      eventType: input.eventType,
      error: String(err),
    });
  }
}

export async function insertAuditRowInTransaction(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  event: RecordAuditEventInput
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const metadataJson = sanitizeAndSerializeMetadata(event.metadata);

  await db.execute(
    `INSERT INTO audit_events (
      id, business_id, event_category, event_type, action, severity,
      actor_user_id, actor_name_snapshot, actor_role_snapshot,
      device_id, device_name_snapshot, entity_type, entity_id, entity_label,
      summary, metadata_json, occurred_at, created_at, correlation_id, ip_or_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.businessId,
      event.eventCategory,
      event.eventType,
      event.action,
      event.severity || 'INFO',
      event.actorUserId ?? null,
      event.actorNameSnapshot ?? null,
      event.actorRoleSnapshot ?? null,
      event.deviceId ?? null,
      event.deviceNameSnapshot ?? null,
      event.entityType,
      event.entityId,
      event.entityLabel ?? null,
      event.summary,
      metadataJson,
      event.occurredAt || now,
      now,
      event.correlationId ?? null,
      event.ipOrSource ?? null,
    ]
  );
}
