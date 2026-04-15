import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CHART_COLORS } from '../lib/chartColors';

// ---------------------------------------------------------------------------
// Mock benchmark data by industry — mirrors DEFAULT_BENCHMARKS from benchmark.ts
// ---------------------------------------------------------------------------

interface BenchmarkRow {
  metric: string;
  label: string;
  category: 'financial' | 'operational' | 'efficiency';
  manufacturing: number;
  services: number;
  commerce: number;
  higherIsBetter: boolean;
}

const BENCHMARKS: BenchmarkRow[] = [
  { metric: 'dscr', label: 'DSCR', category: 'financial', manufacturing: 1.6, services: 1.4, commerce: 1.5, higherIsBetter: true },
  { metric: 'current_ratio', label: 'Razon Corriente', category: 'financial', manufacturing: 1.6, services: 1.4, commerce: 1.5, higherIsBetter: true },
  { metric: 'leverage', label: 'Apalancamiento', category: 'financial', manufacturing: 0.45, services: 0.55, commerce: 0.50, higherIsBetter: false },
  { metric: 'margin', label: 'Margen', category: 'financial', manufacturing: 0.12, services: 0.18, commerce: 0.15, higherIsBetter: true },
  { metric: 'dso', label: 'DSO (dias)', category: 'operational', manufacturing: 50, services: 40, commerce: 45, higherIsBetter: false },
  { metric: 'dpo', label: 'DPO (dias)', category: 'operational', manufacturing: 38, services: 30, commerce: 35, higherIsBetter: true },
  { metric: 'revenue_growth', label: 'Crecimiento Ingresos', category: 'operational', manufacturing: 0.06, services: 0.10, commerce: 0.08, higherIsBetter: true },
  { metric: 'employee_productivity', label: 'Productividad/Empleado', category: 'efficiency', manufacturing: 600000, services: 450000, commerce: 500000, higherIsBetter: true },
  { metric: 'working_capital_efficiency', label: 'Eficiencia Capital Trabajo', category: 'efficiency', manufacturing: 0.22, services: 0.18, commerce: 0.20, higherIsBetter: true },
];

const CATEGORIES = ['financial', 'operational', 'efficiency'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Financieros',
  operational: 'Operativos',
  efficiency: 'Eficiencia',
};

const SECTOR_COLORS: Record<string, string> = {
  manufacturing: CHART_COLORS.dataLine,
  services: CHART_COLORS.projectionLine,
  commerce: CHART_COLORS.info,
};

const SECTOR_LABELS: Record<string, string> = {
  manufacturing: 'Manufactura',
  services: 'Servicios',
  commerce: 'Comercio',
};

function formatValue(value: number, metric: string): string {
  if (metric === 'employee_productivity') return `$${(value / 1000).toFixed(0)}K`;
  if (metric === 'dso' || metric === 'dpo') return `${value}`;
  if (value < 1 && value > -1) return `${(value * 100).toFixed(0)}%`;
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategorySection({ category }: { category: string }) {
  const rows = BENCHMARKS.filter((b) => b.category === category);

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label={`Benchmarks ${CATEGORY_LABELS[category]}`}>
      <h3 className="text-sm font-semibold text-foreground mb-3">{CATEGORY_LABELS[category]}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Metrica</th>
              {Object.keys(SECTOR_LABELS).map((s) => (
                <th key={s} className="text-right py-2 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s] }} aria-hidden="true" />
                    {SECTOR_LABELS[s]}
                  </span>
                </th>
              ))}
              <th className="text-center py-2 text-xs font-medium text-muted-foreground">Direccion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} className="border-b border-border/50">
                <td className="py-2 text-foreground">{r.label}</td>
                <td className="py-2 text-right text-foreground font-medium">{formatValue(r.manufacturing, r.metric)}</td>
                <td className="py-2 text-right text-foreground font-medium">{formatValue(r.services, r.metric)}</td>
                <td className="py-2 text-right text-foreground font-medium">{formatValue(r.commerce, r.metric)}</td>
                <td className="py-2 text-center text-xs text-muted-foreground">
                  {r.higherIsBetter ? '↑ Mayor mejor' : '↓ Menor mejor'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonChart() {
  const chartData = BENCHMARKS.filter((b) => b.category === 'financial').map((b) => ({
    name: b.label,
    manufacturing: b.manufacturing,
    services: b.services,
    commerce: b.commerce,
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Comparacion Visual">
      <h3 className="text-sm font-semibold text-foreground mb-3">Comparacion por Sector — Financieros</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART_COLORS.benchmarkLine} />
          <Bar dataKey="manufacturing" name="Manufactura" fill={SECTOR_COLORS.manufacturing} radius={[2, 2, 0, 0]} />
          <Bar dataKey="services" name="Servicios" fill={SECTOR_COLORS.services} radius={[2, 2, 0, 0]} />
          <Bar dataKey="commerce" name="Comercio" fill={SECTOR_COLORS.commerce} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function BenchmarksPage() {
  return (
    <div>
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a solicitudes
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Benchmarks por Industria</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Valores de referencia por sector, tamano y region
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {Object.entries(SECTOR_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SECTOR_COLORS[key] }} aria-hidden="true" />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <ComparisonChart />
        {CATEGORIES.map((cat) => (
          <CategorySection key={cat} category={cat} />
        ))}
      </div>
    </div>
  );
}