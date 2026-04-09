import type { Company, CompanyAddress } from '../../onboarding/types/company.types';

export interface PaymentAccount {
  id: string;
  company_id: string;
  clabe: string;
  bank_name: string | null;
  is_primary: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface CompanyFX extends Company {
  payment_accounts?: PaymentAccount[];
  contact_email?: string;
  contact_name?: string;
  owner_name?: string;
  total_buys_usd?: number;
  last_transaction_at?: string;
}

export interface CreateCompanyFXInput {
  rfc: string;
  legal_name: string;
  trade_name?: string;
  business_activity: string;
  phone?: string;
  address: CompanyAddress;
  payment_accounts: Array<{ clabe: string; bank_name?: string }>;
  contact_email: string;
  contact_name?: string;
}
