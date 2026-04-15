/**
 * CreateAccountModal — Modal con formulario de creación de cuenta bancaria.
 *
 * Campos: Account Number, Account Name, SWIFT, Bank Name, Bank Address
 * Checkboxes para Tipo de Cambio (USD, MXN, EUR, etc.)
 * Validación client-side con `validateCreateAccountForm` antes de envío.
 * Muestra errores de validación inline y error de duplicado desde el servicio.
 *
 * Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
 */

import { useState } from 'react';
import { useCreatePaymentAccount } from '../hooks/usePaymentInstructions';
import { validateCreateAccountForm } from '../utils/validators';
import type { CreateAccountInput } from '../types/payment-instruction.types';

export interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCY_OPTIONS = ['USD', 'MXN', 'EUR', 'GBP', 'JPY', 'CAD'] as const;

const EMPTY_FORM: CreateAccountInput = {
  account_number: '',
  account_name: '',
  swift_code: '',
  bank_name: '',
  bank_address: '',
  currency_types: [],
};

export function CreateAccountModal({ isOpen, onClose, onSuccess }: CreateAccountModalProps) {
  const [form, setForm] = useState<CreateAccountInput>({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const createMutation = useCreatePaymentAccount();

  if (!isOpen) return null;

  function handleFieldChange(field: keyof Omit<CreateAccountInput, 'currency_types'>, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) setGeneralError('');
  }

  function handleCurrencyToggle(currency: string) {
    setForm((prev) => {
      const has = prev.currency_types.includes(currency);
      return {
        ...prev,
        currency_types: has
          ? prev.currency_types.filter((c) => c !== currency)
          : [...prev.currency_types, currency],
      };
    });
    if (fieldErrors.currency_types) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.currency_types;
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError('');

    // Client-side validation (Req 1.2, 1.3, 1.4)
    const validation = validateCreateAccountForm(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});

    try {
      await createMutation.mutateAsync(form);
      // Reset form and close on success
      setForm({ ...EMPTY_FORM });
      setFieldErrors({});
      setGeneralError('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      // Show duplicate or service error (Req 1.5)
      const message =
        err instanceof Error ? err.message : 'Error al procesar la solicitud. Intenta de nuevo más tarde.';
      setGeneralError(message);
    }
  }

  function handleClose() {
    if (createMutation.isPending) return;
    setForm({ ...EMPTY_FORM });
    setFieldErrors({});
    setGeneralError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Nueva Cuenta Bancaria</h3>
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* General error (e.g. duplicate) */}
            {generalError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {generalError}
              </div>
            )}

            {/* Account Number */}
            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-foreground mb-1">
                Account Number
              </label>
              <input
                id="account_number"
                type="text"
                value={form.account_number}
                onChange={(e) => handleFieldChange('account_number', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.account_number ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Ej. 123456789"
              />
              {fieldErrors.account_number && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.account_number}</p>
              )}
            </div>

            {/* Account Name */}
            <div>
              <label htmlFor="account_name" className="block text-sm font-medium text-foreground mb-1">
                Account Name
              </label>
              <input
                id="account_name"
                type="text"
                value={form.account_name}
                onChange={(e) => handleFieldChange('account_name', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.account_name ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Ej. Xending Capital LLC"
              />
              {fieldErrors.account_name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.account_name}</p>
              )}
            </div>

            {/* SWIFT (opcional) */}
            <div>
              <label htmlFor="swift_code" className="block text-sm font-medium text-foreground mb-1">
                SWIFT <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                id="swift_code"
                type="text"
                value={form.swift_code}
                onChange={(e) => handleFieldChange('swift_code', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.swift_code ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Ej. BOFAUS3N"
              />
              {fieldErrors.swift_code && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.swift_code}</p>
              )}
            </div>

            {/* Bank Name */}
            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-foreground mb-1">
                Bank Name
              </label>
              <input
                id="bank_name"
                type="text"
                value={form.bank_name}
                onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.bank_name ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Ej. Bank of America"
              />
              {fieldErrors.bank_name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.bank_name}</p>
              )}
            </div>

            {/* Bank Address */}
            <div>
              <label htmlFor="bank_address" className="block text-sm font-medium text-foreground mb-1">
                Bank Address
              </label>
              <input
                id="bank_address"
                type="text"
                value={form.bank_address}
                onChange={(e) => handleFieldChange('bank_address', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.bank_address ? 'border-red-500' : 'border-border'
                }`}
                placeholder="Ej. 100 N Tryon St, Charlotte, NC"
              />
              {fieldErrors.bank_address && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.bank_address}</p>
              )}
            </div>

            {/* Currency Types — checkboxes (Req 1.7) */}
            <div>
              <span className="block text-sm font-medium text-foreground mb-2">Tipo de Cambio</span>
              <div className="flex flex-wrap gap-3">
                {CURRENCY_OPTIONS.map((currency) => (
                  <label key={currency} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.currency_types.includes(currency)}
                      onChange={() => handleCurrencyToggle(currency)}
                      className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">{currency}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.currency_types && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.currency_types}</p>
              )}
            </div>
          </div>

          {/* Footer — actions */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
