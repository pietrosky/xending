/**
 * PostgREST direct client — replaces supabase-js + Kong gateway.
 *
 * Talks directly to PostgREST at VITE_POSTGREST_URL.
 * Provides a query builder that mirrors the supabase-js `.from()` API
 * so migration is minimal across the codebase.
 */

const POSTGREST_URL = import.meta.env.VITE_POSTGREST_URL ?? 'http://localhost:55421';

// JWT for the "anon" role (same demo token used in docker-compose)
const ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// ─── Types ───────────────────────────────────────────────────────────

interface PostgrestError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

interface PostgrestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

type FilterOp = { column: string; op: string; value: unknown };

// ─── Query Builder ───────────────────────────────────────────────────

class PostgrestQueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private body: unknown = null;
  private selectColumns = '*';
  private filters: FilterOp[] = [];
  private orFilter: string | null = null;
  private orderClauses: string[] = [];
  private limitValue: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private returnRepresentation = false;
  private preferHeaders: string[] = [];

  constructor(table: string) {
    this.table = table;
  }

  // ─── Operations ──────────────────────────────────────────────────

  select(columns = '*'): this {
    this.method = 'GET';
    this.selectColumns = columns;
    return this;
  }

  insert(data: unknown): this {
    this.method = 'POST';
    this.body = data;
    this.returnRepresentation = false;
    return this;
  }

  update(data: unknown): this {
    this.method = 'PATCH';
    this.body = data;
    this.returnRepresentation = false;
    return this;
  }

  delete(): this {
    this.method = 'DELETE';
    return this;
  }

  // ─── Filters ─────────────────────────────────────────────────────

  eq(column: string, value: unknown): this {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    const formatted = `(${values.map((v) => `"${v}"`).join(',')})`;
    this.filters.push({ column, op: 'in', value: formatted });
    return this;
  }

  or(filterString: string): this {
    this.orFilter = filterString;
    return this;
  }

  // ─── Modifiers ───────────────────────────────────────────────────

  order(column: string, options?: { ascending?: boolean }): this {
    const dir = options?.ascending === false ? 'desc' : 'asc';
    this.orderClauses.push(`${column}.${dir}`);
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    this.limitValue = 1;
    return this;
  }

  maybeSingle(): this {
    this.isMaybeSingle = true;
    this.limitValue = 1;
    return this;
  }

  // ─── Execute ─────────────────────────────────────────────────────

  async then<TResult1 = PostgrestResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this.execute();
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute(): Promise<PostgrestResponse<T>> {
    const url = this.buildUrl();
    const headers = this.buildHeaders();

    try {
      const response = await fetch(url, {
        method: this.method,
        headers,
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const pgError: PostgrestError = {
          message: errorBody.message ?? response.statusText,
          code: errorBody.code ?? `PGRST${response.status}`,
          details: errorBody.details,
          hint: errorBody.hint,
        };

        // Match supabase-js behavior: single() on 0 rows → PGRST116
        if (response.status === 406 || (response.status === 200 && this.isSingle)) {
          pgError.code = 'PGRST116';
        }

        return { data: null, error: pgError };
      }

      // DELETE with no return
      if (this.method === 'DELETE' && !this.returnRepresentation) {
        return { data: null, error: null };
      }

      const text = await response.text();
      if (!text) return { data: null, error: null };

      const json = JSON.parse(text);

      if (this.isSingle || this.isMaybeSingle) {
        const arr = Array.isArray(json) ? json : [json];
        if (arr.length === 0) {
          if (this.isMaybeSingle) return { data: null, error: null };
          return {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          };
        }
        return { data: arr[0] as T, error: null };
      }

      return { data: json as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  private buildUrl(): string {
    const params = new URLSearchParams();

    // Select columns
    if (this.method === 'GET' || this.returnRepresentation) {
      params.set('select', this.selectColumns);
    }

    // Filters
    for (const f of this.filters) {
      if (f.op === 'in') {
        params.append(f.column, `in.${f.value}`);
      } else {
        params.append(f.column, `${f.op}.${f.value}`);
      }
    }

    // OR filter
    if (this.orFilter) {
      params.append('or', `(${this.orFilter})`);
    }

    // Order (PostgREST v12 requires explicit order when limit is set)
    if (this.orderClauses.length > 0) {
      params.set('order', this.orderClauses.join(','));
    } else if (this.limitValue !== null) {
      params.set('order', 'id');
    }

    // Limit
    if (this.limitValue !== null) {
      params.set('limit', String(this.limitValue));
    }

    const qs = params.toString();
    return `${POSTGREST_URL}/${this.table}${qs ? `?${qs}` : ''}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_JWT}`,
    };

    const preferParts: string[] = [...this.preferHeaders];

    if (this.returnRepresentation) {
      preferParts.push('return=representation');
    }

    if (this.isSingle || this.isMaybeSingle) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }

    if (preferParts.length > 0) {
      headers['Prefer'] = preferParts.join(', ');
    }

    return headers;
  }
}

// ─── Chainable insert/update that supports .select().single() ────────

class PostgrestMutationBuilder<T = Record<string, unknown>> extends PostgrestQueryBuilder<T> {
  select(columns = '*'): this {
    // For mutations, .select() means "return representation"
    (this as unknown as Record<string, unknown>)['returnRepresentation'] = true;
    (this as unknown as Record<string, unknown>)['selectColumns'] = columns;
    return this;
  }
}

// ─── Auth stub (local dev — no real auth) ────────────────────────────

const LOCAL_DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@xending.local',
  app_metadata: { role: 'admin' },
  user_metadata: { role: 'admin', full_name: 'Admin Local' },
  role: 'admin',
};

const authStub = {
  async getUser() {
    return { data: { user: LOCAL_DEV_USER }, error: null };
  },
  async getSession() {
    return { data: { session: { user: LOCAL_DEV_USER } }, error: null };
  },
  onAuthStateChange(_callback: unknown) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// ─── Storage stub (local dev — no real storage) ──────────────────────

function storageStub(bucket: string) {
  return {
    async upload(path: string, _file: File, _options?: Record<string, unknown>) {
      console.warn(`[storage-stub] upload to ${bucket}/${path} — skipped in local dev`);
      return { data: { path }, error: null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `http://localhost:55421/storage/${bucket}/${path}` } };
    },
  };
}

// ─── Public API (drop-in replacement for supabase client) ────────────

export const postgrest = {
  from<T = Record<string, unknown>>(table: string): PostgrestMutationBuilder<T> {
    return new PostgrestMutationBuilder<T>(table);
  },
  auth: authStub,
  storage: {
    from: storageStub,
  },
};
