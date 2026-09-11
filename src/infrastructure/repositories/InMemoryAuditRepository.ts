import { AuditEvent, CreateAuditEventInput } from '../../domain/audit/AuditEvent';
import { AuditFilters, AuditKpis, AuditQueryRepository, AuditQueryResult } from '../../domain/audit/AuditQueryRepository';
import { AuditRepository } from '../../domain/audit/AuditRepository';

const STORAGE_KEY_AUDIT = 'sevenpos-dev-audit-events';

export class InMemoryAuditRepository implements AuditRepository, AuditQueryRepository {
  private events: AuditEvent[] = [];

  constructor() {
    this.loadFromStorage();
    if (this.events.length === 0) {
      this.seedInitialDevEvents();
    }
  }

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_AUDIT);
        if (raw) {
          this.events = JSON.parse(raw);
        }
      } catch {
        // Fallback
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.events));
      } catch {
        // Fallback
      }
    }
  }

  private seedInitialDevEvents() {
    const now = new Date();
    const iso = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();

    const sampleBizIds = ['primary-business', 'cb16c3b9-497c-43c8-88c1-7c2c2887e341', '76.123.456-7', 'biz-dev-001'];

    for (const bizId of sampleBizIds) {
      this.events.push(
        {
          id: `audit-dev-01-${bizId}`,
          businessId: bizId,
          eventCategory: 'AUTH',
          eventType: 'auth.login.success',
          action: 'PIN_LOGIN',
          severity: 'INFO',
          actorUserId: 'usr-local-owner',
          actorNameSnapshot: 'Omar Agencia',
          actorRoleSnapshot: 'Dueño',
          deviceId: 'dev-win-01',
          deviceNameSnapshot: 'Caja Principal (PC)',
          entityType: 'SESSION',
          entityId: 'usr-local-owner',
          entityLabel: 'Sesión Principal',
          summary: 'Desbloqueo de terminal exitoso: Omar Agencia',
          metadataJson: JSON.stringify({ method: 'PIN', platform: 'Windows Desktop' }),
          occurredAt: iso(10),
          createdAt: iso(10),
          correlationId: 'sess-001',
        },
        {
          id: `audit-dev-02-${bizId}`,
          businessId: bizId,
          eventCategory: 'SALES',
          eventType: 'sale.completed',
          action: 'SALE_COMPLETED',
          severity: 'INFO',
          actorUserId: 'usr-local-owner',
          actorNameSnapshot: 'Omar Agencia',
          actorRoleSnapshot: 'Dueño',
          deviceId: 'dev-win-01',
          deviceNameSnapshot: 'Caja Principal (PC)',
          entityType: 'SALE',
          entityId: 'vta-0001',
          entityLabel: 'Boleta VTA-000001',
          summary: 'Venta VTA-000001 completada por CLP $18.500',
          metadataJson: JSON.stringify({
            saleNumber: 'VTA-000001',
            total: 18500,
            subtotal: 18500,
            discountTotal: 0,
            taxTotal: 2954,
            currencyCode: 'CLP',
            customerNameSnapshot: 'Consumidor final',
            itemCount: 2,
          }),
          occurredAt: iso(25),
          createdAt: iso(25),
          correlationId: 'tx-001',
        },
        {
          id: `audit-dev-03-${bizId}`,
          businessId: bizId,
          eventCategory: 'CASH',
          eventType: 'cash.shift.opened',
          action: 'CASH_SHIFT_OPENED',
          severity: 'INFO',
          actorUserId: 'usr-local-owner',
          actorNameSnapshot: 'Omar Agencia',
          actorRoleSnapshot: 'Dueño',
          deviceId: 'dev-win-01',
          deviceNameSnapshot: 'Caja Principal (PC)',
          entityType: 'CASH_SESSION',
          entityId: 'cs-001',
          entityLabel: 'Turno Mañana',
          summary: 'Apertura de turno de caja con fondo inicial CLP $50.000',
          metadataJson: JSON.stringify({ initialCash: 50000, currencyCode: 'CLP' }),
          occurredAt: iso(60),
          createdAt: iso(60),
          correlationId: 'shift-001',
        },
        {
          id: `audit-dev-04-${bizId}`,
          businessId: bizId,
          eventCategory: 'INVENTORY',
          eventType: 'inventory.adjustment.created',
          action: 'INVENTORY_ADJUSTMENT',
          severity: 'INFO',
          actorUserId: 'usr-local-owner',
          actorNameSnapshot: 'Omar Agencia',
          actorRoleSnapshot: 'Dueño',
          deviceId: 'dev-win-01',
          deviceNameSnapshot: 'Caja Principal (PC)',
          entityType: 'INVENTORY_MOVEMENT',
          entityId: 'adj-001',
          entityLabel: 'Ajuste Stock Físico',
          summary: 'Ajuste de inventario en Bebida Coca Cola 1.5L: +12 unidades',
          metadataJson: JSON.stringify({
            productName: 'Bebida Coca Cola 1.5L',
            quantityDelta: 12,
            reason: 'Conteo mensual de existencias',
          }),
          occurredAt: iso(120),
          createdAt: iso(120),
        },
        {
          id: `audit-dev-05-${bizId}`,
          businessId: bizId,
          eventCategory: 'AUTH',
          eventType: 'auth.pin.failed',
          action: 'PIN_AUTH_FAILED',
          severity: 'WARNING',
          actorUserId: null,
          actorNameSnapshot: 'Desconocido',
          actorRoleSnapshot: null,
          deviceId: 'dev-win-01',
          deviceNameSnapshot: 'Caja Principal (PC)',
          entityType: 'AUTH',
          entityId: 'dev-win-01',
          entityLabel: 'Terminal PIN',
          summary: 'Intento de PIN fallido (intento 1 de 3)',
          metadataJson: JSON.stringify({ attemptCount: 1, maxAttempts: 3 }),
          occurredAt: iso(180),
          createdAt: iso(180),
        }
      );
    }
    this.saveToStorage();
  }

  async append(eventInput: CreateAuditEventInput): Promise<AuditEvent> {
    this.loadFromStorage();
    const event: AuditEvent = {
      ...eventInput,
      id: eventInput.id || `audit-inmem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: eventInput.createdAt || new Date().toISOString(),
    };
    this.events.unshift(event);
    this.saveToStorage();
    return event;
  }

  async appendBatch(eventsInput: CreateAuditEventInput[]): Promise<AuditEvent[]> {
    if (eventsInput.length === 0) return [];
    this.loadFromStorage();
    const createdList: AuditEvent[] = eventsInput.map((input) => ({
      ...input,
      id: input.id || `audit-inmem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: input.createdAt || new Date().toISOString(),
    }));
    this.events.unshift(...createdList);
    this.saveToStorage();
    return createdList;
  }

  async query(businessId: string, filters: AuditFilters): Promise<AuditQueryResult> {
    this.loadFromStorage();
    let list = this.events.filter((e) => e.businessId === businessId);

    if (filters.categories && filters.categories.length > 0) {
      list = list.filter((e) => filters.categories!.includes(e.eventCategory));
    } else if (filters.category && filters.category !== 'ALL') {
      list = list.filter((e) => e.eventCategory === filters.category);
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      list = list.filter((e) => filters.eventTypes!.includes(e.eventType));
    } else if (filters.eventType) {
      list = list.filter((e) => e.eventType === filters.eventType);
    }

    if (filters.severity && filters.severity !== 'ALL') {
      list = list.filter((e) => e.severity === filters.severity);
    }

    if (filters.actorUserId) {
      list = list.filter((e) => e.actorUserId === filters.actorUserId);
    }

    if (filters.deviceId) {
      list = list.filter((e) => e.deviceId === filters.deviceId);
    }

    if (filters.entityType) {
      list = list.filter((e) => e.entityType === filters.entityType);
    }

    if (filters.entityId) {
      list = list.filter((e) => e.entityId === filters.entityId);
    }

    if (filters.correlationId) {
      list = list.filter((e) => e.correlationId === filters.correlationId);
    }

    if (filters.startDate) {
      list = list.filter((e) => e.occurredAt >= filters.startDate!);
    }

    if (filters.endDate) {
      list = list.filter((e) => e.occurredAt <= filters.endDate!);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.summary.toLowerCase().includes(term) ||
          e.action.toLowerCase().includes(term) ||
          e.eventType.toLowerCase().includes(term) ||
          (e.actorNameSnapshot && e.actorNameSnapshot.toLowerCase().includes(term)) ||
          (e.entityLabel && e.entityLabel.toLowerCase().includes(term)) ||
          e.entityId.toLowerCase().includes(term)
      );
    }

    // Sort by occurredAt DESC
    list.sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : 1));

    const totalCount = list.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const items = list.slice(offset, offset + limit);

    return { items, totalCount };
  }

  async getKpis(businessId: string): Promise<AuditKpis> {
    this.loadFromStorage();
    const list = this.events.filter((e) => e.businessId === businessId);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const recentEvents = list.filter((e) => e.occurredAt >= twentyFourHoursAgo);

    const securityEventsCount = recentEvents.filter(
      (e) => e.eventCategory === 'AUTH' || e.eventCategory === 'DEVICE'
    ).length;

    const criticalEventsCount = recentEvents.filter((e) => e.severity === 'CRITICAL').length;

    const failedAttemptsCount = recentEvents.filter(
      (e) => e.eventType === 'auth.pin.failed'
    ).length;

    return {
      totalEvents24h: recentEvents.length,
      securityEventsCount,
      criticalEventsCount,
      failedAttemptsCount,
    };
  }

  async getById(businessId: string, id: string): Promise<AuditEvent | null> {
    this.loadFromStorage();
    const found = this.events.find((e) => e.businessId === businessId && e.id === id);
    return found || null;
  }

  async getByCorrelationId(businessId: string, correlationId: string): Promise<AuditEvent[]> {
    this.loadFromStorage();
    return this.events
      .filter((e) => e.businessId === businessId && e.correlationId === correlationId)
      .sort((a, b) => (a.occurredAt > b.occurredAt ? 1 : -1));
  }
}
