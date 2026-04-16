/**
 * Servicio de empresas FX — Transacciones FX (Xending Capital).
 *
 * CRUD de cs_companies + cs_companies_owners + cs_company_payment_accounts vía Supabase.
 * Extiende el modelo de empresas con campos específicos para FX:
 * dirección fiscal, cuentas CLABE y relación broker-empresa.
 */

import { supabase } from '@/lib/supabase';
import type {
  CompanyFX,
  CreateCompanyFXInput,
  PaymentAccount,
} from '../types/company-fx.types';

// ─── Normalización ───────────────────────────────────────────────────

function normalizeRfc(rfc: string): string {
  return rfc.trim().toUpperCase().replace(/\s/g, '');
}

// ─── Queries ─────────────────────────────────────────────────────────

/**
 * Lista todas las empresas FX con nombre del owner y datos agregados de transacciones.
 * Req 4.1, 4.2
 */
export async function getCompaniesFX(): Promise<CompanyFX[]> {
  // Get current user for role-based filtering
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role || user?.user_metadata?.role || 'broker';
  const userId = user?.id;

  // For brokers, first get their company IDs from cs_companies_owners
  let brokerCompanyIds: string[] | null = null;
  if (role === 'broker' && userId) {
    const { data: ownerships } = await supabase
      .from('cs_companies_owners')
      .select('company_id')
      .eq('user_id', userId);

    brokerCompanyIds = (ownerships as unknown as Array<{ company_id: string }>)?.map((o) => o.company_id) ?? [];
    if (brokerCompanyIds.length === 0) return [];
  }

  // Query companies
  let companyQuery = supabase
    .from('cs_companies')
    .select('*')
    .eq('tenant_id', 'xending')
    .order('created_at', { ascending: false });

  // Broker: only their companies
  if (brokerCompanyIds) {
    companyQuery = companyQuery.in('id', brokerCompanyIds);
  }

  const { data: companies, error: companiesError } = await companyQuery;

  if (companiesError) throw new Error(`Error fetching companies: ${companiesError.message}`);
  if (!companies || (companies as unknown as unknown[]).length === 0) return [];

  const companyList = companies as unknown as Array<Record<string, unknown>>;
  const companyIds = companyList.map((c) => c.id as string);

  // Fetch owners (table may not exist yet in local dev)
  const ownerMap = new Map<string, string>();
  const { data: owners, error: ownersError } = await supabase
    .from('cs_companies_owners')
    .select('company_id, user_id')
    .in('company_id', companyIds);

  const ownerList = (owners ?? []) as unknown as Array<{ company_id: string; user_id: string }>;
  if (!ownersError && ownerList.length > 0) {
    // Resolve user IDs to names via local_users
    const userIds = [...new Set(ownerList.map((o) => o.user_id).filter(Boolean))];
    const userNameMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('local_users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (users) {
        for (const u of users as unknown as Array<{ id: string; full_name: string; email: string }>) {
          userNameMap.set(u.id, u.full_name || u.email || u.id);
        }
      }
    }

    for (const owner of ownerList) {
      ownerMap.set(owner.company_id, userNameMap.get(owner.user_id) ?? owner.user_id ?? 'Sin asignar');
    }
  }

  // Fetch aggregated transaction data per company (table may not exist yet)
  const txMap = new Map<string, { total_quantity: number; last_transaction_at: string | null }>();
  const { data: txAggregates, error: txError } = await supabase
    .from('fx_transactions')
    .select('company_id, quantity, created_at, cancelled')
    .in('company_id', companyIds)
    .eq('cancelled', false)
    .order('created_at', { ascending: false });

  if (!txError && txAggregates) {
    for (const tx of txAggregates as unknown as Array<{ company_id: string; quantity: number; created_at: string }>) {
      const existing = txMap.get(tx.company_id);
      if (existing) {
        existing.total_quantity += Number(tx.quantity);
      } else {
        txMap.set(tx.company_id, {
          total_quantity: Number(tx.quantity),
          last_transaction_at: tx.created_at,
        });
      }
    }
  }

  // Merge all data
  return companyList.map((company) => ({
    ...company,
    owner_name: ownerMap.get(company.id as string) ?? 'Sin asignar',
    total_quantity: txMap.get(company.id as string)?.total_quantity ?? 0,
    last_transaction_at: txMap.get(company.id as string)?.last_transaction_at ?? null,
  })) as CompanyFX[];
}

/**
 * Obtiene una empresa FX por ID con sus cuentas de pago incluidas.
 * Req 1.6, 2.1
 */
export async function getCompanyFXById(id: string): Promise<CompanyFX | null> {
  const { data: company, error: companyError } = await supabase
    .from('cs_companies')
    .select('*')
    .eq('id', id)
    .single();

  if (companyError) {
    if (companyError.code === 'PGRST116') return null; // not found
    throw new Error(`Error fetching company: ${companyError.message}`);
  }

  // Fetch payment accounts (table may not exist yet in local dev)
  const { data: accounts, error: accountsError } = await supabase
    .from('cs_company_payment_accounts')
    .select('*')
    .eq('company_id', id)
    .eq('deleted', false)
    .order('is_primary', { ascending: false });

  // Fetch primary contact (email + name)
  let contactEmail = '';
  let contactName = '';
  const { data: contacts } = await supabase
    .from('cs_company_contacts')
    .select('contact_type, contact_value, contact_name, is_primary')
    .eq('company_id', id)
    .eq('contact_type', 'email')
    .eq('is_primary', true);

  if (contacts) {
    const primary = (contacts as unknown as Array<{ contact_value: string; contact_name: string | null }>)[0];
    if (primary) {
      contactEmail = primary.contact_value ?? '';
      contactName = primary.contact_name ?? '';
    }
  }

  return {
    ...company,
    payment_accounts: (!accountsError && accounts ? accounts : []) as PaymentAccount[],
    contact_email: contactEmail,
    contact_name: contactName,
  } as CompanyFX;
}

/**
 * Busca empresas por razón social o RFC, excluyendo empresas deshabilitadas.
 * Req 5.1, 5.2, 5.3, 4.3
 */
export async function searchCompanies(query: string): Promise<CompanyFX[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Get current user for role-based filtering
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role || user?.user_metadata?.role || 'broker';
  const userId = user?.id;

  // For brokers, restrict to their companies
  let allowedIds: string[] | null = null;
  if (role === 'broker' && userId) {
    const { data: ownerships } = await supabase
      .from('cs_companies_owners')
      .select('company_id')
      .eq('user_id', userId);
    allowedIds = (ownerships as unknown as Array<{ company_id: string }>)?.map((o) => o.company_id) ?? [];
    if (allowedIds.length === 0) return [];
  }

  const normalizedQuery = trimmed.toUpperCase();

  let searchQuery = supabase
    .from('cs_companies')
    .select('*')
    .eq('tenant_id', 'xending')
    .neq('status', 'inactive')
    .or(`legal_name.ilike.%${trimmed}%,rfc.ilike.%${normalizedQuery}%`)
    .order('legal_name', { ascending: true })
    .limit(20);

  if (allowedIds) {
    searchQuery = searchQuery.in('id', allowedIds);
  }

  const { data, error } = await searchQuery;

  if (error) throw new Error(`Error searching companies: ${error.message}`);
  return (data ?? []) as CompanyFX[];
}

// ─── Mutations ───────────────────────────────────────────────────────

/**
 * Crea una empresa FX con relación de propiedad y cuentas de pago.
 * Inserta en cs_companies, cs_companies_owners y cs_company_payment_accounts.
 * Rollback si falla la inserción de cuentas de pago.
 * Req 1.1, 1.5, 1.6
 */
export async function createCompanyFX(
  input: CreateCompanyFXInput,
  userId: string,
): Promise<CompanyFX> {
  const rfc = normalizeRfc(input.rfc);

  // Check for duplicate RFC
  const { data: existing, error: checkError } = await supabase
    .from('cs_companies')
    .select('id')
    .eq('rfc', rfc)
    .eq('tenant_id', 'xending')
    .maybeSingle();

  if (checkError) throw new Error(`Error checking RFC: ${checkError.message}`);
  if (existing) throw new Error(`Ya existe una empresa con RFC ${rfc}`);

  // Insert company
  const { data: company, error: companyError } = await supabase
    .from('cs_companies')
    .insert({
      rfc,
      legal_name: input.legal_name.trim(),
      trade_name: input.trade_name?.trim() || null,
      business_activity: input.business_activity,
      address: input.address,
      metadata: input.phone ? { phone: input.phone } : {},
      tenant_id: 'xending',
    })
    .select()
    .single();

  if (companyError) throw new Error(`Error creating company: ${companyError.message}`);
  if (!company) throw new Error('Company not found');

  const companyId = company.id as string;

  // Insert owner relationship
  const { error: ownerError } = await supabase
    .from('cs_companies_owners')
    .insert({
      company_id: companyId,
      user_id: userId,
    });

  if (ownerError) {
    // Rollback: delete company
    await supabase.from('cs_companies').delete().eq('id', companyId);
    throw new Error(`Error creating owner relationship: ${ownerError.message}`);
  }

  // Insert payment accounts
  if (input.payment_accounts.length > 0) {
    const accounts = input.payment_accounts.map((acc, index) => ({
      company_id: companyId,
      clabe: acc.clabe.replace(/[^0-9]/g, ''), // Store raw digits
      bank_name: acc.bank_name || null,
      currency: acc.currency || 'USD',
      is_primary: index === 0,
    }));

    const { error: accountsError } = await supabase
      .from('cs_company_payment_accounts')
      .insert(accounts);

    if (accountsError) {
      // Rollback: delete owner and company
      await supabase.from('cs_companies_owners').delete().eq('company_id', companyId);
      await supabase.from('cs_companies').delete().eq('id', companyId);
      throw new Error(`Error creating payment accounts: ${accountsError.message}`);
    }
  }

  // Insert contacts if provided
  if (input.contact_email) {
    const contacts: Array<{
      company_id: string;
      contact_type: string;
      contact_value: string;
      contact_name: string | null;
      is_primary: boolean;
    }> = [
      {
        company_id: companyId,
        contact_type: 'email',
        contact_value: input.contact_email.trim().toLowerCase(),
        contact_name: input.contact_name?.trim() || null,
        is_primary: true,
      },
    ];

    await supabase.from('cs_company_contacts').insert(contacts);
  }

  // Return the created company with payment accounts
  return getCompanyFXById(companyId) as Promise<CompanyFX>;
}

/**
 * Actualiza los campos de una empresa FX.
 * El trigger de archive se ejecuta automáticamente en el UPDATE.
 * Req 2.1, 2.2
 */
export async function updateCompanyFX(
  id: string,
  input: Partial<CreateCompanyFXInput>,
): Promise<CompanyFX> {
  const updateData: Record<string, unknown> = {};

  if (input.rfc !== undefined) updateData.rfc = normalizeRfc(input.rfc);
  if (input.legal_name !== undefined) updateData.legal_name = input.legal_name.trim();
  if (input.trade_name !== undefined) updateData.trade_name = input.trade_name?.trim() || null;
  if (input.business_activity !== undefined) updateData.business_activity = input.business_activity;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.phone !== undefined) {
    // Merge phone into existing metadata
    const { data: current } = await supabase
      .from('cs_companies')
      .select('metadata')
      .eq('id', id)
      .single();

    const existingMeta = (current?.metadata as Record<string, unknown>) ?? {};
    updateData.metadata = { ...existingMeta, phone: input.phone };
  }

  if (Object.keys(updateData).length === 0) {
    const company = await getCompanyFXById(id);
    if (!company) throw new Error('Company not found');
    return company;
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('cs_companies')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`Error updating company: ${error.message}`);

  // Update payment accounts if provided
  if (input.payment_accounts !== undefined) {
    // Delete existing accounts and re-insert
    await supabase
      .from('cs_company_payment_accounts')
      .delete()
      .eq('company_id', id);

    if (input.payment_accounts.length > 0) {
      const accounts = input.payment_accounts.map((acc, index) => ({
        company_id: id,
        clabe: acc.clabe.replace(/[^0-9]/g, ''),
        bank_name: acc.bank_name || null,
        currency: acc.currency || 'USD',
        is_primary: index === 0,
      }));

      const { error: accountsError } = await supabase
        .from('cs_company_payment_accounts')
        .insert(accounts);

      if (accountsError) throw new Error(`Error updating payment accounts: ${accountsError.message}`);
    }
  }

  // Update contact email/name if provided
  if (input.contact_email !== undefined) {
    // Delete existing primary email contact and re-insert
    await supabase
      .from('cs_company_contacts')
      .delete()
      .eq('company_id', id)
      .eq('contact_type', 'email')
      .eq('is_primary', true);

    await supabase
      .from('cs_company_contacts')
      .insert({
        company_id: id,
        contact_type: 'email',
        contact_value: input.contact_email.trim().toLowerCase(),
        contact_name: input.contact_name?.trim() || null,
        is_primary: true,
      });
  }

  const updated = await getCompanyFXById(id);
  if (!updated) throw new Error('Company not found after update');
  return updated;
}

/**
 * Deshabilita o habilita una empresa cambiando su status.
 * Solo el administrador puede ejecutar esta acción.
 * Req 4.3, 4.6, 11.4, 11.6
 */
export async function toggleCompanyStatus(
  id: string,
  disabled: boolean,
): Promise<void> {
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
    throw new Error('Permisos insuficientes: solo el administrador puede deshabilitar empresas');
  }

  const status = disabled ? 'inactive' : 'active';

  const { error } = await supabase
    .from('cs_companies')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error toggling company status: ${error.message}`);
}

/**
 * Retorna el historial de archivo de una empresa, ordenado por fecha descendente.
 * Req 3.4
 */
export async function getCompanyArchive(
  companyId: string,
): Promise<Array<{
  id: string;
  original_id: string;
  full_record: Record<string, unknown>;
  archived_by: string;
  archived_at: string;
}>> {
  const { data, error } = await supabase
    .from('archive.cs_companies')
    .select('*')
    .eq('original_id', companyId)
    .order('archived_at', { ascending: false });

  if (error) throw new Error(`Error fetching company archive: ${error.message}`);
  return (data ?? []) as unknown as Array<{
    id: string;
    original_id: string;
    full_record: Record<string, unknown>;
    archived_by: string;
    archived_at: string;
  }>;
}
