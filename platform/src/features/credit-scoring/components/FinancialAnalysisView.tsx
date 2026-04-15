import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  DollarSign, BarChart3, PieChart, Target, Calculator,
} from 'lucide-react';
import { CHART_COLORS } from '../lib/chartColors';
import type { BalanceData, IncomeData } from '../engines/financial';
import type { RazonesFinancieras } from '../api/syntageClient';
import type {
  CombinedScoringResult,
  PortfolioExpectedLossResult,
} from '../types/scoring.types';

// ============================================================
// Props
// ============================================================

export interface FinancialAnalysisViewProps {
  balances: BalanceData[];
  incomes: IncomeData[];
  razones: RazonesFinancieras;
  internalScoring: CombinedScoringResult | null;
  expectedLoss: PortfolioExpectedLossResult | null;
}

// ============================================================
// Helpers
// ============================================================

const fmt = (v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtMoney = (v: number) => `$${fmt(v)}`;

function Section({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3" role="region" aria-label={title}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="w-3 h-3 text-muted-foreground" aria-hidden="true" />;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (pct > 1) return <span className="flex items-center gap-0.5 text-status-success text-[10px]"><TrendingUp className="w-3 h-3" aria-hidden="true" />+{pct.toFixed(1)}%</span>;
  if (pct < -1) return <span className="flex items-center gap-0.5 text-status-error text-[10px]"><TrendingDown className="w-3 h-3" aria-hidden="true" />{pct.toFixed(1)}%</span>;
  return <Minus className="w-3 h-3 text-muted-foreground" aria-hidden="true" />;
}


// ============================================================
// 1. Balance General (tabla comparativa año vs año)
// ============================================================

function BalanceGeneralSection({ balances }: { balances: BalanceData[] }) {
  const sorted = [...balances].sort((a, b) => a.fiscal_year - b.fiscal_year);

  const rows: Array<{ label: string; key: keyof BalanceData; indent?: boolean }> = [
    { label: 'Activo Total', key: 'total_assets' },
    { label: 'Activo Circulante', key: 'current_assets', indent: true },
    { label: 'Efectivo', key: 'cash', indent: true },
    { label: 'Cuentas por Cobrar', key: 'accounts_receivable', indent: true },
    { label: 'Inventarios', key: 'inventory', indent: true },
    { label: 'Activo Fijo', key: 'fixed_assets', indent: true },
    { label: 'Pasivo Total', key: 'total_liabilities' },
    { label: 'Pasivo Circulante', key: 'current_liabilities', indent: true },
    { label: 'Deuda LP', key: 'long_term_debt', indent: true },
    { label: 'Capital Contable', key: 'equity' },
  ];

  return (
    <Section title="Balance General" icon={BarChart3}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Concepto</th>
              {sorted.map((b) => (
                <th key={b.fiscal_year} className="py-2 pr-3 font-medium text-right">{b.fiscal_year}</th>
              ))}
              {sorted.length >= 2 && <th className="py-2 font-medium text-right">Var.</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className={`py-1.5 pr-3 text-foreground ${row.indent ? 'pl-4' : 'font-medium'}`}>
                  {row.label}
                </td>
                {sorted.map((b) => (
                  <td key={b.fiscal_year} className="py-1.5 pr-3 text-right text-foreground">
                    {fmtMoney(b[row.key] as number)}
                  </td>
                ))}
                {sorted.length >= 2 && (
                  <td className="py-1.5 text-right">
                    <ChangeIndicator
                      current={sorted[sorted.length - 1]![row.key] as number}
                      previous={sorted[sorted.length - 2]![row.key] as number}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ============================================================
// 2. Estado de Resultados
// ============================================================

function EstadoResultadosSection({ incomes }: { incomes: IncomeData[] }) {
  const sorted = [...incomes].sort((a, b) => a.fiscal_year - b.fiscal_year);

  const rows: Array<{ label: string; key: keyof IncomeData; indent?: boolean; bold?: boolean }> = [
    { label: 'Ingresos', key: 'revenue', bold: true },
    { label: 'Costo de Ventas', key: 'cost_of_goods', indent: true },
    { label: 'Utilidad Bruta', key: 'gross_profit', bold: true },
    { label: 'Gastos Operativos', key: 'operating_expenses', indent: true },
    { label: 'Utilidad Operativa', key: 'operating_income', bold: true },
    { label: 'Gastos Financieros', key: 'interest_expense', indent: true },
    { label: 'Utilidad Neta', key: 'net_income', bold: true },
    { label: 'EBITDA', key: 'ebitda', bold: true },
    { label: 'Depreciacion', key: 'depreciation', indent: true },
  ];

  // Calculate margins for the latest year
  const latest = sorted[sorted.length - 1];
  const margins = latest ? [
    { label: 'Margen Bruto', value: latest.revenue > 0 ? latest.gross_profit / latest.revenue : 0 },
    { label: 'Margen Operativo', value: latest.revenue > 0 ? latest.operating_income / latest.revenue : 0 },
    { label: 'Margen Neto', value: latest.revenue > 0 ? latest.net_income / latest.revenue : 0 },
    { label: 'Margen EBITDA', value: latest.revenue > 0 ? latest.ebitda / latest.revenue : 0 },
  ] : [];

  return (
    <Section title="Estado de Resultados" icon={DollarSign}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Concepto</th>
              {sorted.map((i) => (
                <th key={i.fiscal_year} className="py-2 pr-3 font-medium text-right">{i.fiscal_year}</th>
              ))}
              {sorted.length >= 2 && <th className="py-2 font-medium text-right">Var.</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className={`py-1.5 pr-3 text-foreground ${row.indent ? 'pl-4' : ''} ${row.bold ? 'font-medium' : ''}`}>
                  {row.label}
                </td>
                {sorted.map((i) => (
                  <td key={i.fiscal_year} className={`py-1.5 pr-3 text-right text-foreground ${row.bold ? 'font-medium' : ''}`}>
                    {fmtMoney(i[row.key] as number)}
                  </td>
                ))}
                {sorted.length >= 2 && (
                  <td className="py-1.5 text-right">
                    <ChangeIndicator
                      current={sorted[sorted.length - 1]![row.key] as number}
                      previous={sorted[sorted.length - 2]![row.key] as number}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Margin cards */}
      {margins.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {margins.map((m) => (
            <div key={m.label} className="bg-muted/30 rounded-md p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-sm font-bold text-foreground">{fmtPct(m.value)}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}


// ============================================================
// 3. Razones Financieras
// ============================================================

interface RazonItem {
  label: string;
  value: number;
  benchmark: number;
  unit: string;
  isMoney?: boolean;
  isPct?: boolean;
  invertBenchmark?: boolean;
}

function RazonesFinancierasSection({ razones }: { razones: RazonesFinancieras }) {
  const liq = razones.liquidez ?? {};
  const rent = razones.rentabilidad ?? {};
  const apal = razones.apalancamiento ?? {};
  const act = razones.actividad ?? {};
  const cob = razones.cobertura ?? {};

  const categories: Array<{ title: string; items: RazonItem[] }> = [
    {
      title: 'Liquidez',
      items: [
        { label: 'Coeficiente de Solvencia', value: liq.coeficiente_solvencia ?? 0, benchmark: 1.5, unit: 'x' },
        { label: 'Prueba Acida', value: liq.prueba_acida ?? 0, benchmark: 1.0, unit: 'x' },
        { label: 'Capital de Trabajo', value: liq.capital_trabajo ?? 0, benchmark: 0, unit: 'MXN', isMoney: true },
      ],
    },
    {
      title: 'Rentabilidad',
      items: [
        { label: 'Margen Bruto', value: rent.margen_bruto ?? 0, benchmark: 0.30, unit: '%', isPct: true },
        { label: 'Margen Operativo', value: rent.margen_operativo ?? 0, benchmark: 0.15, unit: '%', isPct: true },
        { label: 'Margen Neto', value: rent.margen_neto ?? 0, benchmark: 0.08, unit: '%', isPct: true },
        { label: 'ROE', value: rent.roe ?? 0, benchmark: 0.15, unit: '%', isPct: true },
      ],
    },
    {
      title: 'Apalancamiento',
      items: [
        { label: 'Endeudamiento', value: apal.coeficiente_endeudamiento ?? 0, benchmark: 2.0, unit: 'x', invertBenchmark: true },
        { label: 'Razon de Deuda', value: apal.razon_deuda ?? 0, benchmark: 0.60, unit: '%', isPct: true, invertBenchmark: true },
      ],
    },
    {
      title: 'Actividad',
      items: [
        { label: 'Rotacion CxC', value: act.rotacion_cxc ?? 0, benchmark: 6.0, unit: 'veces' },
        { label: 'Rotacion Inventarios', value: act.rotacion_inventarios ?? 0, benchmark: 5.0, unit: 'veces' },
        { label: 'Rotacion CxP', value: act.rotacion_cxp ?? 0, benchmark: 6.0, unit: 'veces' },
      ],
    },
    {
      title: 'Cobertura',
      items: [
        { label: 'Cobertura de Intereses', value: cob.cobertura_intereses ?? 0, benchmark: 3.0, unit: 'x' },
      ],
    },
  ];

  return (
    <Section title="Razones Financieras" icon={PieChart}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-muted/20 rounded-md p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2">{cat.title}</h4>
            <div className="flex flex-col gap-1.5">
              {cat.items.map((item) => {
                const displayValue = item.isMoney
                  ? fmtMoney(item.value)
                  : item.isPct
                    ? fmtPct(item.value)
                    : `${item.value.toFixed(2)}${item.unit === 'x' ? 'x' : ` ${item.unit}`}`;

                const isGood = item.isMoney
                  ? item.value > 0
                  : item.invertBenchmark
                    ? item.value <= item.benchmark
                    : item.value >= item.benchmark;

                return (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-medium ${isGood ? 'text-status-success' : 'text-status-error'}`}>
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ============================================================
// 4. Scoring Interno (Solvencia 1300pts + Combinado 1800pts)
// ============================================================

function ScoringInternoSection({ scoring }: { scoring: CombinedScoringResult }) {
  const solvenciaData = scoring.solvencia.variables.map((v) => ({
    variable: v.label,
    score: v.score,
    max: v.maxScore,
    pct: v.maxScore > 0 ? Math.round((v.score / v.maxScore) * 100) : 0,
  }));

  const categoryData = scoring.categories.map((c) => ({
    category: c.label,
    score: c.score,
    max: c.maxScore,
    pct: c.percentage,
  }));

  // Radar data for combined categories
  const radarData = scoring.categories.map((c) => ({
    subject: c.label.length > 15 ? c.label.slice(0, 15) + '...' : c.label,
    value: c.percentage,
    fullMark: 100,
  }));

  const risk = scoring.riskClassification;
  const riskColor = risk.level === 'bajo' ? CHART_COLORS.success
    : risk.level === 'medio_bajo' ? CHART_COLORS.info
    : risk.level === 'medio_alto' ? CHART_COLORS.warning
    : CHART_COLORS.error;

  return (
    <Section title="Scoring Interno de Otorgamiento" icon={Target}>
      {/* Risk classification banner */}
      <div
        className="rounded-md p-3 flex items-center justify-between"
        style={{ backgroundColor: `${riskColor}15`, border: `1px solid ${riskColor}40` }}
      >
        <div className="flex items-center gap-2">
          {risk.level === 'bajo' || risk.level === 'medio_bajo'
            ? <CheckCircle className="w-4 h-4" style={{ color: riskColor }} aria-hidden="true" />
            : <AlertTriangle className="w-4 h-4" style={{ color: riskColor }} aria-hidden="true" />
          }
          <div>
            <p className="text-xs font-semibold" style={{ color: riskColor }}>
              Riesgo: {risk.label}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Score {scoring.score}/{scoring.maxScore} ({scoring.percentage.toFixed(1)}%) — {scoring.approved ? 'Aprobado' : 'No aprobado'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Linea max: {(risk.maxCreditLinePct * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">Garantia: {risk.guaranteeLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solvencia table (1300 pts) */}
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2">
            Capa 1: Solvencia ({scoring.solvencia.score}/{scoring.solvencia.maxScore} pts)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Variable</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Score</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Max</th>
                  <th className="py-1.5 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {solvenciaData.map((row) => (
                  <tr key={row.variable} className="border-b border-border/50">
                    <td className="py-1 pr-2 text-foreground">{row.variable}</td>
                    <td className="py-1 pr-2 text-right font-medium text-foreground">{row.score}</td>
                    <td className="py-1 pr-2 text-right text-muted-foreground">{row.max}</td>
                    <td className="py-1 text-right">
                      <span className={`font-medium ${row.pct >= 70 ? 'text-status-success' : row.pct >= 40 ? 'text-status-warning' : 'text-status-error'}`}>
                        {row.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Combined radar chart */}
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2">
            Capa 2: Combinado ({scoring.score}/{scoring.maxScore} pts)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(215, 16%, 85%)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: CHART_COLORS.text }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar
                dataKey="value"
                stroke={CHART_COLORS.dataLine}
                fill={CHART_COLORS.dataLine}
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Combined categories detail */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Categoria</th>
              <th className="py-1.5 pr-2 font-medium text-right">Score</th>
              <th className="py-1.5 pr-2 font-medium text-right">Max</th>
              <th className="py-1.5 pr-2 font-medium text-right">%</th>
              <th className="py-1.5 font-medium" style={{ width: '40%' }}>Barra</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map((row) => {
              const barColor = row.pct >= 70 ? CHART_COLORS.success : row.pct >= 40 ? CHART_COLORS.warning : CHART_COLORS.error;
              return (
                <tr key={row.category} className="border-b border-border/50">
                  <td className="py-1.5 pr-2 font-medium text-foreground">{row.category}</td>
                  <td className="py-1.5 pr-2 text-right text-foreground">{row.score}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{row.max}</td>
                  <td className="py-1.5 pr-2 text-right font-medium" style={{ color: barColor }}>{row.pct.toFixed(0)}%</td>
                  <td className="py-1.5">
                    <div className="w-full bg-muted/40 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${row.pct}%`, backgroundColor: barColor }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}


// ============================================================
// 5. Perdida Esperada (PE = PD x EAD x LGD)
// ============================================================

function PerdidaEsperadaSection({ data }: { data: PortfolioExpectedLossResult }) {
  const barData = data.distributionByCategory.map((d) => ({
    name: d.category,
    pe: d.totalPe,
    ead: d.totalEad,
    clients: d.clientCount,
  }));

  return (
    <Section title="Perdida Esperada (PE = PD x EAD x LGD)" icon={Calculator}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground">EAD Total</p>
          <p className="text-sm font-bold text-foreground">{fmtMoney(data.totalEad)}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground">PE Total</p>
          <p className="text-sm font-bold text-status-error">{fmtMoney(data.totalExpectedLoss)}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground">PE / EAD</p>
          <p className="text-sm font-bold text-foreground">{data.portfolioPePct.toFixed(2)}%</p>
        </div>
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Clientes</p>
          <p className="text-sm font-bold text-foreground">{data.clientCount}</p>
        </div>
      </div>

      {/* Distribution chart */}
      {barData.length > 0 && (
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-foreground mb-2">Distribucion por Categoria de Atraso</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_COLORS.text }} />
              <YAxis tick={{ fontSize: 9, fill: CHART_COLORS.text }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => fmtMoney(value)}
                contentStyle={{ fontSize: 11, backgroundColor: 'hsl(0,0%,100%)', border: '1px solid hsl(215,16%,85%)' }}
              />
              <Bar dataKey="pe" name="PE" radius={[4, 4, 0, 0]}>
                {barData.map((_, idx) => (
                  <Cell key={idx} fill={idx === 0 ? CHART_COLORS.success : idx <= 2 ? CHART_COLORS.warning : CHART_COLORS.error} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Client detail table */}
      <div className="overflow-x-auto mt-2">
        <h4 className="text-xs font-semibold text-foreground mb-2">Detalle por Cliente</h4>
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Cliente</th>
              <th className="py-1.5 pr-2 font-medium text-right">EAD</th>
              <th className="py-1.5 pr-2 font-medium text-right">Dias Atraso</th>
              <th className="py-1.5 pr-2 font-medium text-right">PD</th>
              <th className="py-1.5 pr-2 font-medium text-right">LGD</th>
              <th className="py-1.5 pr-2 font-medium text-right">PE</th>
              <th className="py-1.5 font-medium text-right">PE %</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c) => (
              <tr key={c.clientId} className="border-b border-border/50">
                <td className="py-1 pr-2 text-foreground font-medium">{c.clientName}</td>
                <td className="py-1 pr-2 text-right text-foreground">{fmtMoney(c.ead)}</td>
                <td className="py-1 pr-2 text-right text-muted-foreground">{c.daysPastDue}</td>
                <td className="py-1 pr-2 text-right text-muted-foreground">{(c.pd * 100).toFixed(1)}%</td>
                <td className="py-1 pr-2 text-right text-muted-foreground">{(c.lgd * 100).toFixed(0)}%</td>
                <td className="py-1 pr-2 text-right text-status-error font-medium">{fmtMoney(c.expectedLoss)}</td>
                <td className="py-1 text-right text-muted-foreground">{c.expectedLossPct.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ============================================================
// Main Component
// ============================================================

export function FinancialAnalysisView({
  balances,
  incomes,
  razones,
  internalScoring,
  expectedLoss,
}: FinancialAnalysisViewProps) {
  return (
    <div className="flex flex-col gap-4" role="region" aria-label="Analisis Financiero">
      <BalanceGeneralSection balances={balances} />
      <EstadoResultadosSection incomes={incomes} />
      <RazonesFinancierasSection razones={razones} />
      {internalScoring && <ScoringInternoSection scoring={internalScoring} />}
      {expectedLoss && <PerdidaEsperadaSection data={expectedLoss} />}
    </div>
  );
}
