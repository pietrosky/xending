/**
 * React Query hooks para Transacciones FX (Xending Capital).
 *
 * - useTransactions()          — query de listado
 * - useCreateTransaction()     — mutation de creación
 * - useAuthorizeTransaction()  — mutation de autorización
 *
 * Req 5.7, 7.1, 9.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  authorizeTransaction,
  updateTransaction,
  cancelTransaction,
  revertCancelTransaction,
} from '../services/transactionService';
import type { CreateTransactionInput } from '../types/transaction.types';

const KEYS = {
  all: ['transactions-fx'] as const,
};

export function useTransactions() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: getTransactions,
    staleTime: 30_000,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, userId }: { input: CreateTransactionInput; userId: string }) =>
      createTransaction(input, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useAuthorizeTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, adminUserId }: { transactionId: string; adminUserId: string }) =>
      authorizeTransaction(transactionId, adminUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: [...KEYS.all, id],
    queryFn: () => getTransactionById(id!),
    enabled: !!id,
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { quantity?: number; exchange_rate?: number; base_rate?: number; markup_rate?: number; company_id?: string; payment_account_id?: string; pi_account_id?: string; buys_currency?: string; pays_currency?: string } }) =>
      updateTransaction(id, updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => cancelTransaction(transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRevertCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => revertCancelTransaction(transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
