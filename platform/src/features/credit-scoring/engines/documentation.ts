import type {
  EngineInput,
  EngineOutput,
  ModuleGrade,
  ModuleStatus,
  RiskFlag,
  MetricValue,
  BenchmarkComparison,
} from '../types/engine.types';

// --- Constants ---

const ENGINE_NAME = 'documentation';

/** Required document types for a complete application */
const REQUIRED_DOCUMENT_TYPES = [
  'acta_constitutiva',
  'poder',
  'ine',
  'comprobante_domicilio',
  'estados_financieros',
  'declaraciones',
] as const;

/** Documents that block further evaluation if missing */
const BLOCKING_DOCUMENT_TYPES = new Set(['acta_constitutiva', 'ine']);

/** Statuses that count as "present" for completeness */
const PRESENT_STATUSES = new Set(['uploaded', 'validated']);

/** Days threshold for "expiring soon" warning */
const EXPIRING_SOON_DAYS = 30;

/** Sub-score weights */
const SUB_WEIGHTS = {
  completeness: 0.40,
  validation_quality: 0.30,
  expiration_status: 0.30,
};

// --- Interfaces ---

export type DocumentStatus = 'pending' | 'uploaded' | 'validated' | 'rejected' | 'expired';
export type ValidationResult = 'pass' | 'fail' | 'warning';

export interface DocumentRecord {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string | null;
  file_url: string | null;
  status: DocumentStatus;
  is_required: boolean;
  is_blocking: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface DocumentValidation {
  id: string;
  document_id: string;
  validation_type: string;
  result: ValidationResult;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DocumentationInput {
  documents: DocumentRecord[];
  validations: DocumentValidation[];
}

// --- Sub-score calculators (exported for testability) ---

/**
 * Calculate completeness sub-score.
 * % of required document types that have at least one document with status uploaded or validated.
 */
export function calcCompletenessScore(documents: DocumentRecord[]): {
  score: number;
  total_required: number;
  present_count: number;
  missing_types: string[];
} {
  const presentTypes = new Set(
    documents
      .filter((d) => d.is_required && PRESENT_STATUSES.has(d.status))
      .map((d) => d.document_type),
  );

  const total_required = REQUIRED_DOCUMENT_TYPES.length;
  const present_count = REQUIRED_DOCUMENT_TYPES.filter((t) => presentTypes.has(t)).length;
  const missing_types = REQUIRED_DOCUMENT_TYPES.filter((t) => !presentTypes.has(t));

  const score = total_required > 0
    ? Math.round((present_count / total_required) * 100)
    : 0;

  return { score, total_required, present_count, missing_types };
}

/**
 * Calculate validation quality sub-score.
 * % of validations that pass.
 */
export function calcValidationQualityScore(validations: DocumentValidation[]): {
  score: number;
  total: number;
  passed: number;
  failed: number;
  warnings: number;
} {
  if (validations.length === 0) {
    return { score: 50, total: 0, passed: 0, failed: 0, warnings: 0 };
  }

  const passed = validations.filter((v) => v.result === 'pass').length;
  const failed = validations.filter((v) => v.result === 'fail').length;
  const warnings = validations.filter((v) => v.result === 'warning').length;
  const total = validations.length;

  const score = Math.round((passed / total) * 100);

  return { score, total, passed, failed, warnings };
}

/**
 * Calculate expiration status sub-score.
 * 100 if no expired/expiring docs, penalized for expired or expiring soon.
 */
export function calcExpirationScore(
  documents: DocumentRecord[],
  referenceDate: Date = new Date(),
): {
  score: number;
  expired_count: number;
  expiring_soon_count: number;
  valid_count: number;
} {
  const docsWithExpiry = documents.filter((d) => d.expires_at !== null);

  if (docsWithExpiry.length === 0) {
    return { score: 100, expired_count: 0, expiring_soon_count: 0, valid_count: 0 };
  }

  let expired_count = 0;
  let expiring_soon_count = 0;
  let valid_count = 0;

  const soonThreshold = new Date(referenceDate);
  soonThreshold.setDate(soonThreshold.getDate() + EXPIRING_SOON_DAYS);

  for (const doc of docsWithExpiry) {
    const expiryDate = new Date(doc.expires_at as string);
    if (expiryDate <= referenceDate) {
      expired_count++;
    } else if (expiryDate <= soonThreshold) {
      expiring_soon_count++;
    } else {
      valid_count++;
    }
  }

  const total = docsWithExpiry.length;
  // Expired docs penalize heavily (-40 each), expiring soon penalize moderately (-15 each)
  const penalty = (expired_count * 40 + expiring_soon_count * 15);
  const score = Math.max(0, Math.min(100, 100 - Math.round((penalty / total) * (total > 0 ? 1 : 0))));

  return { score, expired_count, expiring_soon_count, valid_count };
}

/**
 * Check if any blocking documents are missing.
 */
export function hasBlockingDocumentsMissing(documents: DocumentRecord[]): {
  blocked: boolean;
  missing_blocking: string[];
} {
  const presentBlockingTypes = new Set(
    documents
      .filter((d) => BLOCKING_DOCUMENT_TYPES.has(d.document_type) && PRESENT_STATUSES.has(d.status))
      .map((d) => d.document_type),
  );

  const missing_blocking = [...BLOCKING_DOCUMENT_TYPES].filter((t) => !presentBlockingTypes.has(t));

  return {
    blocked: missing_blocking.length > 0,
    missing_blocking,
  };
}

// --- Risk flag generation ---

export function generateRiskFlags(
  completeness: ReturnType<typeof calcCompletenessScore>,
  _validationQuality: ReturnType<typeof calcValidationQualityScore>,
  expiration: ReturnType<typeof calcExpirationScore>,
  blockingCheck: ReturnType<typeof hasBlockingDocumentsMissing>,
  validations: DocumentValidation[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Blocking documents missing
  if (blockingCheck.blocked) {
    for (const docType of blockingCheck.missing_blocking) {
      flags.push({
        code: 'blocking_document_missing',
        severity: 'hard_stop',
        message: `Blocking document missing: ${docType}`,
        source_metric: docType,
      });
    }
  }

  // Missing required (non-blocking) documents
  const nonBlockingMissing = completeness.missing_types.filter(
    (t) => !BLOCKING_DOCUMENT_TYPES.has(t),
  );
  for (const docType of nonBlockingMissing) {
    flags.push({
      code: 'missing_required_document',
      severity: 'warning',
      message: `Required document missing: ${docType}`,
      source_metric: docType,
    });
  }

  // Rejected documents
  const rejectedValidations = validations.filter((v) => v.result === 'fail');
  if (rejectedValidations.length > 0) {
    flags.push({
      code: 'document_rejected',
      severity: 'critical',
      message: `${rejectedValidations.length} document validation(s) failed`,
      value: rejectedValidations.length,
    });
  }

  // OCR validation failures
  const ocrFailures = validations.filter(
    (v) => v.validation_type === 'ocr' && v.result === 'fail',
  );
  if (ocrFailures.length > 0) {
    flags.push({
      code: 'ocr_validation_failed',
      severity: 'warning',
      message: `${ocrFailures.length} OCR validation(s) failed`,
      value: ocrFailures.length,
    });
  }

  // Expired documents
  if (expiration.expired_count > 0) {
    flags.push({
      code: 'document_expired',
      severity: 'critical',
      message: `${expiration.expired_count} document(s) expired`,
      value: expiration.expired_count,
    });
  }

  // Expiring soon
  if (expiration.expiring_soon_count > 0) {
    flags.push({
      code: 'document_expiring_soon',
      severity: 'warning',
      message: `${expiration.expiring_soon_count} document(s) expiring within ${EXPIRING_SOON_DAYS} days`,
      value: expiration.expiring_soon_count,
    });
  }

  return flags;
}

// --- Score helpers ---

function scoreToGrade(score: number): ModuleGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  if (flags.some((f) => f.severity === 'hard_stop')) return 'blocked';
  if (score < 40) return 'fail';
  if (score < 70 || flags.some((f) => f.severity === 'critical')) return 'warning';
  return 'pass';
}

// --- Key metrics builder ---

function buildKeyMetrics(
  completeness: ReturnType<typeof calcCompletenessScore>,
  validationQuality: ReturnType<typeof calcValidationQualityScore>,
  expiration: ReturnType<typeof calcExpirationScore>,
): Record<string, MetricValue> {
  return {
    completeness_pct: {
      name: 'completeness_pct',
      label: 'Document Completeness',
      value: completeness.score,
      unit: '%',
      source: 'cs_documents',
      interpretation: completeness.score >= 100
        ? 'All required documents present'
        : `${completeness.missing_types.length} required document(s) missing`,
      impact_on_score: completeness.score >= 80 ? 'positive' : 'negative',
    },
    validation_pass_rate: {
      name: 'validation_pass_rate',
      label: 'Validation Pass Rate',
      value: validationQuality.score,
      unit: '%',
      source: 'cs_document_validations',
      interpretation: validationQuality.total === 0
        ? 'No validations performed yet'
        : `${validationQuality.passed}/${validationQuality.total} validations passed`,
      impact_on_score: validationQuality.score >= 80 ? 'positive' : 'negative',
    },
    expired_documents: {
      name: 'expired_documents',
      label: 'Expired Documents',
      value: expiration.expired_count,
      unit: 'count',
      source: 'cs_documents',
      interpretation: expiration.expired_count === 0
        ? 'No expired documents'
        : `${expiration.expired_count} document(s) have expired`,
      impact_on_score: expiration.expired_count === 0 ? 'positive' : 'negative',
    },
    expiring_soon_documents: {
      name: 'expiring_soon_documents',
      label: 'Documents Expiring Soon',
      value: expiration.expiring_soon_count,
      unit: 'count',
      source: 'cs_documents',
      interpretation: expiration.expiring_soon_count === 0
        ? 'No documents expiring soon'
        : `${expiration.expiring_soon_count} document(s) expiring within ${EXPIRING_SOON_DAYS} days`,
      impact_on_score: expiration.expiring_soon_count === 0 ? 'neutral' : 'negative',
    },
  };
}

// --- Benchmark builder ---

function buildBenchmarks(
  completeness: ReturnType<typeof calcCompletenessScore>,
  validationQuality: ReturnType<typeof calcValidationQualityScore>,
): Record<string, BenchmarkComparison> {
  return {
    completeness: {
      metric: 'completeness_pct',
      applicant_value: completeness.score,
      benchmark_value: 100,
      deviation_percent: completeness.score - 100,
      status: completeness.score >= 100 ? 'at' : 'below',
    },
    validation_pass_rate: {
      metric: 'validation_pass_rate',
      applicant_value: validationQuality.score,
      benchmark_value: 90,
      deviation_percent: validationQuality.total > 0
        ? Math.round(((validationQuality.score - 90) / 90) * 100)
        : 0,
      status: validationQuality.score >= 90 ? 'above' : 'below',
    },
  };
}

// --- Explanation & actions ---

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const parts: string[] = [
    `Documentation engine score: ${score}/100 (Grade ${grade}).`,
  ];

  const hardStops = flags.filter((f) => f.severity === 'hard_stop');
  if (hardStops.length > 0) {
    parts.push(`BLOCKED: ${hardStops.map((f) => f.message).join('; ')}.`);
  }

  const criticals = flags.filter((f) => f.severity === 'critical');
  if (criticals.length > 0) {
    parts.push(`Critical issues: ${criticals.map((f) => f.message).join('; ')}.`);
  }

  const warnings = flags.filter((f) => f.severity === 'warning');
  if (warnings.length > 0) {
    parts.push(`Warnings: ${warnings.map((f) => f.message).join('; ')}.`);
  }

  if (flags.length === 0) {
    parts.push('All documents complete, validated, and current.');
  }

  return parts.join(' ');
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  if (flags.length === 0) return [];

  const actions: string[] = [];

  if (flags.some((f) => f.code === 'blocking_document_missing')) {
    actions.push('Upload missing blocking documents before proceeding');
  }
  if (flags.some((f) => f.code === 'missing_required_document')) {
    actions.push('Upload remaining required documents to improve completeness');
  }
  if (flags.some((f) => f.code === 'document_rejected')) {
    actions.push('Re-upload rejected documents with correct format');
  }
  if (flags.some((f) => f.code === 'ocr_validation_failed')) {
    actions.push('Re-upload documents with better image quality for OCR');
  }
  if (flags.some((f) => f.code === 'document_expired')) {
    actions.push('Replace expired documents with current versions');
  }
  if (flags.some((f) => f.code === 'document_expiring_soon')) {
    actions.push('Plan renewal for documents expiring soon');
  }

  return actions;
}

// --- Public API ---

/**
 * Run the Documentation Engine.
 *
 * Analyzes document completeness, validation quality, and expiration status.
 * Sub-scores: completeness (40%), validation_quality (30%), expiration_status (30%).
 * No trends — documentation is a point-in-time check.
 */
export async function runDocumentationEngine(input: EngineInput): Promise<EngineOutput> {
  const docData = input.documents as DocumentationInput | undefined;

  if (!docData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_documentation_data',
        severity: 'critical',
        message: 'No documentation data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Documentation engine blocked: no document data provided.',
      recommended_actions: ['Ensure document data is loaded before running documentation engine'],
      created_at: new Date().toISOString(),
    };
  }

  const { documents, validations } = docData;

  // Calculate sub-scores
  const completeness = calcCompletenessScore(documents);
  const validationQuality = calcValidationQualityScore(validations);
  const expiration = calcExpirationScore(documents);
  const blockingCheck = hasBlockingDocumentsMissing(documents);

  // Weighted final score
  const rawScore =
    completeness.score * SUB_WEIGHTS.completeness +
    validationQuality.score * SUB_WEIGHTS.validation_quality +
    expiration.score * SUB_WEIGHTS.expiration_status;

  const finalScore = Math.round(Math.min(100, rawScore));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags(
    completeness,
    validationQuality,
    expiration,
    blockingCheck,
    validations,
  );

  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics(completeness, validationQuality, expiration),
    benchmark_comparison: buildBenchmarks(completeness, validationQuality),
    trends: [], // No trends for documentation — point-in-time check
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
