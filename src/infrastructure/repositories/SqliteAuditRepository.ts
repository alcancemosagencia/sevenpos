import { AuditCategory, AuditEvent, AuditSeverity, CreateAuditEventInput } from '../../domain/audit/AuditEvent';
import { AuditFilters, AuditKpis, AuditQueryRepository, AuditQueryResult } from '../../domain/audit/AuditQueryRepository';
import { AuditRepository } from '../../domain/audit/AuditRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';
import { InMemoryAuditRepository } from './InMemoryAuditRepository';

interface AuditRow {
  id: string;
  business_id: string;
  event_category: string;
  event_type: string;
  action: string;
  severity: string;
  actor_user_id: string | null;
  actor_name_snapshot: string | null;
  actor_role_snapshot: string | null;
  device_id: string | null;
  device_name_snapshot: string | null;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  summary: string;
  metadata_json: string | null;
  occurred_at: string;
  created_at: string;
  correlation_id: string | null;
  ip_or_source: string | null;
}

export class SqliteAuditRepository implements AuditRepository, AuditQueryRepository {
  private fallbackRepo = new InMemoryAuditRepository();

  constructor(
    private readonly dbManager: DatabaseManager,
    fallbackRepo?: InMemoryAuditRepository
  ) {
    if (fallbackRepo) {
      this.fallbackRepo = fallbackRepo;
    }
  }

  private mapRow(r: AuditRow): AuditEvent {
    return {
      id: r.id,
      businessId: r.business_id,
      eventCategory: r.event_category as AuditCategory,
      eventType: r.event_type,
      action: r.action,
      severity: r.severity as AuditSeverity,
      actorUserId: r.actor_user_id,
      actorNameSnapshot: r.actor_name_snapshot,
      actorRoleSnapshot: r.actor_role_snapshot,
      deviceId: r.device_id,
      deviceNameSnapshot: r.device_name_snapshot,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityLabel: r.entity_label,
      summary: r.summary,
      metadataJson: r.metadata_json,
      occurredAt: r.occurred_at,
      createdAt: r.created_at,
      correlationId: r.correlation_id,
      ipOrSource: r.ip_or_source,
    };
  }

  async append(eventInput: CreateAuditEventInput): Promise<AuditEvent> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.append(eventInput);
    }

    const event: AuditEvent = {
      ...eventInput,
      id: eventInput.id || crypto.randomUUID(),
      createdAt: eventInput.createdAt || new Date().toISOString(),
    };

    try {
      await db.execute(
        `INSERT INTO audit_events (
          id, business_id, event_category, event_type, action, severity,
          actor_user_id, actor_name_snapshot, actor_role_snapshot,
          device_id, device_name_snapshot, entity_type, entity_id, entity_label,
          summary, metadata_json, occurred_at, created_at, correlation_id, ip_or_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.businessId,
          event.eventCategory,
          event.eventType,
          event.action,
          event.severity,
          event.actorUserId ?? null,
          event.actorNameSnapshot ?? null,
          event.actorRoleSnapshot ?? null,
          event.deviceId ?? null,
          event.deviceNameSnapshot ?? null,
          event.entityType,
          event.entityId,
          event.entityLabel ?? null,
          event.summary,
          event.metadataJson ?? null,
          event.occurredAt,
          event.createdAt,
          event.correlationId ?? null,
          event.ipOrSource ?? null,
        ]
      );
      return event;
    } catch (err) {
      logger.error('SqliteAuditRepository', 'Failed to append audit event', { error: err, eventId: event.id });
      throw err;
    }
  }

  async appendBatch(eventsInput: CreateAuditEventInput[]): Promise<AuditEvent[]> {
    if (eventsInput.length === 0) return [];
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.appendBatch(eventsInput);
    }

    const results: AuditEvent[] = [];
    for (const input of eventsInput) {
      const appended = await this.append(input);
      results.push(appended);
    }
    return results;
  }

  async query(businessId: string, filters: AuditFilters): Promise<AuditQueryResult> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.query(businessId, filters);
    }

    try {
      const whereClauses: string[] = ['business_id = ?'];
      const params: unknown[] = [businessId];

      if (filters.categories && filters.categories.length > 0) {
        const placeholders = filters.categories.map(() => '?').join(', ');
        whereClauses.push(`event_category IN (${placeholders})`);
        params.push(...filters.categories);
      } else if (filters.category && filters.category !== 'ALL') {
        whereClauses.push('event_category = ?');
        params.push(filters.category);
      }

      if (filters.eventTypes && filters.eventTypes.length > 0) {
        const placeholders = filters.eventTypes.map(() => '?').join(', ');
        whereClauses.push(`event_type IN (${placeholders})`);
        params.push(...filters.eventTypes);
      } else if (filters.eventType) {
        whereClauses.push('event_type = ?');
        params.push(filters.eventType);
      }

      if (filters.severity && filters.severity !== 'ALL') {
        whereClauses.push('severity = ?');
        params.push(filters.severity);
      }

      if (filters.actorUserId) {
        whereClauses.push('actor_user_id = ?');
        params.push(filters.actorUserId);
      }

      if (filters.deviceId) {
        whereClauses.push('device_id = ?');
        params.push(filters.deviceId);
      }

      if (filters.entityType) {
        whereClauses.push('entity_type = ?');
        params.push(filters.entityType);
      }

      if (filters.entityId) {
        whereClauses.push('entity_id = ?');
        params.push(filters.entityId);
      }

      if (filters.correlationId) {
        whereClauses.push('correlation_id = ?');
        params.push(filters.correlationId);
      }

      if (filters.startDate) {
        whereClauses.push('occurred_at >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClauses.push('occurred_at <= ?');
        params.push(filters.endDate);
      }

      if (filters.searchTerm) {
        whereClauses.push(
          '(summary LIKE ? OR action LIKE ? OR event_type LIKE ? OR actor_name_snapshot LIKE ? OR entity_label LIKE ? OR entity_id LIKE ?)'
        );
        const term = `%${filters.searchTerm}%`;
        params.push(term, term, term, term, term, term);
      }

      const whereSql = whereClauses.join(' AND ');

      // Total count query
      const countRows = await db.select<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM audit_events WHERE ${whereSql}`,
        params
      );
      const totalCount = countRows[0]?.count || 0;

      // Paginated items query
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const itemsSql = `SELECT * FROM audit_events WHERE ${whereSql} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`;
      const itemParams = [...params, limit, offset];

      const rows = await db.select<AuditRow[]>(itemsSql, itemParams);
      const items = rows.map((r) => this.mapRow(r));

      return { items, totalCount };
    } catch (err) {
      logger.error('SqliteAuditRepository', 'Failed to query audit events', { error: err, businessId });
      throw err;
    }
  }

  async getKpis(businessId: string): Promise<AuditKpis> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getKpis(businessId);
    }

    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      interface KpiRow {
        total_events_24h: number;
        security_events_count: number;
        critical_events_count: number;
        failed_attempts_count: number;
      }

      const rows = await db.select<KpiRow[]>(
        `SELECT 
          COUNT(*) as total_events_24h,
          COUNT(CASE WHEN event_category IN ('AUTH', 'DEVICE') THEN 1 END) as security_events_count,
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_events_count,
          COUNT(CASE WHEN event_type = 'auth.pin.failed' THEN 1 END) as failed_attempts_count
        FROM audit_events
        WHERE business_id = ? AND occurred_at >= ?`,
        [businessId, twentyFourHoursAgo]
      );

      const r = rows[0];
      return {
        totalEvents24h: Number(r?.total_events_24h || 0),
        securityEventsCount: Number(r?.security_events_count || 0),
        criticalEventsCount: Number(r?.critical_events_count || 0),
        failedAttemptsCount: Number(r?.failed_attempts_count || 0),
      };
    } catch (err) {
      logger.error('SqliteAuditRepository', 'Failed to compute audit KPIs', { error: err, businessId });
      throw err;
    }
  }

  async getById(businessId: string, id: string): Promise<AuditEvent | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getById(businessId, id);
    }

    try {
      const rows = await db.select<AuditRow[]>(
        `SELECT * FROM audit_events WHERE business_id = ? AND id = ? LIMIT 1`,
        [businessId, id]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteAuditRepository', 'Failed to get audit event by ID', { error: err, businessId, id });
      throw err;
    }
  }

  async getByCorrelationId(businessId: string, correlationId: string): Promise<AuditEvent[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getByCorrelationId(businessId, correlationId);
    }

    try {
      const rows = await db.select<AuditRow[]>(
        `SELECT * FROM audit_events WHERE business_id = ? AND correlation_id = ? ORDER BY occurred_at ASC`,
        [businessId, correlationId]
      );
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteAuditRepository', 'Failed to get audit events by correlation ID', {
        error: err,
        businessId,
        correlationId,
      });
      throw err;
    }
  }
}
