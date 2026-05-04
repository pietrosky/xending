# Frontend Migration Guide: Supabase → FastAPI

This document maps every Supabase client call in the React frontend to its new FastAPI endpoint.

## Base URL Change

```typescript
// Before (in .env)
VITE_SUPABASE_URL=http://localhost:55421

// After
VITE_API_URL=http://localhost:8000/api
```

## Authentication

| Before (Supabase Auth) | After (FastAPI) |
|---|---|
| `supabase.auth.signInWithPassword()` | `POST /api/auth/login` |
| `supabase.auth.getUser()` | `GET /api/auth/me` (with Bearer token) |
| `supabase.auth.signOut()` | Client-side: clear token from storage |
| `supabase.auth.getSession()` | Client-side: check stored JWT |

### Token Storage

Replace Supabase session with a simple JWT stored in `sessionStorage`:

```typescript
// New auth helper
const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('access_token');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}
```

## Companies (companyService.ts)

| Before | After |
|---|---|
| `supabase.from('cs_companies_summary').select('*')` | `GET /api/companies` |
| `supabase.from('cs_companies').select('*').eq('id', id)` | `GET /api/companies/{id}` |
| `supabase.from('cs_company_contacts').select('*').eq('company_id', id)` | `GET /api/companies/{id}/contacts` |
| `supabase.from('cs_companies').select('*').eq('rfc', rfc)` | `GET /api/companies/search/rfc/{rfc}` |
| `supabase.from('cs_companies').insert(...)` | `POST /api/companies` |
| `supabase.from('cs_companies').update({ status })` | `PATCH /api/companies/{id}/status` |

## FX Transactions (transactionService.ts)

| Before | After |
|---|---|
| `supabase.from('fx_transactions').select('*')` | `GET /api/transactions` |
| `supabase.from('fx_transactions').select('*').eq('id', id)` | `GET /api/transactions/{id}` |
| `supabase.from('fx_transactions').insert(...)` | `POST /api/transactions` |
| `supabase.from('fx_transactions').update({ status: 'authorized' })` | `POST /api/transactions/{id}/authorize` |
| `supabase.from('fx_transactions').update(...)` | `PATCH /api/transactions/{id}` |
| Cancel transaction | `POST /api/transactions/{id}/cancel` |
| Revert cancel | `POST /api/transactions/{id}/revert-cancel` |
| Group by status (client-side) | `GET /api/transactions/grouped` |

## Payment Accounts

| Before | After |
|---|---|
| `supabase.from('cs_company_payment_accounts').select(...)` | `GET /api/companies/{id}/payment-accounts` |
| `supabase.from('cs_company_payment_accounts').insert(...)` | `POST /api/companies/{id}/payment-accounts` |
| `supabase.from('pi_accounts').select('*')` | `GET /api/pi-accounts` |
| `supabase.from('pi_accounts').insert(...)` | `POST /api/pi-accounts` |
| `supabase.from('pi_accounts').update({ is_active: false })` | `POST /api/pi-accounts/{id}/disable` |

## Credit Applications

| Before | After |
|---|---|
| `supabase.from('cs_applications').select('*')` | `GET /api/applications` |
| `supabase.from('cs_applications').insert(...)` | `POST /api/applications` |
| Status update | `PATCH /api/applications/{id}/status` |

## Scoring (Edge Functions → FastAPI)

| Before (Edge Function) | After |
|---|---|
| `POST /functions/cs-orchestrator` | `POST /api/scoring/run/{application_id}` |
| `POST /functions/cs-engine-runner` | Internal (Celery task) |
| Get results | `GET /api/scoring/results/{application_id}` |

## External API Proxies

| Before (Edge Function) | After |
|---|---|
| `POST /functions/cs-syntage-proxy` | `POST /api/proxy/syntage/entities` |
| Syntage extractions | `POST /api/proxy/syntage/extractions` |
| Syntage invoices | `GET /api/proxy/syntage/entities/{id}/invoices` |
| `POST /functions/cs-scory-proxy` | `POST /api/proxy/scory/verify` |

## PDF Generation (fx-payment-order)

| Before (Edge Function) | After |
|---|---|
| `POST /functions/fx-payment-order` | `POST /api/pdf/payment-order` (TODO) |

## Frontend Changes Required

1. **Replace `@/lib/supabase.ts`** with a new `@/lib/api.ts` HTTP client
2. **Replace `@/lib/authStore.ts`** to use JWT from `/api/auth/login`
3. **Update all service files** to use the new API client
4. **Remove `@supabase/supabase-js`** dependency from package.json
5. **Update `.env`** to point to FastAPI instead of Supabase

### New `@/lib/api.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private getToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error de red' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> { return this.request(path); }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }
  delete<T>(path: string): Promise<T> { return this.request(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```
