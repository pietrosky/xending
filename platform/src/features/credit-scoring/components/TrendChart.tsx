import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';
import type { TrendResult, TrendDirection } from '../types/trend.types';
import { CHART_COLORS, GRADE_COLORS } from '../lib/chartColors';

// --- Helpers ---

const DIRECTION_ICON: Record<TrendDirection, typeof TrendingUp> = {
  improving: TrendingUp,
  stable: Minus,
  deteriorating: TrendingDown,
  critical: TrendingDown,
};

const DIRECTION_LABEL: Record<TrendDirection, string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  deteriorating: 'Deteriorando',
  critical: 'Critico',
};

const DIRECTION_COLOR: Record<TrendDirection, string> = {
  improving: 'text-status-success',
  stable: 'text-muted-foreground',
  deteriorating: 'text-status-warning',
  critical: 'text-status-error',
};

/** Format a value based on the y_axis_format string */
function formatValue(value: number, format: string): string {
  switch (format) {
    case '$':
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case '%':
      return `${value.toFixed(1)}%`;
    case 'x':
      return `${value.toFixed(2)}x`;
    case 'dias':
      return `${Math.round(value)}d`;
    default:
      return value.toLocaleString('es-MX', { maximumFractionDigits: 1 });
  }
}

/** Short period label: "2025-01" → "Ene 25" */
function shortPeriod(period: string): string {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const parts = period.split('-');
  if (parts.length < 2) return period;
  const monthIdx = parseInt(parts[1] ?? '0', 10) - 1;
  const year = (parts[0] ?? '').slice(2);
  return `${months[monthIdx] ?? period} ${year}`;
}


/**
 * Build the merged dataset for the ComposedChart.
 * Each point has: period, value (real), projection, benchmark, and zone fill helpers.
 */
function buildChartData(trend: TrendResult) {
  const { time_series, projection, chart_config } = trend;
  const { thresholds, higher_is_better } = chart_config;

  // Real data points
  const realMap = new Map(time_series.map((p) => [p.period, p]));
  // Projection points
  const projMap = new Map(projection.map((p) => [p.period, p]));

  // Collect all unique periods in order
  const allPeriods = [
    ...time_series.map((p) => p.period),
    ...projection.filter((p) => !realMap.has(p.period)).map((p) => p.period),
  ];

  return allPeriods.map((period) => {
    const real = realMap.get(period);
    const proj = projMap.get(period);
    const value = real?.value ?? null;
    const projValue = proj?.value ?? null;
    const benchmark = real?.benchmark ?? proj?.benchmark ?? thresholds.benchmark ?? null;

    // Determine zone color for this value
    const v = value ?? projValue;
    let zone: string | null = null;
    if (v !== null && thresholds.critical !== undefined && thresholds.warning !== undefined) {
      if (higher_is_better) {
        zone = v >= thresholds.warning ? CHART_COLORS.zoneOk
          : v >= thresholds.critical ? CHART_COLORS.zoneWarning
          : CHART_COLORS.zoneCritical;
      } else {
        zone = v <= thresholds.warning ? CHART_COLORS.zoneOk
          : v <= thresholds.critical ? CHART_COLORS.zoneWarning
          : CHART_COLORS.zoneCritical;
      }
    }

    return {
      period,
      periodLabel: shortPeriod(period),
      value,
      projection: projValue,
      benchmark,
      zone,
    };
  });
}

// --- Custom Tooltip ---

interface TooltipPayloadEntry {
  dataKey: string;
  value: number | null;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  format: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const labels: Record<string, string> = {
    value: 'Real',
    projection: 'Proyeccion',
    benchmark: 'Benchmark',
  };

  return (
    <div className="bg-card rounded border border-border p-2 shadow-sm text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload
        .filter((entry) => entry.value !== null && entry.value !== undefined)
        .map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {labels[entry.dataKey] ?? entry.dataKey}: {formatValue(entry.value as number, format)}
          </p>
        ))}
    </div>
  );
}

// --- Main Component ---

interface TrendChartProps {
  trend: TrendResult;
}

export function TrendChart({ trend }: TrendChartProps) {
  const data = buildChartData(trend);
  const { chart_config, classification, direction, months_to_threshold } = trend;
  const { thresholds, y_axis_format } = chart_config;

  const Icon = DIRECTION_ICON[direction];
  const gradeColor = GRADE_COLORS[classification] ?? CHART_COLORS.text;

  return (
    <article
      className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3"
      aria-label={`Tendencia ${trend.metric_label}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{trend.metric_label}</h3>
          <p className="text-xs text-muted-foreground">
            {formatValue(trend.current_value, y_axis_format)} {trend.unit}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Direction badge */}
          <span className={`flex items-center gap-1 text-xs ${DIRECTION_COLOR[direction]}`}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {DIRECTION_LABEL[direction]}
          </span>
          {/* Classification badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ color: gradeColor, backgroundColor: `${gradeColor}18` }}
            aria-label={`Clasificacion ${classification}`}
          >
            {classification}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 90%)" />
            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 10, fill: CHART_COLORS.text }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_COLORS.text }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatValue(v, y_axis_format)}
            />
            <Tooltip content={<ChartTooltip format={y_axis_format} />} />

            {/* Threshold reference lines */}
            {thresholds.warning !== undefined && (
              <ReferenceLine
                y={thresholds.warning}
                stroke={CHART_COLORS.warning}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Warning', fontSize: 9, fill: CHART_COLORS.warning, position: 'right' }}
              />
            )}
            {thresholds.critical !== undefined && (
              <ReferenceLine
                y={thresholds.critical}
                stroke={CHART_COLORS.error}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Critical', fontSize: 9, fill: CHART_COLORS.error, position: 'right' }}
              />
            )}

            {/* Benchmark line */}
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke={CHART_COLORS.benchmarkLine}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              name="Benchmark"
            />

            {/* Projection line (dashed teal) */}
            <Line
              type="monotone"
              dataKey="projection"
              stroke={CHART_COLORS.projectionLine}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
              name="Proyeccion"
            />

            {/* Real data line (solid primary) */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.dataLine}
              strokeWidth={2}
              fill={`${CHART_COLORS.dataLine}15`}
              dot={{ r: 3, fill: CHART_COLORS.dataLine, strokeWidth: 0 }}
              connectNulls
              name="Real"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer: months to threshold */}
      {months_to_threshold !== undefined && months_to_threshold > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-status-warning">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {months_to_threshold} {months_to_threshold === 1 ? 'mes' : 'meses'} para cruzar umbral{' '}
            {trend.threshold_type === 'critical' ? 'critico' : 'de alerta'}
          </span>
        </div>
      )}
    </article>
  );
}
