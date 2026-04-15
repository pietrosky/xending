import { describe, it, expect } from 'vitest';
import { backoffDelay, isValidRfc, makeFallbackResult } from './helpers';

describe('cs-scory-proxy helpers', () => {
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

    it('accepts RFC with ampersand', () => {
      expect(isValidRfc('A&C850101AB1')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidRfc('')).toBe(false);
    });

    it('rejects too short RFC', () => {
      expect(isValidRfc('ABC')).toBe(false);
    });

    it('rejects RFC with invalid characters', () => {
      expect(isValidRfc('ABC-850101-AB1')).toBe(false);
    });
  });

  describe('makeFallbackResult', () => {
    it('returns fail status with manual_override true', () => {
      const result = makeFallbackResult('ABC850101AB1', 'timeout');

      expect(result.status).toBe('fail');
      expect(result.manual_override).toBe(true);
      expect(result.checks).toEqual([]);
      expect(result.risk_flags).toHaveLength(1);
      expect(result.risk_flags[0].code).toBe('scory_api_unavailable');
      expect(result.risk_flags[0].severity).toBe('critical');
    });

    it('includes RFC and error in the message', () => {
      const result = makeFallbackResult('XYZ000000XX0', 'Network error');

      expect(result.risk_flags[0].message).toContain('XYZ000000XX0');
      expect(result.risk_flags[0].message).toContain('Network error');
      expect(result.explanation).toContain('Network error');
    });
  });
});
