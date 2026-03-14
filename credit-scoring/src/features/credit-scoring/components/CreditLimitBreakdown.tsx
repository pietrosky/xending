import { ArrowLeft } from 'lucide-react';
import type { ConstraintName } from '../engines/creditLimit';
import { InfoPopup } from './InfoPopup';
import { CREDIT_LIMIT_INFO, DECISION_ENGINE_INFO } from '../lib/engineDescriptions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreditLimits {
  limit_by_flow: number;
  limit_by_sales: number;
  limit_by_ebitda: number;
  limit_by_guarantee: number;
  limit_by_portfolio: number;
}

export interface CreditLimitBreakdownProps {
  limits: CreditLimits;
  final_limit: number;
  binding_constraint: ConstraintName;
  explanation: string;
  currency: 'MXN' | 'USD';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LIMIT_LABELS: Record<ConstraintName, string> = {
  limit_by_flow: 'Por flujo (DSCR)',
  limit_by_sales: 'Por ventas (20%)',
  limit_by_ebitda: 'Por EBITDA (2x)',
  limit_by_guarantee: 'Por garantia (2:1)',
  limit_by_portfolio: 'Por portafolio',
};

const LIMIT_ORDER: ConstraintName[] = [
  'limit_by_flow',
  'limit_by_sales',
  'limit_by_ebitda',
  'limit_by_guarantee',
  'limit_by_portfolio',
];

function formatCurrency(value: number, currency: 'MXN' | 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreditLimitBreakdown({
  limits,
  final_limit,
  binding_constraint,
  explanation,
  currency,
}: CreditLimitBreakdownProps) {
  const maxValue = Math.max(
    ...LIMIT_ORDER.map((key) => limits[key]),
    1, // avoid division by zero
  );

  return (
    <section
      className="bg-card rounded-lg border border-border p-4 flex flex-col gap-4"
      aria-label="Calculo de Monto Maximo"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Calculo de Monto Maximo
        </h3>
        <InfoPopup data={DECISION_ENGINE_INFO['credit_limit'] ?? { title: 'Credit Limit', whatIs: '', impact: '' }} size={14} />
      </div>

      {/* Horizontal bars */}
      <div className="flex flex-col gap-3" role="list" aria-label="Limites de credito">
        {LIMIT_ORDER.map((key) => {
          const value = limits[key];
          const isBinding = key === binding_constraint;
          const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={key} className="flex flex-col gap-1" role="listitem">
              {/* Label row */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`flex items-center gap-1 ${
                    isBinding
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {LIMIT_LABELS[key]}
                  <InfoPopup data={CREDIT_LIMIT_INFO[key] ?? { title: key, whatIs: '', impact: '' }} size={12} />
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={
                      isBinding
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    {formatCurrency(value, currency)}
                  </span>
                  {isBinding && (
                    <span className="flex items-center gap-0.5 text-status-warning font-semibold">
                      <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                      BINDING
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div
                className="w-full h-2.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(widthPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${LIMIT_LABELS[key]}: ${formatCurrency(value, currency)}`}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isBinding
                      ? 'bg-status-warning'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="border-t border-border pt-3 flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">
            Monto aprobado
          </span>
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(final_limit, currency)}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {currency}
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Limitado por: {explanation}
        </p>
      </div>
    </section>
  );
}
