/**
 * Tipos para M01 Onboarding Lite — Alta de empresas por admin.
 */

// ─── Company ─────────────────────────────────────────────────────────

export type CompanyStatus = 'active' | 'inactive' | 'blacklisted';

export interface Company {
  id: string;
  tenant_id: string;
  rfc: string;
  legal_name: string;
  trade_name: string | null;
  business_activity: string | null;
  tax_regime: string | null;
  incorporation_date: string | null;
  address: CompanyAddress;
  syntage_entity_id: string | null;
  scory_entity_id: string | null;
  status: CompanyStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ─── Contacts ────────────────────────────────────────────────────────

export type ContactType = 'email' | 'phone' | 'legal_rep' | 'admin' | 'billing';

export interface CompanyContact {
  id: string;
  company_id: string;
  contact_type: ContactType;
  contact_value: string;
  contact_name: string | null;
  is_primary: boolean;
  created_at: string;
}

// ─── Summary view ────────────────────────────────────────────────────

export interface CompanySummary {
  id: string;
  tenant_id: string;
  rfc: string;
  legal_name: string;
  trade_name: string | null;
  business_activity: string | null;
  status: CompanyStatus;
  primary_email: string | null;
  primary_phone: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Form input (lo que el admin llena) ──────────────────────────────

export interface CreateCompanyInput {
  rfc: string;
  legal_name: string;
  trade_name?: string;
  business_activity: string;
  contact_email: string;
  contact_phone?: string;
  contact_name?: string;
}

// ─── Business activities catalog ─────────────────────────────────────

export const BUSINESS_ACTIVITIES = [
  { value: 'comercio_internacional', label: 'Comercio internacional (importación/exportación)' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'servicios_profesionales', label: 'Servicios profesionales' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'agroindustria', label: 'Agroindustria' },
  { value: 'transporte_logistica', label: 'Transporte y logística' },
  { value: 'comercio_mayoreo', label: 'Comercio al por mayor' },
  { value: 'comercio_menudeo', label: 'Comercio al por menor' },
  { value: 'alimentos_bebidas', label: 'Alimentos y bebidas' },
  { value: 'textil_confeccion', label: 'Textil y confección' },
  { value: 'quimicos_farmaceuticos', label: 'Químicos y farmacéuticos' },
  { value: 'energia', label: 'Energía' },
  { value: 'otro', label: 'Otro' },
] as const;
