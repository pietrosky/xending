/**
 * Página de gestión de empresas — M01 Onboarding Lite.
 *
 * Vista principal: lista de empresas con búsqueda.
 * Vista secundaria: formulario de alta de empresa.
 */

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useCompanies, useCreateCompany } from '../hooks/useCompanies';
import { CompanyList } from '../components/CompanyList';
import { CreateCompanyForm } from '../components/CreateCompanyForm';
import type { CreateCompanyInput } from '../types/company.types';

export function CompaniesPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [success, setSuccess] = useState(false);

  const { data: companies = [], isLoading } = useCompanies();
  const createMutation = useCreateCompany();

  function handleCreate(input: CreateCompanyInput) {
    setSuccess(false);
    createMutation.mutate(input, {
      onSuccess: () => setSuccess(true),
      onError: () => setSuccess(false),
    });
  }

  function handleNewCompany() {
    setSuccess(false);
    createMutation.reset();
    setView('create');
  }

  if (view === 'create') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setView('list');
            setSuccess(false);
            createMutation.reset();
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a empresas
        </button>

        <CreateCompanyForm
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message ?? null}
          success={success}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Empresas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Clientes registrados en la plataforma
        </p>
      </div>

      <CompanyList
        companies={companies}
        isLoading={isLoading}
        onNewCompany={handleNewCompany}
      />
    </div>
  );
}
