import { describe, it, expect } from 'vitest';
import type { EngineInput, PolicyConfig } from '../types/engine.types';
import {
  calcCompletenessScore,
  calcValidationQualityScore,
  calcExpirationScore,
  hasBlockingDocumentsMissing,
  generateRiskFlags,
  runDocumentationEngine,
} from './documentation';
import type {
  DocumentRecord,
  DocumentValidation,
  DocumentationInput,
} from './documentation';

// ============================================================
// Test helpers
// ============================================================

const POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'doc-1',
    application_id: 'app-001',
    document_type: 'acta_constitutiva',
    file_name: 'acta.pdf',
    file_url: '/files/acta.pdf',
    status: 'validated',
    is_required: true,
    is_blocking: true,
    expires_at: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeValidation(overrides: Partial<DocumentValidation> = {}): DocumentValidation {
  return {
    id: 'val-1',
    document_id: 'doc-1',
    validation_type: 'format',
    result: 'pass',
    details: {},
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAllRequiredDocuments(): DocumentRecord[] {
  return [
    makeDocument({ id: 'd1', document_type: 'acta_constitutiva', is_blocking: true }),
    makeDocument({ id: 'd2', document_type: 'poder', is_blocking: false }),
    makeDocument({ id: 'd3', document_type: 'ine', is_blocking: true }),
    makeDocument({ id: 'd4', document_type: 'comprobante_domicilio', is_blocking: false }),
    makeDocument({ id: 'd5', document_type: 'estados_financieros', is_blocking: false }),
    makeDocument({ id: 'd6', document_type: 'declaraciones', is_blocking: false }),
  ];
}

function makeDocInput(overrides: Partial<DocumentationInput> = {}): DocumentationInput {
  return {
    documents: makeAllRequiredDocuments(),
    validations: [makeValidation()],
    ...overrides,
  };
}

function makeEngineInput(docData: DocumentationInput): EngineInput {
  return {
    application_id: 'app-001',
    documents: docData,
    policy_config: POLICY_CONFIG,
  };
}

// ============================================================
// Unit tests: calcCompletenessScore
// ============================================================

describe('calcCompletenessScore', () => {
  it('returns 100 when all required documents are present', () => {
    const docs = makeAllRequiredDocuments();
    const result = calcCompletenessScore(docs);
    expect(result.score).toBe(100);
    expect(result.missing_types).toHaveLength(0);
    expect(result.present_count).toBe(6);
  });

  it('returns partial score when some documents are missing', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva' }),
      makeDocument({ document_type: 'ine' }),
      makeDocument({ document_type: 'poder' }),
    ];
    const result = calcCompletenessScore(docs);
    expect(result.score).toBe(50);
    expect(result.present_count).toBe(3);
    expect(result.missing_types).toContain('comprobante_domicilio');
    expect(result.missing_types).toContain('estados_financieros');
    expect(result.missing_types).toContain('declaraciones');
  });

  it('does not count pending documents as present', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva', status: 'pending' }),
    ];
    const result = calcCompletenessScore(docs);
    expect(result.present_count).toBe(0);
    expect(result.score).toBe(0);
  });

  it('does not count rejected documents as present', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva', status: 'rejected' }),
    ];
    const result = calcCompletenessScore(docs);
    expect(result.present_count).toBe(0);
  });

  it('returns 0 for empty documents array', () => {
    const result = calcCompletenessScore([]);
    expect(result.score).toBe(0);
    expect(result.missing_types).toHaveLength(6);
  });
});

// ============================================================
// Unit tests: calcValidationQualityScore
// ============================================================

describe('calcValidationQualityScore', () => {
  it('returns 50 for no validations', () => {
    const result = calcValidationQualityScore([]);
    expect(result.score).toBe(50);
    expect(result.total).toBe(0);
  });

  it('returns 100 when all validations pass', () => {
    const validations = [
      makeValidation({ result: 'pass' }),
      makeValidation({ id: 'v2', result: 'pass' }),
    ];
    const result = calcValidationQualityScore(validations);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(2);
  });

  it('returns 0 when all validations fail', () => {
    const validations = [
      makeValidation({ result: 'fail' }),
      makeValidation({ id: 'v2', result: 'fail' }),
    ];
    const result = calcValidationQualityScore(validations);
    expect(result.score).toBe(0);
    expect(result.failed).toBe(2);
  });

  it('calculates correct ratio for mixed results', () => {
    const validations = [
      makeValidation({ result: 'pass' }),
      makeValidation({ id: 'v2', result: 'fail' }),
      makeValidation({ id: 'v3', result: 'warning' }),
      makeValidation({ id: 'v4', result: 'pass' }),
    ];
    const result = calcValidationQualityScore(validations);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.warnings).toBe(1);
  });
});

// ============================================================
// Unit tests: calcExpirationScore
// ============================================================

describe('calcExpirationScore', () => {
  const refDate = new Date('2025-06-15T00:00:00Z');

  it('returns 100 when no documents have expiry dates', () => {
    const docs = [makeDocument({ expires_at: null })];
    const result = calcExpirationScore(docs, refDate);
    expect(result.score).toBe(100);
    expect(result.expired_count).toBe(0);
  });

  it('returns 100 when all documents are valid', () => {
    const docs = [
      makeDocument({ expires_at: '2026-01-01T00:00:00Z' }),
    ];
    const result = calcExpirationScore(docs, refDate);
    expect(result.score).toBe(100);
    expect(result.valid_count).toBe(1);
  });

  it('penalizes expired documents', () => {
    const docs = [
      makeDocument({ expires_at: '2025-01-01T00:00:00Z' }),
    ];
    const result = calcExpirationScore(docs, refDate);
    expect(result.expired_count).toBe(1);
    expect(result.score).toBeLessThan(100);
  });

  it('penalizes expiring soon documents', () => {
    const docs = [
      makeDocument({ expires_at: '2025-07-01T00:00:00Z' }),
    ];
    const result = calcExpirationScore(docs, refDate);
    expect(result.expiring_soon_count).toBe(1);
    expect(result.score).toBeLessThan(100);
  });

  it('expired penalizes more than expiring soon', () => {
    const docsExpired = [makeDocument({ expires_at: '2025-01-01T00:00:00Z' })];
    const docsExpiring = [makeDocument({ expires_at: '2025-07-01T00:00:00Z' })];
    const expired = calcExpirationScore(docsExpired, refDate);
    const expiring = calcExpirationScore(docsExpiring, refDate);
    expect(expired.score).toBeLessThan(expiring.score);
  });
});

// ============================================================
// Unit tests: hasBlockingDocumentsMissing
// ============================================================

describe('hasBlockingDocumentsMissing', () => {
  it('returns not blocked when all blocking docs present', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva', status: 'validated' }),
      makeDocument({ document_type: 'ine', status: 'uploaded' }),
    ];
    const result = hasBlockingDocumentsMissing(docs);
    expect(result.blocked).toBe(false);
    expect(result.missing_blocking).toHaveLength(0);
  });

  it('returns blocked when acta_constitutiva missing', () => {
    const docs = [
      makeDocument({ document_type: 'ine', status: 'validated' }),
    ];
    const result = hasBlockingDocumentsMissing(docs);
    expect(result.blocked).toBe(true);
    expect(result.missing_blocking).toContain('acta_constitutiva');
  });

  it('returns blocked when INE missing', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva', status: 'validated' }),
    ];
    const result = hasBlockingDocumentsMissing(docs);
    expect(result.blocked).toBe(true);
    expect(result.missing_blocking).toContain('ine');
  });

  it('does not count pending blocking docs as present', () => {
    const docs = [
      makeDocument({ document_type: 'acta_constitutiva', status: 'pending' }),
      makeDocument({ document_type: 'ine', status: 'pending' }),
    ];
    const result = hasBlockingDocumentsMissing(docs);
    expect(result.blocked).toBe(true);
  });
});

// ============================================================
// Unit tests: generateRiskFlags
// ============================================================

describe('generateRiskFlags', () => {
  it('returns empty for perfect documentation', () => {
    const completeness = { score: 100, total_required: 6, present_count: 6, missing_types: [] };
    const valQuality = { score: 100, total: 2, passed: 2, failed: 0, warnings: 0 };
    const expiration = { score: 100, expired_count: 0, expiring_soon_count: 0, valid_count: 2 };
    const blocking = { blocked: false, missing_blocking: [] };
    const validations = [makeValidation({ result: 'pass' })];

    const flags = generateRiskFlags(completeness, valQuality, expiration, blocking, validations);
    expect(flags).toHaveLength(0);
  });

  it('flags blocking documents missing as hard_stop', () => {
    const completeness = { score: 67, total_required: 6, present_count: 4, missing_types: ['acta_constitutiva', 'ine'] };
    const valQuality = { score: 100, total: 1, passed: 1, failed: 0, warnings: 0 };
    const expiration = { score: 100, expired_count: 0, expiring_soon_count: 0, valid_count: 0 };
    const blocking = { blocked: true, missing_blocking: ['acta_constitutiva', 'ine'] };

    const flags = generateRiskFlags(completeness, valQuality, expiration, blocking, []);
    const hardStops = flags.filter((f) => f.severity === 'hard_stop');
    expect(hardStops.length).toBe(2);
    expect(hardStops.every((f) => f.code === 'blocking_document_missing')).toBe(true);
  });

  it('flags OCR validation failures', () => {
    const completeness = { score: 100, total_required: 6, present_count: 6, missing_types: [] };
    const valQuality = { score: 50, total: 2, passed: 1, failed: 1, warnings: 0 };
    const expiration = { score: 100, expired_count: 0, expiring_soon_count: 0, valid_count: 0 };
    const blocking = { blocked: false, missing_blocking: [] };
    const validations = [
      makeValidation({ validation_type: 'ocr', result: 'fail' }),
    ];

    const flags = generateRiskFlags(completeness, valQuality, expiration, blocking, validations);
    expect(flags.some((f) => f.code === 'ocr_validation_failed')).toBe(true);
    expect(flags.some((f) => f.code === 'document_rejected')).toBe(true);
  });

  it('flags expired and expiring soon documents', () => {
    const completeness = { score: 100, total_required: 6, present_count: 6, missing_types: [] };
    const valQuality = { score: 100, total: 1, passed: 1, failed: 0, warnings: 0 };
    const expiration = { score: 40, expired_count: 1, expiring_soon_count: 2, valid_count: 0 };
    const blocking = { blocked: false, missing_blocking: [] };

    const flags = generateRiskFlags(completeness, valQuality, expiration, blocking, []);
    expect(flags.some((f) => f.code === 'document_expired')).toBe(true);
    expect(flags.some((f) => f.code === 'document_expiring_soon')).toBe(true);
  });
});

// ============================================================
// Integration tests: runDocumentationEngine
// ============================================================

describe('runDocumentationEngine', () => {
  it('returns blocked when no documents data', async () => {
    const input: EngineInput = {
      application_id: 'app-001',
      policy_config: POLICY_CONFIG,
    };
    const result = await runDocumentationEngine(input);

    expect(result.engine_name).toBe('documentation');
    expect(result.module_status).toBe('blocked');
    expect(result.module_score).toBe(0);
    expect(result.module_grade).toBe('F');
    expect(result.risk_flags[0]?.code).toBe('no_documentation_data');
  });

  it('returns high score for complete documentation', async () => {
    const docData = makeDocInput({
      documents: makeAllRequiredDocuments(),
      validations: [
        makeValidation({ result: 'pass' }),
        makeValidation({ id: 'v2', result: 'pass' }),
      ],
    });
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(90);
    expect(['A', 'B']).toContain(result.module_grade);
    expect(result.module_status).toBe('pass');
    expect(result.key_metrics.completeness_pct).toBeDefined();
    expect(result.key_metrics.validation_pass_rate).toBeDefined();
  });

  it('returns blocked when blocking documents missing', async () => {
    const docs = [
      makeDocument({ id: 'd1', document_type: 'poder' }),
      makeDocument({ id: 'd2', document_type: 'comprobante_domicilio' }),
    ];
    const docData = makeDocInput({ documents: docs });
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.module_status).toBe('blocked');
    expect(result.risk_flags.some((f) => f.code === 'blocking_document_missing')).toBe(true);
  });

  it('flags expired documents', async () => {
    const docs = makeAllRequiredDocuments().map((d) => ({
      ...d,
      expires_at: '2020-01-01T00:00:00Z',
    }));
    const docData = makeDocInput({ documents: docs });
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'document_expired')).toBe(true);
  });

  it('flags missing non-blocking required documents', async () => {
    const docs = [
      makeDocument({ id: 'd1', document_type: 'acta_constitutiva', is_blocking: true }),
      makeDocument({ id: 'd2', document_type: 'ine', is_blocking: true }),
    ];
    const docData = makeDocInput({ documents: docs });
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'missing_required_document')).toBe(true);
    expect(result.module_score).toBeLessThan(80);
  });

  it('has no trends (point-in-time check)', async () => {
    const docData = makeDocInput();
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.trends).toHaveLength(0);
  });

  it('score is between 0 and 100', async () => {
    const docData = makeDocInput();
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(0);
    expect(result.module_score).toBeLessThanOrEqual(100);
    expect(result.module_max_score).toBe(100);
  });

  it('includes benchmark comparisons', async () => {
    const docData = makeDocInput();
    const input = makeEngineInput(docData);
    const result = await runDocumentationEngine(input);

    expect(result.benchmark_comparison.completeness).toBeDefined();
    expect(result.benchmark_comparison.validation_pass_rate).toBeDefined();
  });
});
