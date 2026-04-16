/**
 * Servicio de empresas — M01 Onboarding Lite.
 *
 * CRUD de cs_companies + cs_company_contacts vía Supabase.
 * En Fase 1 el admin da de alta clientes directamente.
 */

import { supabase } from '@/lib/supabase';
import type {
  Company,
  CompanyContact,
  CompanySummary,
  CreateCompanyInput,
} from '../types/company.types';

// ─── Normalización ───────────────────────────────────────────────────

function normalizeRfc(rfc: string): string {
  return rfc.trim().toUpperCase().replace(/\s/g, '');
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function getCompanies(): Promise<CompanySummary[]> {
  const { data, error } = await supabase
    .from('cs_companies_summary')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching companies: ${error.message}`);
  return (data ?? []) as unknown as CompanySummary[];
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('cs_companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Error fetching company: ${error.message}`);
  }
  return data as unknown as Company;
}

export async function getCompanyContacts(companyId: string): Promise<CompanyContact[]> {
  const { data, error } = await supabase
    .from('cs_company_contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('is_primary', { ascending: false });

  if (error) throw new Error(`Error fetching contacts: ${error.message}`);
  return (data ?? []) as unknown as CompanyContact[];
}

export async function findCompanyByRfc(rfc: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('cs_companies')
    .select('*')
    .eq('rfc', normalizeRfc(rfc))
    .eq('tenant_id', 'xending')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error searching company: ${error.message}`);
  }
  return data as unknown as Company;
}

// ─── Mutations ───────────────────────────────────────────────────────

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const rfc = normalizeRfc(input.rfc);

  // Check if RFC already exists
  const existing = await findCompanyByRfc(rfc);
  if (existing) {
    throw new Error(`Ya existe una empresa con RFC ${rfc}`);
  }

  // Insert company
  const { data: company, error: companyError } = await supabase
    .from('cs_companies')
    .insert({
      rfc,
      legal_name: input.legal_name.trim(),
      trade_name: input.trade_name?.trim() || null,
      business_activity: input.business_activity,
      tenant_id: 'xending',
    })
    .select()
    .single();

  if (companyError) throw new Error(`Error creating company: ${companyError.message}`);
  if (!company) throw new Error('Company not found');

  const companyId = company.id as string;

  // Insert primary email contact
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

  if (input.contact_phone?.trim()) {
    contacts.push({
      company_id: companyId,
      contact_type: 'phone',
      contact_value: input.contact_phone.trim(),
      contact_name: input.contact_name?.trim() || null,
      is_primary: true,
    });
  }

  const { error: contactError } = await supabase
    .from('cs_company_contacts')
    .insert(contacts);

  if (contactError) {
    // Rollback: delete company if contacts fail
    await supabase.from('cs_companies').delete().eq('id', companyId);
    throw new Error(`Error creating contacts: ${contactError.message}`);
  }

  return company as unknown as Company;
}

export async function updateCompanyStatus(
  id: string,
  status: Company['status'],
): Promise<void> {
  const { error } = await supabase
    .from('cs_companies')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`Error updating status: ${error.message}`);
}
