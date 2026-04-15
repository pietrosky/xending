import { describe, it, expect } from 'vitest';
import {
  isKnownEngine,
  isImplementedEngine,
  getResultsTable,
  getValidEngineNames,
  validateRequest,
  makeBlockedOutput,
  buildResultRow,
  FASE1_ENGINES,
  FASE2_ENGINES,
  ALL_ENGINES,
} from './helpers';

describe('cs-engine-runner helpers', () => {
  describe('isKnownEngine', () => {
    it('returns true for Fase 1 engines', () => {
      expect(isKnownEngine('compliance')).toBe(true);
      expect(isKnownEngine('sat_facturacion')).toBe(true);
      expect(isKnownEngine('buro')).toBe(true);
      expect(isKnownEngine('documentation')).toBe(true);
      expect(isKnownEngine('financial')).toBe(true);
    });

    it('returns true for Fase 2+ engines', () => {
      expect(isKnownEngine('cashflow')).toBe(true);
      expect(isKnownEngine('network')).toBe(true);
      expect(isKnownEngine('graph_fraud')).toBe(true);
    });

    it('returns false for unknown engine', () => {
      expect(isKnownEngine('unknown_engine')).toBe(false);
      expect(isKnownEngine('')).toBe(false);
    });
  });

  describe('isImplementedEngine', () => {
    it('returns true for Fase 1 engines', () => {
      expect(isImplementedEngine('compliance')).toBe(true);
      expect(isImplementedEngine('financial')).toBe(true);
    });

    it('returns false for Fase 2+ engines', () => {
      expect(isImplementedEngine('cashflow')).toBe(false);
      expect(isImplementedEngine('graph_fraud')).toBe(false);
    });
  });

  describe('engine sets', () => {
    it('FASE1_ENGINES contains 5 engines', () => {
      expect(FASE1_ENGINES.size).toBe(5);
    });

    it('ALL_ENGINES is the union of FASE1 and FASE2', () => {
      expect(ALL_ENGINES.size).toBe(FASE1_ENGINES.size + FASE2_ENGINES.size);
      for (const e of FASE1_ENGINES) expect(ALL_ENGINES.has(e)).toBe(true);
      for (const e of FASE2_ENGINES) expect(ALL_ENGINES.has(e)).toBe(true);
    });
  });

  describe('getResultsTable', () => {
    it('returns correct table for compliance', () => {
      expect(getResultsTable('compliance')).toBe('cs_compliance_results');
    });

    it('returns correct table for sat_facturacion', () => {
      expect(getResultsTable('sat_facturacion')).toBe('cs_sat_results');
    });

    it('returns correct table for buro', () => {
      expect(getResultsTable('buro')).toBe('cs_buro_results');
    });

    it('returns correct table for financial', () => {
      expect(getResultsTable('financial')).toBe('cs_financial_results');
    });

    it('returns correct table for graph_fraud', () => {
      expect(getResultsTable('graph_fraud')).toBe('cs_graph_results');
    });

    it('returns null for unknown engine', () => {
      expect(getResultsTable('nonexistent')).toBeNull();
    });
  });

  describe('getValidEngineNames', () => {
    it('returns sorted array of all engine names', () => {
      const names = getValidEngineNames();
      expect(names.length).toBe(ALL_ENGINES.size);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  describe('validateRequest', () => {
    it('returns null for valid request', () => {
      expect(validateRequest({
        application_id: 'abc-123',
        engine_name: 'compliance',
      })).toBeNull();
    });

    it('rejects null body', () => {
      expect(validateRequest(null)).toBe('Invalid JSON body.');
    });

    it('rejects non-object body', () => {
      expect(validateRequest('string')).toBe('Invalid JSON body.');
    });

    it('rejects missing application_id', () => {
      expect(validateRequest({ engine_name: 'compliance' }))
        .toBe('Missing required field: application_id');
    });

    it('rejects missing engine_name', () => {
      expect(validateRequest({ application_id: 'abc-123' }))
        .toBe('Missing required field: engine_name');
    });

    it('rejects unknown engine_name', () => {
      const result = validateRequest({
        application_id: 'abc-123',
        engine_name: 'fake_engine',
      });
      expect(result).toContain('Unknown engine: fake_engine');
    });

    it('accepts Fase 2 engine names', () => {
      expect(validateRequest({
        application_id: 'abc-123',
        engine_name: 'cashflow',
      })).toBeNull();
    });
  });

  describe('makeBlockedOutput', () => {
    it('returns blocked EngineOutput with correct fields', () => {
      const output = makeBlockedOutput('compliance', 'test error', 150);
      expect(output.engine_name).toBe('compliance');
      expect(output.module_status).toBe('blocked');
      expect(output.module_score).toBe(0);
      expect(output.module_max_score).toBe(100);
      expect(output.module_grade).toBe('F');
      expect(output.risk_flags).toHaveLength(1);
      expect(output.risk_flags[0].code).toBe('engine_execution_error');
      expect(output.risk_flags[0].severity).toBe('critical');
      expect(output.explanation).toContain('150ms');
      expect(output.explanation).toContain('test error');
    });
  });

  describe('buildResultRow', () => {
    it('maps EngineOutput to a DB row with application_id', () => {
      const output = makeBlockedOutput('buro', 'err', 10);
      const row = buildResultRow('app-1', output);
      expect(row.application_id).toBe('app-1');
      expect(row.module_status).toBe('blocked');
      expect(row.module_score).toBe(0);
      expect(row.module_grade).toBe('F');
      expect(row.risk_flags).toEqual(output.risk_flags);
      expect(row.explanation).toBe(output.explanation);
    });
  });
});
