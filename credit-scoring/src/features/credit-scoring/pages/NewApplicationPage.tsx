import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewApplicationForm } from '../components/NewApplicationForm';
import type { NewApplicationData } from '../types/application.types';

export function NewApplicationPage() {
  const navigate = useNavigate();

  function handleSubmit(data: NewApplicationData) {
    // Placeholder — will be replaced with Supabase integration
    console.log('Nueva solicitud:', data);
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
