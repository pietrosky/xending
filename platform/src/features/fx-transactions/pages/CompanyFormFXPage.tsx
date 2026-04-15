/**
 * CompanyFormFXPage — Página wrapper para CompanyFormFX en modo create o edit.
 *
 * Determina el modo a partir de la URL:
 *   /fx/companies/new       → mode=create
 *   /fx/companies/:id/edit  → mode=edit
 *
 * En modo edit, carga datos con useCompanyFX(id) y verifica permisos.
 * Usa useRole para admin check, useCreateCompanyFX / useUpdateCompanyFX para mutations,
 * y supabase.auth.getUser() para obtener el userId del broker al crear.
 *
 * Requerimientos: 1.1, 1.7, 2.1, 2.3
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useRole } from '../hooks/useRole';
import { useCompanyFX, useCreateCompanyFX, useUpdateCompanyFX, useToggleCompanyStatus } from '../hooks/useCompaniesFX';
import { CompanyFormFX } from '../components/CompanyFormFX';
import type { CreateCompanyFXInput } from '../types/company-fx.types';

export function CompanyFormFXPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useRole();

  const mode = id ? 'edit' : 'create';

  // Load company data in edit mode
  const { data: company, isLoading: companyLoading, isError: companyError } = useCompanyFX(id);

  // Mutations
  const createMutation = useCreateCompanyFX();
  const updateMutation = useUpdateCompanyFX();
  const toggleMutation = useToggleCompanyStatus();

  // Current user ID (needed for creation to link broker → company)
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Permission check: broker can only edit own companies (RLS handles it,
  // but we also guard on the frontend if the query returns nothing)
  const accessDenied = mode === 'edit' && !companyLoading && !companyError && !company;

  const isLoading =
    mode === 'create'
      ? createMutation.isPending
      : updateMutation.isPending;

  const error =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    null;

  function handleSubmit(input: CreateCompanyFXInput) {
    if (mode === 'create') {
      if (!userId) return;
      createMutation.mutate(
        { input, userId },
        { onSuccess: () => navigate('/fx/companies') },
      );
    } else if (id) {
      updateMutation.mutate(
        { id, input },
        { onSuccess: () => navigate('/fx/companies') },
      );
    }
  }

  // ─── Loading states ────────────────────────────────────────────────

  if (roleLoading || (mode === 'edit' && companyLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="text-center py-20 text-sm text-destructive">
        No tienes permisos para editar esta empresa.
      </div>
    );
  }

  if (mode === 'edit' && companyError) {
    return (
      <div className="text-center py-20 text-sm text-destructive">
        Error al cargar los datos de la empresa.
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-6">
      <button
        type="button"
        onClick={() => navigate('/fx/companies')}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Volver al catálogo
      </button>

      <CompanyFormFX
        mode={mode}
        initialData={mode === 'edit' ? (company ?? undefined) : undefined}
        isAdmin={isAdmin}
        onSubmit={handleSubmit}
        onToggleStatus={(companyId, disabled) => {
          toggleMutation.mutate({ id: companyId, disabled }, {
            onSuccess: () => navigate('/fx/companies'),
          });
        }}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
