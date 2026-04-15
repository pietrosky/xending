// Interfaz base que TODOS los engines implementan

export type ModuleStatus = 'pass' | 'fail' | 'warning' | 'blocked';
export type ModuleGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type FlagSeverity = 'info' | 'warning' | 'critical' | 'hard_stop';
export type ScoreImpact = 'positive' | 'neutral' | 'negative';
export type BenchmarkStatus = 'above' | 'at' | 'below';

export interface RiskFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

export interface MetricValue {
  name: string;
  label: string;
  value: number;
  unit: string;
  source: string;
  formula?: string;
  interpretation: string;
  impact_on_score: ScoreImpact;
}

export interface BenchmarkComparison {
  metric: string;
  applicant_value: number;
  benchmark_value: number;
  deviation_percent: number;
  status: BenchmarkStatus;
}

export interface EngineInput {
  application_id: string;
  syntage_data?: unknown;
  documents?: unknown;
  other_engine_results?: Record<string, EngineOutput>;
  policy_config: PolicyConfig;
}

export interface EngineOutput {
  engine_name: string;
  module_status: ModuleStatus;
  module_score: number;
  module_max_score: number;
  module_grade: ModuleGrade;
  risk_flags: RiskFlag[];
  key_metrics: Record<string, MetricValue>;
  benchmark_comparison: Record<string, BenchmarkComparison>;
  trends: import('./trend.types').TrendResult[];
  explanation: string;
  recommended_actions: string[];
  created_at: string;
}

export interface PolicyConfig {
  guarantee_base_ratio: number;
  score_weights: Record<string, number>;
  hard_stop_rules: HardStopRule[];
  sector_limits: Record<string, number>;
  currency_limits: Record<string, number>;
}

export interface HardStopRule {
  code: string;
  description: string;
  engine: string;
  condition: string;
  active: boolean;
}

/** Score weights for Gate 3 consolidated score */
export const SCORE_WEIGHTS: Record<string, number> = {
  cashflow: 0.16,
  sat_facturacion: 0.14,
  financial: 0.11,
  buro: 0.10,
  stability: 0.09,
  operational: 0.09,
  network: 0.08,
  fx_risk: 0.07,
  portfolio: 0.05,
  working_capital: 0.04,
  documentation: 0.04,
  employee: 0.03,
};

/** Engines that act as gates (block but don't contribute to weighted score) */
export const GATE_ENGINES = ['compliance', 'guarantee', 'graph_fraud'] as const;
