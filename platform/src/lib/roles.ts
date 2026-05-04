import type { User } from '@supabase/supabase-js';

export type AuthRole = 'admin' | 'broker';

export function normalizeAuthRole(role: unknown): AuthRole {
  return role === 'admin' || role === 'broker' ? role : 'broker';
}

export function getAuthRole(user: Pick<User, 'app_metadata'> | null | undefined): AuthRole {
  return normalizeAuthRole(user?.app_metadata?.role);
}
