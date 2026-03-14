import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { CreditApplication } from '../types/application.types';
import { ApplicationList } from '../components/ApplicationList';

export function ApplicationsPage() {
  // Placeholder — will be replaced with React Query + Supabase
  const [applications] = useState<CreditApplication[]>([]);
  const navigate = useNavigate();

  function handleSelect(id: string) {
    navigate(`/applications/${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Solicitudes de Crédito
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión y seguimiento de solicitudes
          </p>
        </div>
        <Link
          to="/applications/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          + Nueva Solicitud
        </Link>
      </div>

      <ApplicationList applications={applications} onSelect={handleSelect} />
    </div>
  );
}
