import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewApplicationForm } from '../components/NewApplicationForm';
import type { PreFilterInput } from '../types/expediente.types';

export function NewApplicationPage() {
  const navigate = useNavigate();

  function handleSubmit(data: PreFilterInput) {
    // TODO: Crear expediente en Supabase + ejecutar pre-filtro
    console.log('Nueva solicitud (expediente):', data);
    navigate('/applications');
  }

  return (
    <div>
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a solicitudes
      </Link>

      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Nueva Solicitud
      </h2>

      <NewApplicationForm onSubmit={handleSubmit} />
    </div>
  );
}
