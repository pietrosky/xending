export interface PaymentInstructionAccount {
  id: string;
  account_number: string;
  account_name: string;
  swift_code: string | null;
  bank_name: string;
  bank_address: string;
  currency_types: string[];
  is_active: boolean;
  created_at: string;
  created_by: string;
  disabled_at: string | null;
  disabled_by: string | null;
}

export interface CreateAccountInput {
  account_number: string;
  account_name: string;
  swift_code?: string;
  bank_name: string;
  bank_address: string;
  currency_types: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
