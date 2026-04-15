/**
 * Hook para determinar el rol del usuario actual (admin o broker).
 * Consulta Supabase auth y cachea el resultado con React Query.
 *
 * Requerimientos: 11.4, 11.6
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'broker';

async function fetchUserRole(): Promise<Role> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('No authenticated user');

  const role = (user.app_metadata?.role ||
    user.user_metadata?.role ||
    'broker') as Role;

  return role;
}

export function useRole() {
  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: fetchUserRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    role: role ?? null,
    isAdmin: role === 'admin',
    isBroker: role === 'broker',
    isLoading,
  };
}
