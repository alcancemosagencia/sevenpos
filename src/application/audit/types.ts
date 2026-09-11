import { AuditCategory, AuditEvent, AuditSeverity } from '../../domain/audit/AuditEvent';
import { AuditFilters, AuditKpis, AuditQueryResult } from '../../domain/audit/AuditQueryRepository';

export interface RecordAuditEventInput {
  businessId: string;
  eventCategory: AuditCategory;
  eventType: string;
  action: string;
  severity?: AuditSeverity;
  actorUserId?: string | null;
  actorNameSnapshot?: string | null;
  actorRoleSnapshot?: string | null;
  deviceId?: string | null;
  deviceNameSnapshot?: string | null;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string;
  correlationId?: string | null;
  ipOrSource?: string | null;
}

export type { AuditCategory, AuditEvent, AuditSeverity, AuditFilters, AuditKpis, AuditQueryResult };
