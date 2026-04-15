/**
 * DeleteAccountModal — Confirmación para eliminar cuenta bancaria.
 */

import { maskClabe } from '../../credit-scoring/utils/inputMasks';

export interface DeleteAccountModalProps {
  clabe: string;
  bankName: string;
  index: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteAccountModal({ clabe, bankName, isLoading, onConfirm, onClose }: DeleteAccountModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-red-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Eliminar Cuenta</h3>
              <p className="text-sm text-muted-foreground">Esta acción marcará la cuenta como eliminada</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-foreground">¿Estás seguro de eliminar esta cuenta bancaria?</p>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CLABE</span>
              <span className="font-mono text-foreground">{clabe ? maskClabe(clabe) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Banco</span>
              <span className="text-foreground">{bankName || '—'}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            No, mantener
          </button>
          <button type="button" onClick={onConfirm} disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
            {isLoading ? 'Eliminando...' : 'Sí, eliminar cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
