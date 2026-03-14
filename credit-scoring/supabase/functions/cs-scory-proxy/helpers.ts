// Pure helper functions extracted for testability.
// These are also used by index.ts.

export type ComplianceStatus = 'pass' | 'fail' | 'hard_stop';
export type FlagSeverity = 'info' | 'warning' | 'critical' | 'hard_stop';

export interface ComplianceCheck {
  check_type: string;
  result: 'pass' | 'fail' | 'review_required';
  details: Record<string, unknown>;
}

export interface RiskFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  risk_flags: RiskFlag[];
  explanation: string;
  manual_override: boolean;
}

/** Exponential backoff delay: 1s, 2s, 4s */
export function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

/** Validate RFC format (Mexican tax ID: 12-13 alphanumeric chars) */
export function isValidRfc(rfc: string): boolean {
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc);
}

/** Fallback result when Scory API is unavailable */
export function makeFallbackResult(rfc: string, errorMessage: string): ComplianceResult {
  return {
    status: 'fail',
    checks: [],
    risk_flags: [
      {
        code: 'scory_api_unavailable',
        severity: 'critical',
        message: `Scory API unavailable for RFC ${rfc}: ${errorMessage}`,
      },
    ],
    explanation: `Compliance validation could not be completed. Manual review required. Error: ${errorMessage}`,
    manual_override: true,
  };
}
