export type TransactionStatus = 'pending' | 'authorized' | 'completed';
export type FXCurrency = 'USD' | 'MXN';

export interface FXTransaction {
  id: string;
  folio: string;
  company_id: string;
  buys_currency: FXCurrency;
  buys_usd: number;
  base_rate: number;
  markup_rate: number;
  exchange_rate: number;
  pays_currency: FXCurrency;
  pays_mxn: number;
  status: TransactionStatus;
  payment_account_id: string | null;
  created_by: string;
  authorized_by: string | null;
  authorized_at: string | null;
  proof_url: string | null;
  cancelled: boolean;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FXTransactionSummary extends FXTransaction {
  company_legal_name: string;
  company_rfc: string;
  broker_name: string | null;
  authorized_by_name: string | null;
}

export interface CreateTransactionInput {
  company_id: string;
  payment_account_id: string;
  buys_currency: FXCurrency;
  buys_usd: number;
  base_rate: number;
  markup_rate: number;
  exchange_rate: number;
  pays_currency: FXCurrency;
}
