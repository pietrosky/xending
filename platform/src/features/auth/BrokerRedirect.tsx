import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/authStore';
import { ApplicationDetailPage } from '../credit-scoring/pages/ApplicationDetailPage';

/** Index route: admin sees dashboard, broker redirects to FX companies. */
export function BrokerRedirect() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return null;
  if (user?.role === 'broker') return <Navigate to="/fx/companies" replace />;
  return <ApplicationDetailPage />;
}
