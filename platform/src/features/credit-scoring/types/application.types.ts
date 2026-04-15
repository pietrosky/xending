// Tipos para solicitudes de crédito

export type Currency = 'MXN' | 'USD';

export type ApplicationStatus =
  | 'pending_scoring'
  | 'scoring_in_progress'
  | 'scored'
  | 'approved'
  | 'conditional'
  | 'committee'
  | 'rejected';

export type DecisionType = 'approved' | 'conditional' | 'committee' | 'rejected';

export interface CreditApplication {
  id: string;
  rfc: string;
  company_name: string;
  requested_amount: number;
  term_months: number;
  currency: Currency;
  status: ApplicationStatus;
  scoring_version?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ApplicationStatusLog {
  id: string;
  application_id: string;
  old_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  changed_by?: string;
  reason?: string;
  created_at: string;
}

export interface ScoringResult {
  application_id: string;
  gate1_result: 'pass' | 'hard_stop';
  gate1_flags: import('./engine.types').RiskFlag[];
  gate2_semaphores: Record<string, 'green' | 'yellow' | 'red'>;
  gate3_score: number;
  gate3_breakdown: Record<string, number>;
  final_decision: DecisionType;
  credit_limit: number;
  binding_constraint: string;
  review_frequency: string;
  covenants: string[];
  ai_narrative: string;
}

export interface NewApplicationData {
  rfc: string;
  company_name: string;
  requested_amount: number;
  term_months: number | null;
  currency: Currency;
}
