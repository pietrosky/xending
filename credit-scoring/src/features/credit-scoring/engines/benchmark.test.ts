import { describe, it, expect } from 'vitest';
import {
  calcDeviation,
  calcPercentile,
  crossValidateRatio,
  compareMetric,
  calcSectorComparisonSubScore,
  calcSizeComparisonSubScore,
  calcCrossValidationSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runBenchmarkEngine,
} from './benchmark';
import type {
  ApplicantMetric,
  SyntageRatio,
  IndustryBenchmark,
  BenchmarkMetricResult,
  BenchmarkInput,
} from './benchmark';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { benchmark: 0.05 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeGoodMetrics(): ApplicantMetric[] {
  return [
    { metric_name: 'dscr', value: 2.0 },
    { metric_name: 'current_ratio', value: 1.8 },
    { metric_name: 'leverage', value: 0.35 },
    { metric_name: 'margin', value: 0.20 },
    { metric_name: 'dso', value: 30 },
    { metric_name: 'interest_coverage', value: 4.0 },
  ];
}

function makePoorMetrics(): ApplicantMetric[] {
  return [
    { metric_name: 'dscr', value: 0.7 },
    { metric_name: 'current_ratio', value: 0.6 },
    { metric_name: 'leverage', value: 0.90 },
    { metric_name: 'margin', value: 0.02 },
    { metric_name: 'dso', value: 120 },
    { metric_name: 'interest_coverage', value: 0.8 },
  ];
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcDeviation', () => {
  it('should return 0 for equal values', () => {
    expect(calcDeviation(1.5, 1.5)).toBe(0);
  });

  it('should return positive deviation when above benchmark', () => {
    // (2.0 - 1.3) / 1.3 * 100 = 53.85
    expect(calcDeviation(2.0, 1.3)).toBeCloseTo(53.85, 1);
  });

  it('should return negative deviation when below benchmark', () => {
    expect(calcDeviation(1.0, 1.3)).toBeCloseTo(-23.08, 1);
  });

  it('should return 0 when both are 0', () => {
    expect(calcDeviation(0, 0)).toBe(0);
  });

  it('should return 100 when benchmark is 0 but applicant is not', () => {
    expect(calcDeviation(5, 0)).toBe(100);
  });
});

describe('calcPercentile', () => {
  it('should return 50 for zero deviation', () => {
    expect(calcPercentile(0, true)).toBe(50);
  });

  it('should return higher percentile for positive deviation when higher is better', () => {
    const p = calcPercentile(20, true);
    expect(p).toBeGreaterThan(50);
  });

  it('should return lower percentile for positive deviation when higher is worse', () => {
    // For leverage: higher value is worse, so positive deviation = lower percentile
    const p = calcPercentile(20, false);
    expect(p).toBeLessThan(50);
  });

  it('should clamp to 0-100 range', () => {
    expect(calcPercentile(100, true)).toBeLessThanOrEqual(100);
    expect(calcPercentile(-100, true)).toBeGreaterThanOrEqual(0);
  });
});

describe('crossValidateRatio', () => {
  it('should return consistent for matching values', () => {
    const result = crossValidateRatio(1.5, 1.5);
    expect(result.consistent).toBe(true);
    expect(result.deviation_pct).toBe(0);
  });

  it('should return consistent for small deviation', () => {
    // 10% deviation is within 15% threshold
    const result = crossValidateRatio(1.65, 1.5);
    expect(result.consistent).toBe(true);
  });

  it('should return inconsistent for large deviation', () => {
    // 50% deviation exceeds 15% threshold
    const result = crossValidateRatio(2.25, 1.5);
    expect(result.consistent).toBe(false);
  });

  it('should handle both zeros', () => {
    const result = crossValidateRatio(0, 0);
    expect(result.consistent).toBe(true);
    expect(result.deviation_pct).toBe(0);
  });
});

describe('compareMetric', () => {
  it('should compare metric against benchmark', () => {
    const metric: ApplicantMetric = { metric_name: 'dscr', value: 2.0 };
    const bm: IndustryBenchmark = { category: 'financial', metric_name: 'dscr', benchmark_value: 1.3, higher_is_better: true };
    const result = compareMetric(metric, bm);
    expect(result.category).toBe('financial');
    expect(result.metric_name).toBe('dscr');
    expect(result.applicant_value).toBe(2.0);
    expect(result.benchmark_value).toBe(1.3);
    expect(result.percentile).toBeGreaterThan(50);
    expect(result.deviation_pct).toBeGreaterThan(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcSectorComparisonSubScore', () => {
  it('should return 50 for empty results', () => {
    expect(calcSectorComparisonSubScore([])).toBe(50);
  });

  it('should return high score when most metrics are above benchmark', () => {
    const results: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 2, benchmark_value: 1.5, percentile: 80, deviation_pct: 33 },
      { category: 'financial', metric_name: 'margin', applicant_value: 0.2, benchmark_value: 0.15, percentile: 70, deviation_pct: 33 },
      { category: 'operational', metric_name: 'dso', applicant_value: 30, benchmark_value: 45, percentile: 60, deviation_pct: -33 },
    ];
    expect(calcSectorComparisonSubScore(results)).toBeGreaterThanOrEqual(70);
  });

  it('should return low score when most metrics are below benchmark', () => {
    const results: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 0.8, benchmark_value: 1.5, percentile: 10, deviation_pct: -47 },
      { category: 'financial', metric_name: 'margin', applicant_value: 0.03, benchmark_value: 0.15, percentile: 15, deviation_pct: -80 },
      { category: 'operational', metric_name: 'dso', applicant_value: 90, benchmark_value: 45, percentile: 20, deviation_pct: 100 },
    ];
    expect(calcSectorComparisonSubScore(results)).toBeLessThanOrEqual(30);
  });
});

describe('calcSizeComparisonSubScore', () => {
  it('should return 50 for empty results', () => {
    expect(calcSizeComparisonSubScore([])).toBe(50);
  });

  it('should return high score for small deviations', () => {
    const results: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 1.55, benchmark_value: 1.5, percentile: 55, deviation_pct: 3.33 },
      { category: 'financial', metric_name: 'margin', applicant_value: 0.16, benchmark_value: 0.15, percentile: 55, deviation_pct: 6.67 },
    ];
    expect(calcSizeComparisonSubScore(results)).toBeGreaterThanOrEqual(80);
  });

  it('should return low score for large deviations', () => {
    const results: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 0.5, benchmark_value: 1.5, percentile: 10, deviation_pct: -66.67 },
      { category: 'financial', metric_name: 'margin', applicant_value: 0.01, benchmark_value: 0.15, percentile: 5, deviation_pct: -93.33 },
    ];
    expect(calcSizeComparisonSubScore(results)).toBeLessThanOrEqual(20);
  });
});

describe('calcCrossValidationSubScore', () => {
  it('should return 50 for empty syntage ratios', () => {
    expect(calcCrossValidationSubScore(makeGoodMetrics(), [])).toBe(50);
  });

  it('should return high score for consistent ratios', () => {
    const metrics: ApplicantMetric[] = [
      { metric_name: 'dscr', value: 1.5 },
      { metric_name: 'margin', value: 0.15 },
    ];
    const syntage: SyntageRatio[] = [
      { metric_name: 'dscr', syntage_value: 1.52 },
      { metric_name: 'margin', syntage_value: 0.155 },
    ];
    expect(calcCrossValidationSubScore(metrics, syntage)).toBeGreaterThanOrEqual(75);
  });

  it('should return low score for inconsistent ratios', () => {
    const metrics: ApplicantMetric[] = [
      { metric_name: 'dscr', value: 2.5 },
      { metric_name: 'margin', value: 0.30 },
    ];
    const syntage: SyntageRatio[] = [
      { metric_name: 'dscr', syntage_value: 1.2 },
      { metric_name: 'margin', syntage_value: 0.10 },
    ];
    expect(calcCrossValidationSubScore(metrics, syntage)).toBeLessThanOrEqual(30);
  });
});

describe('calcTrendQualitySubScore', () => {
  it('should return 50 for empty trends', () => {
    expect(calcTrendQualitySubScore([])).toBe(50);
  });

  it('should return 10 for critical trends', () => {
    const trends = [{ direction: 'critical' }] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(10);
  });

  it('should return 90 for mostly improving trends', () => {
    const trends = [
      { direction: 'improving' },
      { direction: 'improving' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(90);
  });
});

// ============================================================
// Helpers tests
// ============================================================

describe('scoreToGrade', () => {
  it('should map scores to grades', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(20)).toBe('F');
  });
});

describe('scoreToStatus', () => {
  it('should return fail for hard_stop flags', () => {
    expect(scoreToStatus(80, [{ code: 'x', severity: 'hard_stop', message: '' }])).toBe('fail');
  });

  it('should return pass for high score without critical flags', () => {
    expect(scoreToStatus(75, [])).toBe('pass');
  });

  it('should return warning for mid-range score', () => {
    expect(scoreToStatus(45, [])).toBe('warning');
  });

  it('should return fail for low score', () => {
    expect(scoreToStatus(30, [])).toBe('fail');
  });
});

// ============================================================
// Risk flags tests
// ============================================================

describe('generateRiskFlags', () => {
  it('should flag metrics below benchmark', () => {
    const bmResults: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 0.5, benchmark_value: 1.3, percentile: 5, deviation_pct: -61.54 },
    ];
    const flags = generateRiskFlags({ benchmarkResults: bmResults, crossValidations: [] });
    expect(flags.some((f) => f.code === 'below_benchmark_dscr')).toBe(true);
  });

  it('should flag cross-validation mismatches', () => {
    const cvResults = [
      { metric_name: 'dscr', deviation_pct: 25, consistent: false },
    ];
    const flags = generateRiskFlags({ benchmarkResults: [], crossValidations: cvResults });
    expect(flags.some((f) => f.code === 'cross_validation_mismatch_dscr')).toBe(true);
  });

  it('should flag majority below benchmark', () => {
    const bmResults: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 0.7, benchmark_value: 1.3, percentile: 30, deviation_pct: -46 },
      { category: 'financial', metric_name: 'margin', applicant_value: 0.02, benchmark_value: 0.10, percentile: 25, deviation_pct: -80 },
      { category: 'operational', metric_name: 'dso', applicant_value: 120, benchmark_value: 60, percentile: 15, deviation_pct: 100 },
    ];
    const flags = generateRiskFlags({ benchmarkResults: bmResults, crossValidations: [] });
    expect(flags.some((f) => f.code === 'majority_below_benchmark')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const bmResults: BenchmarkMetricResult[] = [
      { category: 'financial', metric_name: 'dscr', applicant_value: 2.0, benchmark_value: 1.5, percentile: 80, deviation_pct: 33 },
    ];
    const flags = generateRiskFlags({ benchmarkResults: bmResults, crossValidations: [] });
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    const periods = [{ period: '2024-01', applicant_metrics: [{ metric_name: 'dscr', value: 1.5 }] }];
    expect(analyzeTrends(periods, {})).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      { period: '2024-01', applicant_metrics: [{ metric_name: 'dscr', value: 1.3 }] },
      { period: '2024-02', applicant_metrics: [{ metric_name: 'dscr', value: 1.4 }] },
      { period: '2024-03', applicant_metrics: [{ metric_name: 'dscr', value: 1.5 }] },
    ];
    const trends = analyzeTrends(periods, {});
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('dscr');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runBenchmarkEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runBenchmarkEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('benchmark');
    expect(result.risk_flags[0]!.code).toBe('no_benchmark_data');
  });

  it('should return blocked when applicant metrics are empty', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'manufacturing',
        company_size: 'medium',
        region: 'central',
        applicant_metrics: [],
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.module_status).toBe('blocked');
    expect(result.risk_flags[0]!.code).toBe('insufficient_benchmark_data');
  });

  it('should calculate a good score for strong metrics', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'manufacturing',
        company_size: 'medium',
        region: 'central',
        applicant_metrics: makeGoodMetrics(),
        syntage_ratios: [
          { metric_name: 'dscr', syntage_value: 1.95 },
          { metric_name: 'current_ratio', syntage_value: 1.75 },
          { metric_name: 'margin', syntage_value: 0.19 },
        ],
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['avg_percentile']).toBeDefined();
    expect(result.key_metrics['cross_validation_rate']).toBeDefined();
  });

  it('should calculate a poor score for weak metrics', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'manufacturing',
        company_size: 'small',
        region: 'central',
        applicant_metrics: makePoorMetrics(),
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.module_score).toBeLessThan(60);
    expect(result.risk_flags.length).toBeGreaterThan(0);
  });

  it('should flag cross-validation mismatches with Syntage', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'services',
        company_size: 'large',
        region: 'north',
        applicant_metrics: [
          { metric_name: 'dscr', value: 2.5 },
          { metric_name: 'margin', value: 0.30 },
        ],
        syntage_ratios: [
          { metric_name: 'dscr', syntage_value: 1.2 },
          { metric_name: 'margin', syntage_value: 0.10 },
        ],
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    const cvFlags = result.risk_flags.filter((f) => f.code.startsWith('cross_validation_mismatch_'));
    expect(cvFlags.length).toBeGreaterThan(0);
  });

  it('should use portfolio benchmarks when sample size >= 5', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'manufacturing',
        company_size: 'medium',
        region: 'central',
        applicant_metrics: [{ metric_name: 'dscr', value: 1.5 }],
        portfolio_benchmarks: {
          dscr: { category: 'financial', metric_name: 'dscr', benchmark_value: 1.4, higher_is_better: true },
        },
        portfolio_sample_size: 8,
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.key_metrics['benchmark_source']?.interpretation).toContain('portfolio');
  });

  it('should prefer industry benchmarks over portfolio', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'manufacturing',
        company_size: 'medium',
        region: 'central',
        applicant_metrics: [{ metric_name: 'dscr', value: 1.5 }],
        portfolio_benchmarks: {
          dscr: { category: 'financial', metric_name: 'dscr', benchmark_value: 1.4, higher_is_better: true },
        },
        portfolio_sample_size: 10,
        industry_benchmarks: {
          dscr: { category: 'financial', metric_name: 'dscr', benchmark_value: 1.6, higher_is_better: true },
        },
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.key_metrics['benchmark_source']?.interpretation).toContain('industry');
  });

  it('should fall back to static when portfolio sample < 5', async () => {
    const input: EngineInput = {
      ...baseInput,
      syntage_data: {
        sector: 'services',
        company_size: 'small',
        region: 'central',
        applicant_metrics: [{ metric_name: 'dscr', value: 1.5 }],
        portfolio_benchmarks: {
          dscr: { category: 'financial', metric_name: 'dscr', benchmark_value: 1.0, higher_is_better: true },
        },
        portfolio_sample_size: 3,
      } as BenchmarkInput,
    };
    const result = await runBenchmarkEngine(input);
    expect(result.key_metrics['benchmark_source']?.interpretation).toContain('static');
  });
});
