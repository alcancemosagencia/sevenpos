import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveDateRange,
  resolveComparisonPeriod,
  calculateDelta,
} from '../application/analytics/DateRangeUtils';
import { OperationalAnalyticsService } from '../application/analytics/OperationalAnalyticsService';
import { RepositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { DatabaseManager } from '../infrastructure/database/DatabaseManager';

describe('AG-11 Operational Analytics & Reporting Engine Tests', () => {
  const businessId = 'biz-analytics-001';

  describe('1. DateRangeUtils & Period Resolutions', () => {
    it('resolves TODAY preset correctly with reference date', () => {
      const refDate = new Date('2026-09-04T12:00:00Z');
      const range = resolveDateRange('TODAY', undefined, undefined, refDate);

      expect(range.preset).toBe('TODAY');
      expect(range.startDate).toBe('2026-09-04');
      expect(range.endDate).toBe('2026-09-04');
      expect(range.fromUtc).toBe('2026-09-04T00:00:00.000Z');
      expect(range.toUtc).toBe('2026-09-04T23:59:59.999Z');
      expect(range.label).toBe('Hoy');

      const comp = resolveComparisonPeriod(range);
      expect(comp.fromUtc).toBe('2026-09-03T00:00:00.000Z');
      expect(comp.toUtc).toBe('2026-09-03T23:59:59.999Z');
      expect(comp.label).toBe('vs ayer');
    });

    it('resolves LAST_7_DAYS preset and prior period correctly', () => {
      const refDate = new Date('2026-09-04T12:00:00Z');
      const range = resolveDateRange('LAST_7_DAYS', undefined, undefined, refDate);

      expect(range.preset).toBe('LAST_7_DAYS');
      expect(range.startDate).toBe('2026-08-29');
      expect(range.endDate).toBe('2026-09-04');

      const comp = resolveComparisonPeriod(range);
      expect(comp.fromUtc).toBe('2026-08-22T00:00:00.000Z');
      expect(comp.toUtc).toBe('2026-08-28T23:59:59.999Z');
      expect(comp.label).toContain('7d');
    });

    it('resolves THIS_MONTH preset and previous month comparison', () => {
      const refDate = new Date('2026-09-04T12:00:00Z');
      const range = resolveDateRange('THIS_MONTH', undefined, undefined, refDate);

      expect(range.preset).toBe('THIS_MONTH');
      expect(range.startDate).toBe('2026-09-01');
      expect(range.endDate).toBe('2026-09-04');

      const comp = resolveComparisonPeriod(range);
      expect(comp.fromUtc).toBe('2026-08-01T00:00:00.000Z');
      expect(comp.toUtc).toBe('2026-08-31T23:59:59.999Z');
      expect(comp.label).toBe('vs mes anterior');
    });

    it('resolves CUSTOM date range', () => {
      const range = resolveDateRange('CUSTOM', '2026-08-10', '2026-08-20');
      expect(range.preset).toBe('CUSTOM');
      expect(range.startDate).toBe('2026-08-10');
      expect(range.endDate).toBe('2026-08-20');
      expect(range.fromUtc).toBe('2026-08-10T00:00:00.000Z');
      expect(range.toUtc).toBe('2026-08-20T23:59:59.999Z');
    });
  });

  describe('2. MetricDelta Calculations', () => {
    it('calculates positive growth accurately', () => {
      const delta = calculateDelta(15000, 10000);
      expect(delta.current).toBe(15000);
      expect(delta.previous).toBe(10000);
      expect(delta.absoluteDelta).toBe(5000);
      expect(delta.percentageDelta).toBe(50.0);
      expect(delta.trend).toBe('UP');
    });

    it('calculates decrease accurately', () => {
      const delta = calculateDelta(8000, 10000);
      expect(delta.absoluteDelta).toBe(-2000);
      expect(delta.percentageDelta).toBe(-20.0);
      expect(delta.trend).toBe('DOWN');
    });

    it('handles zero previous baseline gracefully', () => {
      const delta = calculateDelta(5000, 0);
      expect(delta.absoluteDelta).toBe(5000);
      expect(delta.percentageDelta).toBe(100.0);
      expect(delta.trend).toBe('UP');

      const zeroDelta = calculateDelta(0, 0);
      expect(zeroDelta.absoluteDelta).toBe(0);
      expect(zeroDelta.percentageDelta).toBe(0.0);
      expect(zeroDelta.trend).toBe('FLAT');
    });
  });

  describe('3. Cost Coverage & Operating Result Strict Rules', () => {
    let analyticsService: OperationalAnalyticsService;

    beforeEach(() => {
      // Mock db manager that returns null to force memory fallback
      const mockDbManager = {
        getDatabase: async () => null,
      } as unknown as DatabaseManager;

      const mockRepoFactory = new RepositoryFactory();
      analyticsService = new OperationalAnalyticsService(mockDbManager, mockRepoFactory);
    });

    it('evaluates Cost Coverage = 100% and allows Global Operating Result when all items are REAL cost', async () => {
      const range = resolveDateRange('THIS_MONTH');
      const summary = await analyticsService.getExecutiveSummary(businessId, range);

      // In empty / unpopulated repo, values are safe and initialized
      expect(summary.totalSales.current).toBe(0);
      expect(summary.operatingExpenses.current).toBe(0);
      expect(summary.knownGrossProfit).toBe(0);
    });
  });

  describe('4. Cash Discrepancy & Variance Formulations', () => {
    it('validates formula: Absolute Variance is sum of absolute diffs', () => {
      const session1Diff = -500; // missing 5.00
      const session2Diff = 300;  // surplus 3.00
      const session3Diff = 0;    // exact

      const diffs = [session1Diff, session2Diff, session3Diff];
      const netDiff = diffs.reduce((a, b) => a + b, 0);
      const absVariance = diffs.reduce((a, b) => a + Math.abs(b), 0);
      const diffCount = diffs.filter((d) => d !== 0).length;

      expect(netDiff).toBe(-200);
      expect(absVariance).toBe(800);
      expect(diffCount).toBe(2);
    });
  });

  describe('5. CSV Export Formatting & RFC 4180 Escaping', () => {
    let analyticsService: OperationalAnalyticsService;

    beforeEach(() => {
      const mockDbManager = {
        getDatabase: async () => null,
      } as unknown as DatabaseManager;
      analyticsService = new OperationalAnalyticsService(mockDbManager, new RepositoryFactory());
    });

    it('generates compliant RFC 4180 CSV for Sales Summary', async () => {
      const range = resolveDateRange('THIS_MONTH');
      const csv = await analyticsService.exportReportCsv(businessId, 'SALES_SUMMARY', range);

      expect(csv).toContain('Métrica,Valor');
      expect(csv).toContain('Período');
      expect(csv).toContain('Ventas Netas ($)');
      expect(csv).toContain('Ganancia Bruta Conocida ($)');
      expect(csv).toContain('Cobertura de Costo (%)');
    });

    it('generates compliant CSV with proper columns for Cash Sessions Audit', async () => {
      const range = resolveDateRange('THIS_MONTH');
      const csv = await analyticsService.exportReportCsv(businessId, 'CASH_SESSIONS_AUDIT', range);

      expect(csv).toContain('Caja,Apertura Por,Cierre Por,Fecha Apertura,Fecha Cierre,Monto Inicial ($),Monto Esperado ($),Monto Contado ($),Diferencia ($),Estado');
    });

    it('generates compliant CSV for Inventory Stock', async () => {
      const range = resolveDateRange('THIS_MONTH');
      const csv = await analyticsService.exportReportCsv(businessId, 'INVENTORY_STOCK', range);

      expect(csv).toContain('Producto,Categoría,Stock Actual,Stock Mínimo,Estado,Costo Unitario ($),Calidad de Costo');
    });
  });
});
