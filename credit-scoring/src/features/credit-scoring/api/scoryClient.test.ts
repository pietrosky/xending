import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks so vi.mock factory can reference them
const { mockSelect, mockInsert, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn((_table: string) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            gt: () => ({
              order: () => ({
                limit: () => ({
                  single: mockSelect,
                }),
              }),
            }),
          }),
        }),
      }),
    }),
    insert: mockInsert,
  }));
  return { mockSelect, mockInsert, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { validateCompliance } from './scoryClient';
import type { ComplianceResult } from './scoryClient';

const MOCK_RESULT: ComplianceResult = {
  status: 'pass',
  checks: [
    { check_type: 'listas_negras', result: 'pass', details: {} },
    { check_type: 'ofac', result: 'pass', details: {} },
  ],
  risk_flags: [],
  explanation: 'All checks passed',
  manual_override: false,
};

describe('scoryClient - validateCompliance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('VITE_SCORY_API_KEY', 'test-key');
    vi.stubEnv('VITE_SCORY_API_URL', 'https://test.scory.mx');
    mockSelect.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns cached result when available', async () => {
    mockSelect.mockResolvedValueOnce({
      data: {
        response_data: MOCK_RESULT,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    const result = await validateCompliance('ABC123456XXX');
    expect(result).toEqual(MOCK_RESULT);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls Scory API when cache misses and caches result', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_RESULT),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await validateCompliance('ABC123456XXX');

    expect(result).toEqual(MOCK_RESULT);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.scory.mx/v1/compliance/validate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('returns fallback with manual_override when API fails all retries', async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = validateCompliance('ABC123456XXX');
    // Advance past all retry delays (2s + 4s)
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.status).toBe('fail');
    expect(result.manual_override).toBe(true);
    expect(result.risk_flags[0].code).toBe('scory_api_unavailable');
    vi.useRealTimers();
  });

  it('retries on non-ok response and eventually succeeds', async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_RESULT),
      });
    vi.stubGlobal('fetch', mockFetch);

    const promise = validateCompliance('ABC123456XXX');
    // Advance past retry delay (2s for attempt 1)
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toEqual(MOCK_RESULT);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
