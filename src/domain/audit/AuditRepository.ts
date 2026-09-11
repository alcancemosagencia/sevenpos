import { AuditEvent, CreateAuditEventInput } from './AuditEvent';

export interface AuditRepository {
  append(event: CreateAuditEventInput): Promise<AuditEvent>;
  appendBatch(events: CreateAuditEventInput[]): Promise<AuditEvent[]>;
}
