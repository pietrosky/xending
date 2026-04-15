/**
 * AuthorizeButton — Botón de autorización de transacciones (solo admin).
 *
 * Renderiza el botón únicamente si `isAdmin` es true.
 * Al hacer click, obtiene el usuario actual de Supabase auth y llama
 * a la mutation `useAuthorizeTransaction` con el transactionId y adminUserId.
 * Muestra estado de carga mientras se procesa la autorización.
 *
 * Requerimientos: 7.1, 7.4, 7.5
 */

import { useAuthorizeTransaction } from '../hooks/useTransactions';
import { supabase } from '@/lib/supabase';

export interface AuthorizeButtonProps {
  transactionId: string;
  isAdmin: boolean;
  onAuthorized: () => void;
}

export function AuthorizeButton({ transactionId, isAdmin, onAuthorized }: AuthorizeButtonProps) {
  const { mutate, isPending } = useAuthorizeTransaction();

  if (!isAdmin) return null;

  async function handleAuthorize() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    mutate(
      { transactionId, adminUserId: user.id },
      { onSuccess: () => onAuthorized() },
    );
  }

  return (
    <button
      type="button"
      onClick={handleAuthorize}
      disabled={isPending}
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ' +
        (isPending
          ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
          : 'bg-primary text-primary-foreground hover:bg-primary/90')
      }
    >
      {isPending && (
        <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
      )}
      {isPending ? 'Autorizando...' : 'Autorizar'}
    </button>
  );
}
