import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/authStore';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
