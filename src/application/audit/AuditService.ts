import { AuditEvent, CreateAuditEventInput } from '../../domain/audit/AuditEvent';
import { AuditFilters, AuditKpis, AuditQueryRepository, AuditQueryResult } from '../../domain/audit/AuditQueryRepository';
import { AuditRepository } from '../../domain/audit/AuditRepository';
import { getHumanCategoryLabel, getHumanEventLabel, getHumanSeverityLabel } from './auditEventLabels';
import { sanitizeAndSerializeMetadata } from './metadataSanitizer';
import { RecordAuditEventInput } from './types';

export class AuditService {
  constructor(
    private readonly auditRepo: AuditRepository,
    private readonly auditQueryRepo: AuditQueryRepository,
  ) {}

  async recordEvent(input: RecordAuditEventInput): Promise<AuditEvent> {
    const payload: CreateAuditEventInput = {
      businessId: input.businessId,
      eventCategory: input.eventCategory,
      eventType: input.eventType,
      action: input.action,
      severity: input.severity || 'INFO',
      actorUserId: input.actorUserId || null,
      actorNameSnapshot: input.actorNameSnapshot || null,
      actorRoleSnapshot: input.actorRoleSnapshot || null,
      deviceId: input.deviceId || null,
      deviceNameSnapshot: input.deviceNameSnapshot || null,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel || null,
      summary: input.summary,
      metadataJson: sanitizeAndSerializeMetadata(input.metadata),
      occurredAt: input.occurredAt || new Date().toISOString(),
      correlationId: input.correlationId || null,
      ipOrSource: input.ipOrSource || null,
    };

    return this.auditRepo.append(payload);
  }

  async recordEvents(inputs: RecordAuditEventInput[]): Promise<AuditEvent[]> {
    if (inputs.length === 0) return [];
    const payloads: CreateAuditEventInput[] = inputs.map((input) => ({
      businessId: input.businessId,
      eventCategory: input.eventCategory,
      eventType: input.eventType,
      action: input.action,
      severity: input.severity || 'INFO',
      actorUserId: input.actorUserId || null,
      actorNameSnapshot: input.actorNameSnapshot || null,
      actorRoleSnapshot: input.actorRoleSnapshot || null,
      deviceId: input.deviceId || null,
      deviceNameSnapshot: input.deviceNameSnapshot || null,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel || null,
      summary: input.summary,
      metadataJson: sanitizeAndSerializeMetadata(input.metadata),
      occurredAt: input.occurredAt || new Date().toISOString(),
      correlationId: input.correlationId || null,
      ipOrSource: input.ipOrSource || null,
    }));

    return this.auditRepo.appendBatch(payloads);
  }

  async queryEvents(businessId: string, filters: AuditFilters): Promise<AuditQueryResult> {
    return this.auditQueryRepo.query(businessId, filters);
  }

  async getKpis(businessId: string): Promise<AuditKpis> {
    return this.auditQueryRepo.getKpis(businessId);
  }

  async getEventById(businessId: string, id: string): Promise<AuditEvent | null> {
    return this.auditQueryRepo.getById(businessId, id);
  }

  async getEventsByCorrelationId(businessId: string, correlationId: string): Promise<AuditEvent[]> {
    return this.auditQueryRepo.getByCorrelationId(businessId, correlationId);
  }

  async getExportData(businessId: string, filters: AuditFilters): Promise<{ headers: string[]; rows: string[][] }> {
    const unpaginatedFilters: AuditFilters = {
      ...filters,
      limit: 10000,
      offset: 0,
    };

    const { items } = await this.auditQueryRepo.query(businessId, unpaginatedFilters);

    const headers = [
      'Fecha y Hora',
      'Categoría',
      'Evento',
      'Severidad',
      'Usuario',
      'Dispositivo',
      'Elemento',
      'Resumen',
    ];

    const formatTimestamp = (iso: string) => {
      try {
        const d = new Date(iso);
        return d.toLocaleString('es-CL');
      } catch {
        return iso;
      }
    };

    const rows = items.map((event) => [
      formatTimestamp(event.occurredAt),
      getHumanCategoryLabel(event.eventCategory),
      getHumanEventLabel(event.eventType),
      getHumanSeverityLabel(event.severity),
      event.actorNameSnapshot || event.actorRoleSnapshot || 'Sistema',
      event.deviceNameSnapshot || 'Terminal principal',
      event.entityLabel || event.entityType,
      event.summary,
    ]);

    return { headers, rows };
  }

  async exportToCsv(businessId: string, filters: AuditFilters): Promise<string> {
    const { headers, rows } = await this.getExportData(businessId, filters);

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = rows.map((r) => r.map(escapeCsv).join(';'));
    return [headers.map(escapeCsv).join(';'), ...csvRows].join('\r\n');
  }
}
