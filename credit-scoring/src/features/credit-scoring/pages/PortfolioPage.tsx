import { Link } from 'react-router-dom';
import { ArrowLeft, PieChart } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from 'recharts';
import { CHART_COLORS } from '../lib/chartColors';

// ---------------------------------------------------------------------------
// Mock data — will be replaced with hooks + Supabase queries
// ---------------------------------------------------------------------------

const SECTOR_DATA = [
  { name: 'Manufactura', amount: 45_000_000, pct: 35 },
  { name: 'Servicios', amount: 32_000_000, pct: 25 },
  { name: 'Comercio', amount: 25_000_000, pct: 20 },
  { name: 'Tecnologia', amount: 15_000_000, pct: 12 },
  { name: 'Otros', amount: 10_000_000, pct: 8 },
];

const CURRENCY_DATA = [
  { name: 'MXN', amount: 95_000_000, pct: 75 },
  { name: 'USD', amount: 32_000_000, pct: 25 },
];

const TOP_CLIENTS = [
  { name: 'Empresa Alpha', amount: 12_000_000, sector: 'Manufactura', status: 'active' },
  { name: 'Grupo Beta', amount: 8_500_000, sector: 'Servicios', status: 'active' },
  { name: 'Corp Gamma', amount: 7_200_000, sector: 'Comercio', status: 'active' },
  { name: 'Tech Delta', amount: 6_800_000, sector: 'Tecnologia', status: 'active' },
  { name: 'Industrias Epsilon', amount: 5_500_000, sector: 'Manufactura', status: 'review' },
];

const PIE_COLORS = [
  CHART_COLORS.dataLine,
  CHART_COLORS.projectionLine,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.benchmarkLine,
];

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectorExposure() {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Exposicion por Sector">
      <h3 className="text-sm font-semibold text-foreground mb-3">Exposicion por Sector</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={SECTOR_DATA} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatAmount(v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
          <Tooltip formatter={(value: number) => [formatAmount(value), 'Monto']} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {SECTOR_DATA.map((_, idx) => (
              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CurrencyExposure() {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Exposicion por Moneda">
      <h3 className="text-sm font-semibold text-foreground mb-3">Exposicion por Moneda</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={180}>
          <RechartsPie>
            <Pie
              data={CURRENCY_DATA}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, pct }) => `${name} ${pct}%`}
            >
              {CURRENCY_DATA.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [formatAmount(value), 'Monto']} />
          </RechartsPie>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2">
          {CURRENCY_DATA.map((c, idx) => (
            <div key={c.name} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="text-foreground font-medium">{c.name}</span>
              <span className="text-muted-foreground">{formatAmount(c.amount)} ({c.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopClients() {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Top Clientes">
      <h3 className="text-sm font-semibold text-foreground mb-3">Top Clientes por Exposicion</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Cliente</th>
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Sector</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Exposicion</th>
              <th className="text-center py-2 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {TOP_CLIENTS.map((client) => (
              <tr key={client.name} className="border-b border-border/50">
                <td className="py-2 text-foreground">{client.name}</td>
                <td className="py-2 text-muted-foreground">{client.sector}</td>
                <td className="py-2 text-right text-foreground font-medium">{formatAmount(client.amount)}</td>
                <td className="py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    client.status === 'active'
                      ? 'bg-status-success-bg text-status-success'
                      : 'bg-status-warning-bg text-status-warning'
                  }`}>
                    {client.status === 'active' ? 'Activo' : 'Revision'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PortfolioPage() {
  const totalExposure = SECTOR_DATA.reduce((s, d) => s + d.amount, 0);

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
        <PieChart className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Portfolio</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Exposicion total: {formatAmount(totalExposure)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectorExposure />
        <CurrencyExposure />
      </div>

      <TopClients />
    </div>
  );
}
