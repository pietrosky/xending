/**
 * React Query hooks para empresas FX — Transacciones FX (Xending Capital).
 *
 * Sigue el patrón de useCompanies.ts de onboarding.
 * Importa servicios de companyServiceFX y tipos de company-fx.types.
 *
 * Requerimientos: 1.1, 2.1, 4.1, 4.2, 5.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  getCompaniesFX,
  getCompanyFXById,
  searchCompanies,
  createCompanyFX,
  updateCompanyFX,
  toggleCompanyStatus,
} from '../services/companyServiceFX';
import type { CompanyFX, CreateCompanyFXInput } from '../types/company-fx.types';

const KEYS = {
  all: ['companies-fx'] as const,
  detail: (id: string) => ['companies-fx', id] as const,
  search: (query: string) => ['companies-fx', 'search', query] as const,
};

/** Lista todas las empresas FX (Req 4.1, 4.2) */
export function useCompaniesFX() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: getCompaniesFX,
    staleTime: 30_000,
  });
}

/** Obtiene una empresa FX por ID con cuentas de pago (Req 2.1) */
export function useCompanyFX(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => getCompanyFXById(id!),
    enabled: !!id,
  });
}

/** Busca empresas por razón social o RFC con debounce (Req 5.1) */
export function useSearchCompanies(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: KEYS.search(debouncedQuery),
    queryFn: () => searchCompanies(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
}

/** Mutation para crear empresa FX con invalidación de cache (Req 1.1) */
export function useCreateCompanyFX() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, userId }: { input: CreateCompanyFXInput; userId: string }) =>
      createCompanyFX(input, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

/** Mutation para editar empresa FX con invalidación de cache (Req 2.1) */
export function useUpdateCompanyFX() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateCompanyFXInput> }) =>
      updateCompanyFX(id, input),
    onSuccess: (data: CompanyFX) => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
      void qc.invalidateQueries({ queryKey: KEYS.detail(data.id) });
    },
  });
}

/** Mutation para deshabilitar/habilitar empresa (Req 4.1, 4.2) */
export function useToggleCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      toggleCompanyStatus(id, disabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
