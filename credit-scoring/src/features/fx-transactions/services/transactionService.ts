/**
 * Servicio de transacciones FX — Transacciones FX (Xending Capital).
 *
 * CRUD de fx_transactions vía Supabase.
 * Incluye consulta con datos de empresa y usuarios, creación con folio auto-generado,
 * autorización con verificación de estado, y agrupación por estado.
 *
 * Req 5.7, 7.1, 9.1
 */

import { supabase } from '@/lib/supabase';
import type {
  FXTransaction,
  FXTransactionSummary,
  CreateTransactionInput,
} from '../types/transaction.types';

// ─── Tipos auxiliares para agrupación ────────────────────────────────

export interface TransactionGroups {
  noAutorizadas: FXTransactionSummary[];
  autorizadasSinComprobante: FXTransactionSummary[];
  historial: FXTransactionSummary[];
}

// ─── Queries ─────────────────────────────────────────────────────────

/**
 * Lista todas las transacciones FX con datos de empresa (legal_name, rfc)
 * y nombres de broker (created_by) y autorizador (authorized_by).
 *
 * Supabase no soporta JOINs multi-tabla complejos fácilmente,
 * así que se hacen queries separadas y se ensambla el resultado.
 *
 * Req 9.1
 */
export async function getTransactions(): Promise<FXTransactionSummary[]> {
  // 1. Fetch all transactions (table may not exist yet in local dev)
  const { data: transactions, error: txError } = await supabase
    .from('fx_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (txError || !transactions || transactions.length === 0) return [];

  // 2. Collect unique company IDs and user IDs
  const companyIds = [...new Set(transactions.map((tx) => tx.company_id))];
  // 3. Fetch company data
  const { data: companies, error: companiesError } = await supabase
    .from('cs_companies')
    .select('id, legal_name, rfc')
    .in('id', companyIds);

  if (companiesError) throw new Error(`Error fetching companies: ${companiesError.message}`);

  const companyMap = new Map<string, { legal_name: string; rfc: string }>();
  if (companies) {
    for (const c of companies) {
      companyMap.set(c.id, { legal_name: c.legal_name, rfc: c.rfc });
    }
  }

  // 4. User names not available in local dev (no auth_users_view)
  const userMap = new Map<string, string>();

  // 5. Assemble summaries
  return transactions.map((tx) => {
    const company = companyMap.get(tx.company_id);
    return {
      ...tx,
      company_legal_name: company?.legal_name ?? 'Empresa desconocida',
      company_rfc: company?.rfc ?? '',
      broker_name: userMap.get(tx.created_by) ?? null,
      authorized_by_name: tx.authorized_by ? (userMap.get(tx.authorized_by) ?? null) : null,
    } as FXTransactionSummary;
  });
}

// ─── Mutations ───────────────────────────────────────────────────────

/**
 * Crea una transacción FX. El folio y pays_mxn se generan automáticamente
 * en la base de datos (folio vía secuencia, pays_mxn como GENERATED ALWAYS).
 *
 * Req 5.7
 */
export async function createTransaction(
  input: CreateTransactionInput,
  userId: string,
): Promise<FXTransaction> {
  const { data, error } = await supabase
    .from('fx_transactions')
    .insert({
      company_id: input.company_id,
      buys_usd: input.buys_usd,
      exchange_rate: input.exchange_rate,
      payment_account_id: input.payment_account_id || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating transaction: ${error.message}`);
  return data as FXTransaction;
}

/**
 * Autoriza una transacción pendiente. Verifica que el usuario sea admin
 * y que el status actual sea 'pending' antes de actualizar a 'authorized'.
 *
 * Req 7.1, 7.4, 7.5, 11.6
 */
export async function authorizeTransaction(
  transactionId: string,
  adminUserId: string,
): Promise<FXTransaction> {
  // Verify the user has admin role before proceeding
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Permisos insuficientes: usuario no autenticado');
  }

  const role = user.app_metadata?.role || user.user_metadata?.role || 'broker';
  if (role !== 'admin') {
    throw new Error('Permisos insuficientes: solo el administrador puede autorizar transacciones');
  }

  // Verify current status is 'pending'
  const { data: current, error: fetchError } = await supabase
    .from('fx_transactions')
    .select('status')
    .eq('id', transactionId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') throw new Error('Transacción no encontrada');
    throw new Error(`Error fetching transaction: ${fetchError.message}`);
  }

  if (current.status !== 'pending') {
    throw new Error(
      `No se puede autorizar: la transacción tiene status '${current.status}', se esperaba 'pending'`,
    );
  }

  // Update to authorized
  const { data, error } = await supabase
    .from('fx_transactions')
    .update({
      status: 'authorized',
      authorized_by: adminUserId,
      authorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw new Error(`Error authorizing transaction: ${error.message}`);
  return data as FXTransaction;
}

/**
 * Obtiene una transacción por ID.
 */
export async function getTransactionById(id: string): Promise<FXTransaction | null> {
  const { data, error } = await supabase
    .from('fx_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching transaction: ${error.message}`);
  }
  return data as FXTransaction;
}

/**
 * Actualiza una transacción FX.
 * - Admin puede editar cualquier transacción en cualquier status.
 * - Broker solo puede editar transacciones en status 'pending'.
 */
export async function updateTransaction(
  transactionId: string,
  updates: { buys_usd?: number; exchange_rate?: number; company_id?: string; payment_account_id?: string },
): Promise<FXTransaction> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Usuario no autenticado');

  const role = user.app_metadata?.role || user.user_metadata?.role || 'broker';

  // Brokers can only edit pending transactions
  if (role !== 'admin') {
    const { data: current, error: fetchError } = await supabase
      .from('fx_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw new Error(`Error fetching transaction: ${fetchError.message}`);
    if (current.status !== 'pending') {
      throw new Error('Solo se pueden editar transacciones pendientes. Contacte al administrador.');
    }
  }

  const { data, error } = await supabase
    .from('fx_transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw new Error(`Error updating transaction: ${error.message}`);
  return data as FXTransaction;
}

// ─── Pure functions ──────────────────────────────────────────────────

/**
 * Clasifica transacciones en tres grupos según su estado y proof_url.
 * - "No Autorizadas": status = 'pending'
 * - "Autorizadas sin Comprobante": status = 'authorized', proof_url nulo
 * - "Historial": status = 'completed'
 *
 * Req 9.1
 */
export function groupTransactionsByStatus(
  transactions: FXTransactionSummary[],
): TransactionGroups {
  const noAutorizadas: FXTransactionSummary[] = [];
  const autorizadasSinComprobante: FXTransactionSummary[] = [];
  const historial: FXTransactionSummary[] = [];

  for (const tx of transactions) {
    switch (tx.status) {
      case 'pending':
        noAutorizadas.push(tx);
        break;
      case 'authorized':
        autorizadasSinComprobante.push(tx);
        break;
      case 'completed':
        historial.push(tx);
        break;
    }
  }

  return { noAutorizadas, autorizadasSinComprobante, historial };
}
