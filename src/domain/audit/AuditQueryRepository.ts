import { AuditCategory, AuditEvent, AuditSeverity } from './AuditEvent';

export interface AuditFilters {
  category?: AuditCategory | 'ALL';
  categories?: AuditCategory[];
  eventType?: string;
  eventTypes?: string[];
  severity?: AuditSeverity | 'ALL';
  actorUserId?: string;
  deviceId?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  items: AuditEvent[];
  totalCount: number;
}

export interface AuditKpis {
  totalEvents24h: number;
  securityEventsCount: number;
  criticalEventsCount: number;
  failedAttemptsCount: number;
}

export interface AuditQueryRepository {
  query(businessId: string, filters: AuditFilters): Promise<AuditQueryResult>;
  getKpis(businessId: string): Promise<AuditKpis>;
  getById(businessId: string, id: string): Promise<AuditEvent | null>;
  getByCorrelationId(businessId: string, correlationId: string): Promise<AuditEvent[]>;
}
