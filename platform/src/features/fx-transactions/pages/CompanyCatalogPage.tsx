/**
 * CompanyCatalogPage — Página del catálogo de empresas FX.
 *
 * Renderiza CompanyCatalogTable con datos de useCompaniesFX.
 * Botón "Nueva Empresa" navega a /fx/companies/new.
 * Usa useRole para determinar permisos y useToggleCompanyStatus para el toggle.
 *
 * Requerimientos: 4.1, 4.2
 */

import { useNavigate } from 'react-router-dom';
import { useCompaniesFX, useToggleCompanyStatus } from '../hooks/useCompaniesFX';
import { useRole } from '../hooks/useRole';
import { CompanyCatalogTable } from '../components/CompanyCatalogTable';

export function CompanyCatalogPage() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: companies, isLoading, isError } = useCompaniesFX();
  const toggleStatus = useToggleCompanyStatus();

  function handleEdit(companyId: string) {
    navigate(`/fx/companies/${companyId}/edit`);
  }

  function handleToggleStatus(companyId: string, disabled: boolean) {
    toggleStatus.mutate({ id: companyId, disabled });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-sm text-destructive">
        Error al cargar las empresas. Intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Catálogo de Empresas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de empresas para transacciones FX
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/fx/companies/new')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          + Nueva Empresa
        </button>
      </div>

      <CompanyCatalogTable
        companies={companies ?? []}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
