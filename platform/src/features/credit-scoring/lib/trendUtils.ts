import type {
  TimeSeriesPoint,
  TrendResult,
  TrendConfig,
  TrendDirection,
  TrendSpeed,
  TrendClassification,
  TrendFactor,
  BreakPoint,
  SeasonalPattern,
  DeviationReport,
} from '../types/trend.types';

/** Linear regression: returns slope, r-squared, and intercept */
function linearRegression(data: TimeSeriesPoint[]): { slope: number; r_squared: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, r_squared: 0, intercept: data[0]?.value ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const point = data[i]!;
    sumX += i;
    sumY += point.value;
    sumXY += i * point.value;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, r_squared: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = data.reduce((acc, p, i) => {
    const predicted = intercept + slope * i;
    return acc + (p.value - predicted) ** 2;
  }, 0);
  const mean = sumY / n;
  const ssTot = data.reduce((acc, p) => acc + (p.value - mean) ** 2, 0);
  const r_squared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, r_squared, intercept };
}

/** Classify direction based on slope and config */
function classifyDirection(slope: number, config: TrendConfig): TrendDirection {
  const threshold = 0.001;
  if (config.higher_is_better) {
    if (slope > threshold) return 'improving';
    if (slope < -threshold * 3) return 'critical';
    if (slope < -threshold) return 'deteriorating';
    return 'stable';
  }
  // Lower is better (e.g., DSO, endeudamiento)
  if (slope < -threshold) return 'improving';
  if (slope > threshold * 3) return 'critical';
  if (slope > threshold) return 'deteriorating';
  return 'stable';
}

/** Classify speed based on change percent */
function classifySpeed(changePercent: number): TrendSpeed {
  const abs = Math.abs(changePercent);
  if (abs > 15) return 'fast';
  if (abs > 5) return 'moderate';
  return 'slow';
}

/** Map direction + speed to A-F grade */
function classifyGrade(direction: TrendDirection, speed: TrendSpeed): TrendClassification {
  if (direction === 'improving' && (speed === 'fast' || speed === 'moderate')) return 'A';
  if (direction === 'improving' && speed === 'slow') return 'B';
  if (direction === 'stable') return 'B';
  if (direction === 'deteriorating' && speed === 'slow') return 'C';
  if (direction === 'deteriorating' && speed === 'moderate') return 'D';
  return 'F'; // deteriorating+fast or critical
}

/** Generate next N month period strings from last period */
function nextPeriods(lastPeriod: string, months: number): string[] {
  const parts = lastPeriod.split('-').map(Number);
  const periods: string[] = [];
  let y = parts[0] ?? 2025;
  let m = parts[1] ?? 1;
  for (let i = 0; i < months; i++) {
    m++;
    if (m > 12) { m = 1; y++; }
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return periods;
}

/** Main analysis: calculates slope, r_squared, direction, speed, classification, trend line, projection */
function analyze(data: TimeSeriesPoint[], config: TrendConfig): TrendResult {
  const { slope, r_squared, intercept } = linearRegression(data);
  const n = data.length;
  const current = data[n - 1]!;
  const previous = data[n - 2] ?? current;

  const changeAbsolute = current.value - previous.value;
  const changePercent = previous.value !== 0 ? (changeAbsolute / Math.abs(previous.value)) * 100 : 0;

  const direction = classifyDirection(slope, config);
  const speed = classifySpeed(changePercent);
  const classification = classifyGrade(direction, speed);

  // Trend line
  const trendLine: TimeSeriesPoint[] = data.map((p, i) => ({
    period: p.period,
    value: Math.round((intercept + slope * i) * 100) / 100,
  }));

  // Projection
  const lastPeriod = current.period;
  const projPeriods = nextPeriods(lastPeriod, config.projection_months);
  const projection: TimeSeriesPoint[] = projPeriods.map((period, i) => ({
    period,
    value: Math.round((intercept + slope * (n + i)) * 100) / 100,
  }));

  // Months to threshold
  let monthsToThreshold: number | undefined;
  let thresholdValue: number | undefined;
  let thresholdType: 'warning' | 'critical' | undefined;

  if (slope !== 0) {
    const checkThreshold = (tv: number, type: 'warning' | 'critical') => {
      const crossesUp = !config.higher_is_better && slope > 0 && current.value < tv;
      const crossesDown = config.higher_is_better && slope < 0 && current.value > tv;
      if (crossesUp || crossesDown) {
        const months = Math.ceil(Math.abs((tv - current.value) / slope));
        if (months > 0 && months <= 24 && (monthsToThreshold === undefined || months < monthsToThreshold)) {
          monthsToThreshold = months;
          thresholdValue = tv;
          thresholdType = type;
        }
      }
    };
    if (config.critical_threshold !== undefined) checkThreshold(config.critical_threshold, 'critical');
    if (config.warning_threshold !== undefined) checkThreshold(config.warning_threshold, 'warning');
  }

  // Risk flags from trend
  const riskFlags: string[] = [];
  if (direction === 'critical') riskFlags.push(`${config.metric_name}_critical_trend`);
  if (direction === 'deteriorating' && speed === 'fast') riskFlags.push(`${config.metric_name}_fast_deterioration`);
  if (monthsToThreshold !== undefined && monthsToThreshold <= 3) riskFlags.push(`${config.metric_name}_threshold_imminent`);

  return {
    metric_name: config.metric_name,
    metric_label: config.metric_label,
    unit: config.unit,
    time_series: data,
    current_value: current.value,
    previous_value: previous.value,
    direction, speed,
    change_percent: Math.round(changePercent * 100) / 100,
    change_absolute: Math.round(changeAbsolute * 100) / 100,
    slope: Math.round(slope * 10000) / 10000,
    r_squared: Math.round(r_squared * 1000) / 1000,
    trend_line: trendLine,
    projection,
    months_to_threshold: monthsToThreshold,
    threshold_value: thresholdValue,
    threshold_type: thresholdType,
    classification,
    risk_flags: riskFlags,
    chart_config: {
      thresholds: { warning: config.warning_threshold, critical: config.critical_threshold, benchmark: config.benchmark_value },
      higher_is_better: config.higher_is_better,
      y_axis_format: config.y_axis_format,
    },
  };
}

/** Classify a TrendResult into direction, speed, and classification */
function classify(result: TrendResult): { direction: TrendDirection; speed: TrendSpeed; classification: TrendClassification } {
  return {
    direction: result.direction,
    speed: result.speed,
    classification: classifyGrade(result.direction, result.speed),
  };
}

/** Project future values based on trend line */
function project(result: TrendResult, months: number): TimeSeriesPoint[] {
  if (result.time_series.length === 0) return [];
  const { slope, intercept } = linearRegression(result.time_series);
  const n = result.time_series.length;
  const lastPeriod = result.time_series[n - 1]!.period;
  const periods = nextPeriods(lastPeriod, months);
  return periods.map((period, i) => ({
    period,
    value: Math.round((intercept + slope * (n + i)) * 100) / 100,
  }));
}

/** Detect significant breakpoints where trend changes direction */
function detectBreakpoints(data: TimeSeriesPoint[]): BreakPoint[] {
  if (data.length < 3) return [];
  const breakpoints: BreakPoint[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1]!;
    const curr = data[i]!;
    const next = data[i + 1]!;

    const isPeak = curr.value > prev.value && curr.value > next.value;
    const isValley = curr.value < prev.value && curr.value < next.value;

    if (isPeak || isValley) {
      const changePct = prev.value !== 0
        ? ((curr.value - prev.value) / Math.abs(prev.value)) * 100
        : 0;
      // Significance: how much the point deviates from neighbors average
      const neighborAvg = (prev.value + next.value) / 2;
      const significance = neighborAvg !== 0
        ? Math.abs((curr.value - neighborAvg) / Math.abs(neighborAvg))
        : 0;

      breakpoints.push({
        period: curr.period,
        value: curr.value,
        previous_value: prev.value,
        change_percent: Math.round(changePct * 100) / 100,
        direction: isPeak ? 'up' : 'down',
        significance: Math.round(significance * 1000) / 1000,
      });
    }
  }

  return breakpoints;
}

/** Detect seasonal patterns in time series data */
function detectSeasonality(data: TimeSeriesPoint[]): SeasonalPattern | null {
  // Need at least 12 months to detect seasonality
  if (data.length < 12) return null;

  const values = data.map(p => p.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;

  // Detrend: subtract linear trend
  const { slope, intercept } = linearRegression(data);
  const detrended = values.map((v, i) => v - (intercept + slope * i));

  // Try cycle lengths 3, 4, 6, 12
  let bestCycle = 0;
  let bestCorrelation = 0;

  for (const cycle of [3, 4, 6, 12]) {
    if (data.length < cycle * 2) continue;

    // Calculate autocorrelation at this lag
    let sumProduct = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    const count = detrended.length - cycle;

    for (let i = 0; i < count; i++) {
      const a = detrended[i]!;
      const b = detrended[i + cycle]!;
      sumProduct += a * b;
      sumSq1 += a * a;
      sumSq2 += b * b;
    }

    const denom = Math.sqrt(sumSq1 * sumSq2);
    const correlation = denom > 0 ? sumProduct / denom : 0;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestCycle = cycle;
    }
  }

  // Require minimum correlation to confirm seasonality
  if (bestCorrelation < 0.3 || bestCycle === 0) return null;

  // Find peak and trough months within the cycle
  const monthlyAvg: number[] = Array.from({ length: bestCycle }, () => 0);
  const monthlyCount: number[] = Array.from({ length: bestCycle }, () => 0);

  for (let i = 0; i < detrended.length; i++) {
    const idx = i % bestCycle;
    monthlyAvg[idx] = (monthlyAvg[idx] ?? 0) + detrended[i]!;
    monthlyCount[idx] = (monthlyCount[idx] ?? 0) + 1;
  }

  for (let i = 0; i < bestCycle; i++) {
    monthlyAvg[i] = monthlyCount[i]! > 0 ? monthlyAvg[i]! / monthlyCount[i]! : 0;
  }

  const maxAvg = Math.max(...monthlyAvg);
  const minAvg = Math.min(...monthlyAvg);

  const peakMonths = monthlyAvg
    .map((v, i) => ({ v, i }))
    .filter(x => x.v >= maxAvg * 0.8)
    .map(x => x.i + 1);

  const troughMonths = monthlyAvg
    .map((v, i) => ({ v, i }))
    .filter(x => x.v <= minAvg * 0.8 || (minAvg >= 0 && x.v <= minAvg * 1.2))
    .map(x => x.i + 1);

  const amplitude = mean !== 0 ? Math.abs(maxAvg - minAvg) / Math.abs(mean) : 0;

  return {
    cycle_months: bestCycle,
    peak_months: peakMonths,
    trough_months: troughMonths,
    amplitude: Math.round(amplitude * 1000) / 1000,
    confidence: Math.round(bestCorrelation * 1000) / 1000,
  };
}

/** Compare time series data against a benchmark */
function compareVsBenchmark(data: TimeSeriesPoint[], benchmark: TimeSeriesPoint[]): DeviationReport {
  // Match periods between data and benchmark
  const benchmarkMap = new Map(benchmark.map(b => [b.period, b.value]));

  let periodsAbove = 0;
  let periodsBelow = 0;
  let totalDeviation = 0;
  let maxDeviation = 0;
  let matchedCount = 0;

  for (const point of data) {
    const bv = benchmarkMap.get(point.period);
    if (bv === undefined) continue;
    matchedCount++;

    const deviation = bv !== 0 ? ((point.value - bv) / Math.abs(bv)) * 100 : 0;
    totalDeviation += deviation;
    const absDeviation = Math.abs(deviation);
    if (absDeviation > Math.abs(maxDeviation)) maxDeviation = deviation;

    if (point.value > bv) periodsAbove++;
    else if (point.value < bv) periodsBelow++;
  }

  const avgDeviation = matchedCount > 0 ? totalDeviation / matchedCount : 0;

  // Determine current status from last matched period
  const lastPoint = data[data.length - 1];
  const lastBenchmark = lastPoint ? benchmarkMap.get(lastPoint.period) : undefined;
  let currentStatus: 'above' | 'at' | 'below' = 'at';
  if (lastPoint && lastBenchmark !== undefined) {
    const tolerance = Math.abs(lastBenchmark) * 0.02; // 2% tolerance
    if (lastPoint.value > lastBenchmark + tolerance) currentStatus = 'above';
    else if (lastPoint.value < lastBenchmark - tolerance) currentStatus = 'below';
  }

  // Determine trend vs benchmark: compare first half vs second half deviation
  let trendVsBenchmark: 'converging' | 'stable' | 'diverging' = 'stable';
  if (matchedCount >= 4) {
    const mid = Math.floor(data.length / 2);
    let firstHalfDev = 0, firstCount = 0;
    let secondHalfDev = 0, secondCount = 0;

    for (let i = 0; i < data.length; i++) {
      const point = data[i]!;
      const bv = benchmarkMap.get(point.period);
      if (bv === undefined) continue;
      const dev = Math.abs(bv !== 0 ? ((point.value - bv) / Math.abs(bv)) * 100 : 0);
      if (i < mid) { firstHalfDev += dev; firstCount++; }
      else { secondHalfDev += dev; secondCount++; }
    }

    const avgFirst = firstCount > 0 ? firstHalfDev / firstCount : 0;
    const avgSecond = secondCount > 0 ? secondHalfDev / secondCount : 0;
    const change = avgSecond - avgFirst;

    if (change < -2) trendVsBenchmark = 'converging';
    else if (change > 2) trendVsBenchmark = 'diverging';
  }

  return {
    metric_name: data[0]?.period ? 'comparison' : '',
    periods_above: periodsAbove,
    periods_below: periodsBelow,
    avg_deviation_percent: Math.round(avgDeviation * 100) / 100,
    max_deviation_percent: Math.round(maxDeviation * 100) / 100,
    current_status: currentStatus,
    trend_vs_benchmark: trendVsBenchmark,
  };
}

/** Rolling average smoothing */
function rollingAverage(data: TimeSeriesPoint[], window: number): TimeSeriesPoint[] {
  return data.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
    return { period: point.period, value: Math.round(avg * 100) / 100 };
  });
}

/** Calculate trend factor for score adjustment */
function calculateTrendFactor(trends: TrendResult[]): TrendFactor {
  if (trends.length === 0) return 1.00;
  const critical = trends.filter(t => t.direction === 'critical').length;
  const deteriorating = trends.filter(t => t.direction === 'deteriorating').length;
  const improving = trends.filter(t => t.direction === 'improving').length;
  const total = trends.length;

  if (critical > 0) return 0.80;
  if (deteriorating / total > 0.5) return 0.90;
  if (deteriorating > 0) return 0.95;
  if (improving / total > 0.5) return 1.05;
  return 1.00;
}

export const trendUtils = {
  analyze,
  classify,
  project,
  detectBreakpoints,
  detectSeasonality,
  compareVsBenchmark,
  rollingAverage,
  calculateTrendFactor,
};
