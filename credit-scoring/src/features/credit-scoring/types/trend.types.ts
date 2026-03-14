// Interfaz estándar de tendencias — todos los motores la usan

export type TrendDirection = 'improving' | 'stable' | 'deteriorating' | 'critical';
export type TrendSpeed = 'slow' | 'moderate' | 'fast';
export type TrendClassification = 'A' | 'B' | 'C' | 'D' | 'F';

export interface TimeSeriesPoint {
  period: string;
  value: number;
  benchmark?: number;
}

export interface TrendResult {
  metric_name: string;
  metric_label: string;
  unit: string;

  // Data
  time_series: TimeSeriesPoint[];
  current_value: number;
  previous_value: number;

  // Tendencia calculada
  direction: TrendDirection;
  speed: TrendSpeed;
  change_percent: number;
  change_absolute: number;

  // Regresión
  slope: number;
  r_squared: number;
  trend_line: TimeSeriesPoint[];

  // Proyección
  projection: TimeSeriesPoint[];
  months_to_threshold?: number;
  threshold_value?: number;
  threshold_type?: 'warning' | 'critical';

  // Clasificación
  classification: TrendClassification;
  risk_flags: string[];

  // Para gráficos
  chart_config: TrendChartConfig;
}

export interface TrendChartConfig {
  thresholds: {
    warning?: number;
    critical?: number;
    benchmark?: number;
  };
  higher_is_better: boolean;
  y_axis_format: string; // "$", "dias", "%", "x"
}

export interface TrendConfig {
  metric_name: string;
  metric_label: string;
  unit: string;
  higher_is_better: boolean;
  warning_threshold?: number;
  critical_threshold?: number;
  benchmark_value?: number;
  projection_months: number;
  y_axis_format: string;
}

/** Factor de tendencia aplicado al score del motor */
export type TrendFactor = 0.80 | 0.90 | 0.95 | 1.00 | 1.05;

/** Punto de quiebre detectado en una serie temporal */
export interface BreakPoint {
  period: string;
  value: number;
  previous_value: number;
  change_percent: number;
  direction: 'up' | 'down';
  significance: number;
}

/** Patrón estacional detectado en una serie temporal */
export interface SeasonalPattern {
  cycle_months: number;
  peak_months: number[];
  trough_months: number[];
  amplitude: number;
  confidence: number;
}

/** Reporte de desviación vs benchmark */
export interface DeviationReport {
  metric_name: string;
  periods_above: number;
  periods_below: number;
  avg_deviation_percent: number;
  max_deviation_percent: number;
  current_status: 'above' | 'at' | 'below';
  trend_vs_benchmark: 'converging' | 'stable' | 'diverging';
}
