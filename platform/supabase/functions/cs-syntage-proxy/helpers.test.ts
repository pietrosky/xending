import { describe, it, expect } from 'vitest';
import {
  backoffDelay,
  isValidRfc,
  resolveEndpointPath,
  getValidEndpoints,
  buildCacheKey,
  buildApiUrl,
  validateRequest,
} from './helpers';

describe('cs-syntage-proxy helpers', () => {
  describe('backoffDelay', () => {
    it('returns 1000ms for attempt 0', () => {
      expect(backoffDelay(0)).toBe(1000);
    });

    it('returns 2000ms for attempt 1', () => {
      expect(backoffDelay(1)).toBe(2000);
    });

    it('returns 4000ms for attempt 2', () => {
      expect(backoffDelay(2)).toBe(4000);
    });
  });

  describe('isValidRfc', () => {
    it('accepts valid 13-char persona fisica RFC', () => {
      expect(isValidRfc('GARC850101AB1')).toBe(true);
    });

    it('accepts valid 12-char persona moral RFC', () => {
      expect(isValidRfc('ABC850101AB1')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidRfc('')).toBe(false);
    });

    it('rejects too short RFC', () => {
      expect(isValidRfc('ABC')).toBe(false);
    });
  });

  describe('resolveEndpointPath', () => {
    it('resolves getCFDIs to sat/cfdis', () => {
      expect(resolveEndpointPath('getCFDIs')).toBe('sat/cfdis');
    });

    it('resolves getScorePyME to buro/score-pyme', () => {
      expect(resolveEndpointPath('getScorePyME')).toBe('buro/score-pyme');
    });

    it('resolves getSyntageScore to indicadores/score', () => {
      expect(resolveEndpointPath('getSyntageScore')).toBe('indicadores/score');
    });

    it('resolves getEstructuraCorporativa to registro-publico/estructura-corporativa', () => {
      expect(resolveEndpointPath('getEstructuraCorporativa')).toBe('registro-publico/estructura-corporativa');
    });

    it('returns null for unknown endpoint', () => {
      expect(resolveEndpointPath('unknownEndpoint')).toBeNull();
    });
  });

  describe('getValidEndpoints', () => {
    it('returns all 19 endpoints', () => {
      const endpoints = getValidEndpoints();
      expect(endpoints.length).toBe(19);
      expect(endpoints).toContain('getCFDIs');
      expect(endpoints).toContain('getHawkChecks');
      expect(endpoints).toContain('getIncidenciasLegales');
    });
  });

  describe('buildCacheKey', () => {
    it('returns endpoint name when no params', () => {
      expect(buildCacheKey('getCFDIs')).toBe('getCFDIs');
    });

    it('returns endpoint name when params is empty object', () => {
      expect(buildCacheKey('getCFDIs', {})).toBe('getCFDIs');
    });

    it('appends serialized params when present', () => {
      const key = buildCacheKey('getCFDIs', { type: 'emitidas' });
      expect(key).toBe('getCFDIs:{"type":"emitidas"}');
    });
  });

  describe('buildApiUrl', () => {
    it('builds URL with rfc param', () => {
      const url = buildApiUrl('https://api.syntage.com', 'sat/cfdis', 'ABC850101AB1');
      expect(url).toBe('https://api.syntage.com/v1/sat/cfdis?rfc=ABC850101AB1');
    });

    it('includes extra params', () => {
      const url = buildApiUrl('https://api.syntage.com', 'sat/cfdis', 'ABC850101AB1', { type: 'emitidas' });
      expect(url).toContain('rfc=ABC850101AB1');
      expect(url).toContain('type=emitidas');
    });
  });

  describe('validateRequest', () => {
    it('returns null for valid request', () => {
      expect(validateRequest({ rfc: 'ABC850101AB1', endpoint: 'getCFDIs' })).toBeNull();
    });

    it('rejects null body', () => {
      expect(validateRequest(null)).toBe('Invalid JSON body.');
    });

    it('rejects missing rfc', () => {
      expect(validateRequest({ endpoint: 'getCFDIs' })).toBe('Missing required field: rfc');
    });

    it('rejects invalid rfc format', () => {
      const result = validateRequest({ rfc: 'bad', endpoint: 'getCFDIs' });
      expect(result).toContain('Invalid RFC format');
    });

    it('rejects missing endpoint', () => {
      const result = validateRequest({ rfc: 'ABC850101AB1' });
      expect(result).toBe('Missing required field: endpoint');
    });

    it('rejects unknown endpoint', () => {
      const result = validateRequest({ rfc: 'ABC850101AB1', endpoint: 'fakeEndpoint' });
      expect(result).toContain('Unknown endpoint');
    });
  });
});
