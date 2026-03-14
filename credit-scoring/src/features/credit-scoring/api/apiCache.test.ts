import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks so vi.mock factory can reference them
const { mockSelect, mockInsert, mockDelete, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();

  // Chainable delete builder
  const deleteBuilder = {
    eq: vi.fn(),
    lt: vi.fn(),
  };
  deleteBuilder.eq.mockReturnValue(deleteBuilder);
  deleteBuilder.lt.mockReturnValue(deleteBuilder);

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
    delete: () => {
      mockDelete();
      return deleteBuilder;
    },
  }));

  return { mockSelect, mockInsert, mockDelete, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import {
  getFromCache,
  setInCache,
  invalidateCache,
  cleanExpiredCache,
  logApiCall,
} from './apiCache';

describe('apiCache - getFromCache', () => {
  beforeEach(() => {
    mockSelect.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cached data when a valid entry exists', async () => {
    const cached = { name: 'test' };
    mockSelect.mockResolvedValueOnce({
      data: {
        response_data: cached,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    const result = await getFromCache<{ name: string }>('scory', 'validate', 'RFC123');
    expect(result).toEqual(cached);
  });

  it('returns null when no cache entry exists', async () => {
    const result = await getFromCache('scory', 'validate', 'RFC123');
    expect(result).toBeNull();
  });
});

describe('apiCache - setInCache', () => {
  beforeEach(() => {
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts a cache entry with default 24h expiration', async () => {
    await setInCache('syntage', 'cfdis', 'RFC123', { data: 'ok' });

    expect(mockFrom).toHaveBeenCalledWith('cs_api_cache');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'syntage',
        endpoint: 'cfdis',
        rfc: 'RFC123',
        response_data: { data: 'ok' },
      }),
    );
  });
});

describe('apiCache - invalidateCache', () => {
  beforeEach(() => {
    mockDelete.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when no filters provided', async () => {
    await invalidateCache({});
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('calls delete when provider filter is given', async () => {
    await invalidateCache({ provider: 'scory' });
    expect(mockFrom).toHaveBeenCalledWith('cs_api_cache');
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('apiCache - cleanExpiredCache', () => {
  beforeEach(() => {
    mockDelete.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes expired entries', async () => {
    await cleanExpiredCache();
    expect(mockFrom).toHaveBeenCalledWith('cs_api_cache');
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('apiCache - logApiCall', () => {
  beforeEach(() => {
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts a log entry into cs_api_calls', async () => {
    await logApiCall({
      provider: 'scory',
      endpoint: 'validate',
      status_code: 200,
      latency_ms: 150,
    });

    expect(mockFrom).toHaveBeenCalledWith('cs_api_calls');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'scory',
        endpoint: 'validate',
        status_code: 200,
        latency_ms: 150,
        error_message: null,
      }),
    );
  });

  it('includes error_message when provided', async () => {
    await logApiCall({
      provider: 'syntage',
      endpoint: 'cfdis',
      status_code: 500,
      latency_ms: 3000,
      error_message: 'Internal Server Error',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: 'Internal Server Error',
      }),
    );
  });
});
