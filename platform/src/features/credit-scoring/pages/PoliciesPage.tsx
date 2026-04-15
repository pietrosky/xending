import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, FileText, Settings } from 'lucide-react';
import { CHART_COLORS } from '../lib/chartColors';
import {
  DEFAULT_SECTOR_LIMITS,
  DEFAULT_GUARANTEE_POLICY,
  DEFAULT_HARD_STOPS,
  DEFAULT_COVENANT_TEMPLATES,
} from '../engines/policyEngine';
import type { SectorLimitConfig, CovenantTemplate } from '../engines/policyEngine';
import type { HardStopRule } from '../types/engine.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

const SECTOR_LABELS: Record<string, string> = {
  manufacturing: 'Manufactura',
  services: 'Servicios',
  commerce: 'Comercio',
  default: 'Default',
};

const OPERATOR_LABELS: Record<string, string> = {
  gte: '>=',
  lte: '<=',
  gt: '>',
  lt: '<',
};

const TYPE_COLORS: Record<string, string> = {
  financial: CHART_COLORS.dataLine,
  reporting: CHART_COLORS.info,
  operational: CHART_COLORS.warning,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectorLimitsTable({ limits }: { limits: SectorLimitConfig[] }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Limites por Sector">
      <div className="flex items-center gap-2 mb-3">
        <Settings size={16} className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Limites por Sector</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Sector</th>
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Moneda</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Min</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Max</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Plazo Max</th>
            </tr>
          </thead>
          <tbody>
            {limits.map((l, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-2 text-foreground">{SECTOR_LABELS[l.sector] ?? l.sector}</td>
                <td className="py-2 text-muted-foreground">{l.currency}</td>
                <td className="py-2 text-right text-foreground">{formatAmount(l.min_amount)}</td>
                <td className="py-2 text-right text-foreground font-medium">{formatAmount(l.max_amount)}</td>
                <td className="py-2 text-right text-muted-foreground">{l.max_term_months}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HardStopsPanel({ stops }: { stops: HardStopRule[] }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Hard Stops">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-status-danger" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Hard Stops</h3>
      </div>
      <div className="space-y-2">
        {stops.map((s) => (
          <div key={s.code} className="flex items-start gap-3 p-2 rounded bg-muted/30">
            <span
              className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${s.active ? 'bg-status-danger' : 'bg-muted-foreground'}`}
              aria-label={s.active ? 'Activo' : 'Inactivo'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">{s.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Motor: {s.engine} &middot; Condicion: <code className="text-xs">{s.condition}</code>
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              s.active ? 'bg-status-danger-bg text-status-danger' : 'bg-muted text-muted-foreground'
            }`}>
              {s.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuaranteePolicyPanel() {
  const gp = DEFAULT_GUARANTEE_POLICY;
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Politica de Garantias">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Politica de Garantias</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Ratio base: <span className="text-foreground font-medium">{gp.base_ratio}x</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Ajustes por Score</p>
          {gp.score_adjustments.map((sa, i) => (
            <div key={i} className="text-xs text-foreground">
              {sa.min_score}-{sa.max_score} pts: {sa.ratio_adjustment >= 0 ? '+' : ''}{sa.ratio_adjustment}
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Ajustes por Sector</p>
          {Object.entries(gp.sector_adjustments).map(([sector, adj]) => (
            <div key={sector} className="text-xs text-foreground">
              {SECTOR_LABELS[sector] ?? sector}: {adj >= 0 ? '+' : ''}{adj}
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Ajustes por Plazo</p>
          {gp.term_adjustments.map((ta, i) => (
            <div key={i} className="text-xs text-foreground">
              {ta.min_months}-{ta.max_months}m: {ta.ratio_adjustment >= 0 ? '+' : ''}{ta.ratio_adjustment}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CovenantTemplatesPanel({ templates }: { templates: CovenantTemplate[] }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Plantillas de Covenants">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Plantillas de Covenants</h3>
      </div>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.code} className="flex items-start gap-3 p-2 rounded bg-muted/30">
            <span
              className="mt-1 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: TYPE_COLORS[t.type] ?? CHART_COLORS.dataLine }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.metric} {OPERATOR_LABELS[t.operator]} {t.threshold} &middot; Cada {t.frequency_months} mes(es)
              </p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${TYPE_COLORS[t.type] ?? CHART_COLORS.dataLine}20`, color: TYPE_COLORS[t.type] ?? CHART_COLORS.dataLine }}
            >
              {t.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PoliciesPage() {
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
        <Shield className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Politicas de Credito</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configuracion dinamica de limites, garantias, hard stops y covenants
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SectorLimitsTable limits={DEFAULT_SECTOR_LIMITS} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HardStopsPanel stops={DEFAULT_HARD_STOPS} />
          <GuaranteePolicyPanel />
        </div>
        <CovenantTemplatesPanel templates={DEFAULT_COVENANT_TEMPLATES} />
      </div>
    </div>
  );
}
