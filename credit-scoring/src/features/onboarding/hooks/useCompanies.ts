/**
 * React Query hooks para M01 Onboarding Lite — empresas.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanies,
  getCompanyById,
  getCompanyContacts,
  createCompany,
  updateCompanyStatus,
} from '../services/companyService';
import type { CreateCompanyInput, Company } from '../types/company.types';

const KEYS = {
  all: ['companies'] as const,
  detail: (id: string) => ['companies', id] as const,
  contacts: (id: string) => ['companies', id, 'contacts'] as const,
};

export function useCompanies() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: getCompanies,
    staleTime: 30_000,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => getCompanyById(id!),
    enabled: !!id,
  });
}

export function useCompanyContacts(companyId: string | undefined) {
  return useQuery({
    queryKey: KEYS.contacts(companyId ?? ''),
    queryFn: () => getCompanyContacts(companyId!),
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Company['status'] }) =>
      updateCompanyStatus(id, status),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
      void qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
    },
  });
}
