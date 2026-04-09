/**
 * CancelTransactionModal — Modal de confirmación para cancelar una transacción FX.
 * Muestra resumen de la transacción antes de confirmar.
 */

import type { FXTransactionSummary } from '../types/transaction.types';
import { formatCurrency } from '../utils/formatters';

export interface CancelTransactionModalProps {
  transaction: FXTransactionSummary;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
  authorized: { label: 'Autorizada', cls: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-800' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CancelTransactionModal({ transaction: tx, isLoading, onConfirm, onClose }: CancelTransactionModalProps) {
  const status = STATUS_LABELS[tx.status] ?? { label: tx.status, cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-red-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Cancelar Transacción</h3>
              <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {/* Body — transaction summary */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-foreground">¿Estás seguro de cancelar la siguiente transacción?</p>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio</span>
              <span className="font-mono font-medium text-foreground">{tx.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empresa</span>
              <span className="text-foreground">{tx.company_legal_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RFC</span>
              <span className="font-mono text-xs text-foreground">{tx.company_rfc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buys (USD)</span>
              <span className="tabular-nums font-medium text-foreground">{formatCurrency(tx.buys_usd, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de Cambio</span>
              <span className="tabular-nums text-foreground">{tx.exchange_rate.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pays (MXN)</span>
              <span className="tabular-nums font-medium text-foreground">{formatCurrency(tx.pays_mxn, 'MXN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span className="text-foreground">{formatDate(tx.created_at)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Footer — actions */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            No, mantener
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Cancelando...' : 'Sí, cancelar transacción'}
          </button>
        </div>
      </div>
    </div>
  );
}
