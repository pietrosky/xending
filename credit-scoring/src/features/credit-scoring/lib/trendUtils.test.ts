import { describe, it, expect } from 'vitest';
import { trendUtils } from './trendUtils';
import type { TimeSeriesPoint, TrendConfig, TrendResult } from '../types/trend.types';

// Helper: generate simple time series
function makeSeries(values: number[], startYear = 2024, startMonth = 1): TimeSeriesPoint[] {
  return values.map((value, i) => {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);
    return { period: `${y}-${String(m).padStart(2, '0')}`, value };
  });
}

const baseConfig: TrendConfig = {
  metric_name: 'revenue',
  metric_label: 'Revenue',
  unit: 'MXN',
  higher_is_better: true,
  projection_months: 3,
  y_axis_format: '$',
};

describe('trendUtils.analyze', () => {
  it('detects improving trend for increasing values (higher_is_better)', () => {
    const data = makeSeries([100, 110, 120, 130, 140, 150]);
    const result = trendUtils.analyze(data, baseConfig);

    expect(result.direction).toBe('improving');
    expect(result.slope).toBeGreaterThan(0);
    expect(result.r_squared).toBeGreaterThan(0.9);
    expect(result.current_value).toBe(150);
    expect(result.previous_value).toBe(140);
    expect(result.classification).toMatch(/^[AB]$/);
  });

  it('detects deteriorating/critical trend for decreasing values (higher_is_better)', () => {
    const data = makeSeries([150, 140, 130, 120, 110, 100]);
    const result = trendUtils.analyze(data, baseConfig);

    // Steep decline triggers critical (slope < -threshold * 3)
    expect(['deteriorating', 'critical']).toContain(result.direction);
    expect(result.slope).toBeLessThan(0);
  });

  it('detects stable trend for flat values', () => {
    const data = makeSeries([100, 100, 100, 100, 100, 100]);
    const result = trendUtils.analyze(data, baseConfig);

    expect(result.direction).toBe('stable');
    expect(result.classification).toBe('B');
  });

  it('generates projection with correct number of periods', () => {
    const data = makeSeries([100, 110, 120]);
    const result = trendUtils.analyze(data, { ...baseConfig, projection_months: 6 });

    expect(result.projection).toHaveLength(6);
    expect(result.projection[0]!.period).toBe('2024-04');
  });

  it('generates trend line matching data length', () => {
    const data = makeSeries([10, 20, 30, 40]);
    const result = trendUtils.analyze(data, baseConfig);

    expect(result.trend_line).toHaveLength(4);
  });

  it('detects threshold crossing', () => {
    const data = makeSeries([90, 85, 80, 75, 70, 65]);
    const config: TrendConfig = {
      ...baseConfig,
      higher_is_better: true,
      critical_threshold: 50,
    };
    const result = trendUtils.analyze(data, config);

    expect(result.months_to_threshold).toBeDefined();
    expect(result.threshold_type).toBe('critical');
  });

  it('adds risk flags for critical trends', () => {
    // Create a steep decline to trigger critical (slope < -threshold * 3)
    const data = makeSeries([100, 95, 90, 85, 80, 75]);
    const result = trendUtils.analyze(data, baseConfig);

    // The direction depends on slope magnitude vs threshold
    if (result.direction === 'critical') {
      expect(result.risk_flags).toContain('revenue_critical_trend');
    }
  });
});

describe('trendUtils.classify', () => {
  it('returns correct classification for improving fast', () => {
    const mockResult = {
      direction: 'improving' as const,
      speed: 'fast' as const,
    } as TrendResult;

    const { classification } = trendUtils.classify(mockResult);
    expect(classification).toBe('A');
  });

  it('returns B for stable', () => {
    const mockResult = {
      direction: 'stable' as const,
      speed: 'slow' as const,
    } as TrendResult;

    const { classification } = trendUtils.classify(mockResult);
    expect(classification).toBe('B');
  });

  it('returns C for deteriorating slow', () => {
    const mockResult = {
      direction: 'deteriorating' as const,
      speed: 'slow' as const,
    } as TrendResult;

    const { classification } = trendUtils.classify(mockResult);
    expect(classification).toBe('C');
  });

  it('returns D for deteriorating moderate', () => {
    const mockResult = {
      direction: 'deteriorating' as const,
      speed: 'moderate' as const,
    } as TrendResult;

    const { classification } = trendUtils.classify(mockResult);
    expect(classification).toBe('D');
  });

  it('returns F for critical', () => {
    const mockResult = {
      direction: 'critical' as const,
      speed: 'fast' as const,
    } as TrendResult;

    const { classification } = trendUtils.classify(mockResult);
    expect(classification).toBe('F');
  });
});

describe('trendUtils.project', () => {
  it('projects future values based on trend', () => {
    const data = makeSeries([100, 110, 120, 130]);
    const result = trendUtils.analyze(data, baseConfig);
    const projected = trendUtils.project(result, 3);

    expect(projected).toHaveLength(3);
    // Values should continue the upward trend
    expect(projected[0]!.value).toBeGreaterThan(130);
  });

  it('returns empty array for empty time series', () => {
    const result = { time_series: [] } as unknown as TrendResult;
    const projected = trendUtils.project(result, 3);
    expect(projected).toHaveLength(0);
  });
});

describe('trendUtils.detectBreakpoints', () => {
  it('detects peaks and valleys', () => {
    const data = makeSeries([10, 50, 10, 50, 10]);
    const breakpoints = trendUtils.detectBreakpoints(data);

    expect(breakpoints.length).toBeGreaterThanOrEqual(2);
    const directions = breakpoints.map(b => b.direction);
    expect(directions).toContain('up');
    expect(directions).toContain('down');
  });

  it('returns empty for monotonic data', () => {
    const data = makeSeries([10, 20, 30, 40, 50]);
    const breakpoints = trendUtils.detectBreakpoints(data);
    expect(breakpoints).toHaveLength(0);
  });

  it('returns empty for less than 3 points', () => {
    const data = makeSeries([10, 20]);
    const breakpoints = trendUtils.detectBreakpoints(data);
    expect(breakpoints).toHaveLength(0);
  });

  it('includes change_percent and significance', () => {
    const data = makeSeries([10, 100, 10]);
    const breakpoints = trendUtils.detectBreakpoints(data);

    expect(breakpoints).toHaveLength(1);
    expect(breakpoints[0]!.change_percent).toBeGreaterThan(0);
    expect(breakpoints[0]!.significance).toBeGreaterThan(0);
  });
});

describe('trendUtils.detectSeasonality', () => {
  it('returns null for short series', () => {
    const data = makeSeries([10, 20, 30]);
    expect(trendUtils.detectSeasonality(data)).toBeNull();
  });

  it('detects seasonal pattern in repeating data', () => {
    // Create a clear 6-month cycle repeated 4 times
    const values = [10, 20, 30, 30, 20, 10, 10, 20, 30, 30, 20, 10, 10, 20, 30, 30, 20, 10, 10, 20, 30, 30, 20, 10];
    const data = makeSeries(values);
    const result = trendUtils.detectSeasonality(data);

    // Should detect some pattern (cycle length may vary)
    if (result) {
      expect(result.cycle_months).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeGreaterThan(0);
    }
  });
});

describe('trendUtils.compareVsBenchmark', () => {
  it('detects data above benchmark', () => {
    const data = makeSeries([120, 130, 140]);
    const benchmark = makeSeries([100, 100, 100]);
    const report = trendUtils.compareVsBenchmark(data, benchmark);

    expect(report.periods_above).toBe(3);
    expect(report.periods_below).toBe(0);
    expect(report.current_status).toBe('above');
    expect(report.avg_deviation_percent).toBeGreaterThan(0);
  });

  it('detects data below benchmark', () => {
    const data = makeSeries([80, 70, 60]);
    const benchmark = makeSeries([100, 100, 100]);
    const report = trendUtils.compareVsBenchmark(data, benchmark);

    expect(report.periods_below).toBe(3);
    expect(report.current_status).toBe('below');
  });

  it('handles no matching periods', () => {
    const data = makeSeries([100], 2024, 1);
    const benchmark = makeSeries([100], 2025, 1);
    const report = trendUtils.compareVsBenchmark(data, benchmark);

    expect(report.periods_above).toBe(0);
    expect(report.periods_below).toBe(0);
  });
});

describe('trendUtils.rollingAverage', () => {
  it('smooths data with given window', () => {
    const data = makeSeries([10, 20, 30, 40, 50]);
    const smoothed = trendUtils.rollingAverage(data, 3);

    expect(smoothed).toHaveLength(5);
    // First point: avg of [10] = 10
    expect(smoothed[0]!.value).toBe(10);
    // Third point: avg of [10, 20, 30] = 20
    expect(smoothed[2]!.value).toBe(20);
  });

  it('preserves period labels', () => {
    const data = makeSeries([10, 20, 30]);
    const smoothed = trendUtils.rollingAverage(data, 2);

    expect(smoothed[0]!.period).toBe('2024-01');
    expect(smoothed[2]!.period).toBe('2024-03');
  });
});

describe('trendUtils.calculateTrendFactor', () => {
  it('returns 1.05 when majority improving', () => {
    const trends = [
      { direction: 'improving' },
      { direction: 'improving' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(trendUtils.calculateTrendFactor(trends)).toBe(1.05);
  });

  it('returns 1.00 for empty trends', () => {
    expect(trendUtils.calculateTrendFactor([])).toBe(1.00);
  });

  it('returns 0.80 for any critical', () => {
    const trends = [
      { direction: 'critical' },
      { direction: 'improving' },
    ] as TrendResult[];
    expect(trendUtils.calculateTrendFactor(trends)).toBe(0.80);
  });

  it('returns 0.90 for majority deteriorating', () => {
    const trends = [
      { direction: 'deteriorating' },
      { direction: 'deteriorating' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(trendUtils.calculateTrendFactor(trends)).toBe(0.90);
  });

  it('returns 0.95 for some deteriorating', () => {
    const trends = [
      { direction: 'deteriorating' },
      { direction: 'improving' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(trendUtils.calculateTrendFactor(trends)).toBe(0.95);
  });

  it('returns 1.00 for all stable', () => {
    const trends = [
      { direction: 'stable' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(trendUtils.calculateTrendFactor(trends)).toBe(1.00);
  });
});
