export type AuditCategory =
  | 'AUTH'
  | 'DEVICE'
  | 'SALES'
  | 'CASH'
  | 'INVENTORY'
  | 'CATALOG'
  | 'PURCHASES'
  | 'EXPENSES'
  | 'CUSTOMERS'
  | 'SECURITY'
  | 'SYSTEM';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditEvent {
  id: string;
  businessId: string;
  eventCategory: AuditCategory;
  eventType: string;
  action: string;
  severity: AuditSeverity;
  actorUserId?: string | null;
  actorNameSnapshot?: string | null;
  actorRoleSnapshot?: string | null;
  deviceId?: string | null;
  deviceNameSnapshot?: string | null;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  summary: string;
  metadataJson?: string | null;
  occurredAt: string;
  createdAt: string;
  correlationId?: string | null;
  ipOrSource?: string | null;
}

export type CreateAuditEventInput = Omit<AuditEvent, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};
