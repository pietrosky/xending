import { supabase } from '@/lib/supabase';
import type {
  PaymentInstructionAccount,
  CreateAccountInput,
} from '../types/payment-instruction.types';

/**
 * Fetches all payment accounts ordered by: active first, then disabled,
 * each group sorted by created_at descending.
 */
export async function getPaymentAccounts(): Promise<PaymentInstructionAccount[]> {
  const { data, error } = await supabase
    .from<PaymentInstructionAccount>('pi_accounts')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error al obtener cuentas: ${error.message}`);

  return (data ?? []) as PaymentInstructionAccount[];
}

/**
 * Creates a new payment account after checking for duplicate account_number.
 * Returns the newly created account.
 */
export async function createPaymentAccount(
  input: CreateAccountInput,
): Promise<PaymentInstructionAccount> {
  // Get current user for created_by
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // Insert new account and return it in a single POST with Prefer: return=representation
  const { data: created, error: insertError } = await supabase
    .from('pi_accounts')
    .insert({
      account_number: input.account_number,
      account_name: input.account_name,
      swift_code: input.swift_code?.trim() || null,
      bank_name: input.bank_name,
      bank_address: input.bank_address,
      currency_types: input.currency_types,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (insertError) {
    // PostgREST returns 409 / code 23505 for unique constraint violations
    if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
      throw new Error('Ya existe una cuenta con este número de cuenta');
    }
    throw new Error(`Error al crear cuenta: ${insertError.message}`);
  }

  return created as unknown as PaymentInstructionAccount;
}

/**
 * Fetches a single payment account by ID.
 */
export async function getPaymentAccountById(id: string): Promise<PaymentInstructionAccount | null> {
  const { data, error } = await supabase
    .from('pi_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error al obtener cuenta: ${error.message}`);
  }
  return data as unknown as PaymentInstructionAccount;
}

/**
 * Disables a payment account by setting is_active to false
 * and recording disabled_at / disabled_by.
 */
export async function disablePaymentAccount(id: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  const { error } = await supabase
    .from('pi_accounts')
    .update({
      is_active: false,
      disabled_at: new Date().toISOString(),
      disabled_by: user.id,
    })
    .eq('id', id);

  if (error) throw new Error(`Error al deshabilitar cuenta: ${error.message}`);
}
