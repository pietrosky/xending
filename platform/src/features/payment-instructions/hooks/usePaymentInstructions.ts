/**
 * React Query hooks para Payment Instructions (Xending Capital).
 *
 * - usePaymentAccounts()          — query de listado de cuentas (filtradas por RLS según rol)
 * - useCreatePaymentAccount()     — mutation para crear cuenta con invalidación de cache
 * - useDisablePaymentAccount()    — mutation para deshabilitar cuenta con invalidación de cache
 *
 * Requerimientos: 1.1, 3.1, 4.1, 4.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaymentAccounts,
  createPaymentAccount,
  disablePaymentAccount,
} from '../services/paymentAccountService';
import type { CreateAccountInput } from '../types/payment-instruction.types';

const KEYS = {
  all: ['payment-accounts'] as const,
};

/** Lista cuentas de pago — filtradas por RLS según rol (Req 4.1, 4.2) */
export function usePaymentAccounts() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: getPaymentAccounts,
    staleTime: 30_000,
  });
}

/** Mutation para crear cuenta de pago con invalidación de cache (Req 1.1) */
export function useCreatePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => createPaymentAccount(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

/** Mutation para deshabilitar cuenta de pago con invalidación de cache (Req 3.1) */
export function useDisablePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disablePaymentAccount(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
