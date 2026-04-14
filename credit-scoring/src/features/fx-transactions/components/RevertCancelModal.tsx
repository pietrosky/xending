/**
 * RevertCancelModal — Modal de confirmación para revertir cancelación.
 */

import type { FXTransactionSummary } from '../types/transaction.types';
import { formatCurrency } from '../utils/formatters';

export interface RevertCancelModalProps {
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

export function RevertCancelModal({ transaction: tx, isLoading, onConfirm, onClose }: RevertCancelModalProps) {
  const status = STATUS_LABELS[tx.status] ?? { label: tx.status, cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-green-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Restaurar Transacción</h3>
              <p className="text-sm text-muted-foreground">La transacción volverá a su estado anterior</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-foreground">¿Deseas restaurar la siguiente transacción cancelada?</p>

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
              <span className="tabular-nums font-medium text-foreground">{formatCurrency(tx.quantity, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de Cambio</span>
              <span className="tabular-nums text-foreground">{tx.markup_rate.toFixed(4)}</span>
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
              <span className="text-muted-foreground">Status original</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
                {status.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cancelada el</span>
              <span className="text-foreground">{formatDate(tx.cancelled_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50">
            {isLoading ? 'Restaurando...' : 'Sí, restaurar transacción'}
          </button>
        </div>
      </div>
    </div>
  );
}
