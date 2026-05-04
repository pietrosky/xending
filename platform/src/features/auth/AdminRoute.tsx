import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/authStore';

/** Only allows admin users through. Brokers get redirected to FX companies. */
export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return null;
  if (user?.role !== 'admin') return <Navigate to="/fx/companies" replace />;
  return <Outlet />;
}
