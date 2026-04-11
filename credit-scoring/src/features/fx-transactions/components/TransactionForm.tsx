/**
 * TransactionForm — Formulario de registro de transacción FX.
 *
 * Integra CompanySearchInput para selección de empresa.
 * Muestra campos no editables al seleccionar empresa: razón social, RFC,
 * teléfono, dirección fiscal, cuentas CLABE.
 * Campos editables: Buys (USD), Exchange Rate (4 decimales), selector de cuenta de pago.
 * Campo calculado display-only: Pays (MXN) = Buys × Exchange Rate.
 *
 * Requerimientos: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CompanySearchInput } from './CompanySearchInput';
import { OperationTabs } from './OperationTabs';
import type { OperationTab } from './OperationTabs';
import { deriveTabFromCurrency, getCurrenciesForTab, transformRatesForSubmit } from '../utils/fxConversion';
import { getCompanyFXById } from '../services/companyServiceFX';
import { formatCurrency } from '../utils/formatters';
import { maskClabe } from '../../credit-scoring/utils/inputMasks';
import { usePaymentAccounts } from '../../payment-instructions/hooks/usePaymentInstructions';
import type { CompanyFX } from '../types/company-fx.types';
import type { CreateTransactionInput, FXTransaction, FXCurrency } from '../types/transaction.types';

// ─── Currency mask helpers ───────────────────────────────────────────

/** Strip non-digit/dot chars and return the raw number string for the model */
function parseCurrencyInput(display: string): string {
  // Keep only digits and the last dot
  const cleaned = display.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return parts[0] + '.' + parts.slice(1).join('');
}

/** Format a numeric string as 1,234,567.89 for display */
function formatCurrencyDisplay(raw: string): string {
  if (!raw) return '';
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  // If user is typing decimals, preserve their input
  const hasDecimal = raw.includes('.');
  const decimalPart = hasDecimal ? raw.split('.')[1] ?? '' : '';
  const intPart = Math.floor(num).toLocaleString('en-US');
  if (hasDecimal) return `${intPart}.${decimalPart}`;
  return intPart;
}

// ─── Props ───────────────────────────────────────────────────────────

export interface TransactionFormProps {
  mode?: 'create' | 'edit';
  initialData?: FXTransaction;
  initialCompany?: CompanyFX | null;
  onSubmit: (input: CreateTransactionInput) => void;
  isLoading: boolean;
  error: string | null;
  /** Extra content rendered after the form fields (e.g. authorize button, proof upload) */
  extraContent?: React.ReactNode;
  /** When true, all transaction fields are read-only (broker after authorization) */
  readOnly?: boolean;
}

// ─── Validation ──────────────────────────────────────────────────────

interface FieldErrors {
  company?: string;
  buys_usd?: string;
  base_rate?: string;
  markup_rate?: string;
  payment_account?: string;
  pi_account?: string;
}

function validate(
  company: CompanyFX | null,
  buysRaw: string,
  baseRateRaw: string,
  markupRateRaw: string,
  paymentAccountId: string,
  piAccountId: string,
  activeTab: OperationTab = 'buy',
  hasFilteredAccounts: boolean = true,
  hasFilteredPiAccounts: boolean = true,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!company) errors.company = 'Debe seleccionar una empresa';

  const buys = parseFloat(buysRaw);
  if (!buysRaw.trim()) {
    errors.buys_usd = 'Monto es requerido';
  } else if (isNaN(buys) || buys <= 0) {
    errors.buys_usd = 'Monto debe ser mayor a 0';
  }

  const zeroRateMsg = activeTab === 'sell' ? 'Tipo de cambio debe ser mayor a 0' : 'Debe ser mayor a 0';

  const base = parseFloat(baseRateRaw);
  if (!baseRateRaw.trim()) {
    errors.base_rate = 'Tipo de cambio base es requerido';
  } else if (isNaN(base) || base <= 0) {
    errors.base_rate = zeroRateMsg;
  }

  const markup = parseFloat(markupRateRaw);
  if (!markupRateRaw.trim()) {
    errors.markup_rate = 'Tipo de cambio markup es requerido';
  } else if (isNaN(markup) || markup <= 0) {
    errors.markup_rate = zeroRateMsg;
  }

  if (company && !hasFilteredAccounts) {
    const currencyLabel = activeTab === 'buy' ? 'MXP' : 'USD';
    errors.payment_account = `No hay cuentas de pago en ${currencyLabel} registradas para esta empresa`;
  } else if (company && !paymentAccountId) {
    errors.payment_account = 'Debe seleccionar una cuenta de pago';
  }

  if (!piAccountId) {
    const piCurrency = activeTab === 'buy' ? 'USD' : 'MXP';
    if (!hasFilteredPiAccounts) {
      errors.pi_account = `No hay cuentas de Payment Instructions en ${piCurrency} disponibles`;
    } else {
      errors.pi_account = 'Debe seleccionar una cuenta de Payment Instructions';
    }
  }

  return errors;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatAddressDisplay(address: CompanyFX['address']): string {
  if (!address) return '—';
  const parts = [address.street, address.city, address.state, address.zip, address.country];
  return parts.filter(Boolean).join(', ') || '—';
}

// ─── Status Chip ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Pendiente' },
  authorized: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Autorizada' },
  completed:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completada' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function TransactionForm({ mode = 'create', initialData, initialCompany, onSubmit, isLoading, error, extraContent, readOnly = false }: TransactionFormProps) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyFX | null>(initialCompany ?? null);
  const [buysRaw, setBuysRaw] = useState(initialData ? String(initialData.buys_usd) : '');
  const [buysDisplay, setBuysDisplay] = useState(initialData ? formatCurrencyDisplay(String(initialData.buys_usd)) : '');
  const [baseRateRaw, setBaseRateRaw] = useState(initialData ? String(initialData.base_rate) : '');
  const [markupRateRaw, setMarkupRateRaw] = useState(initialData ? String(initialData.markup_rate) : '');
  const [paymentAccountId, setPaymentAccountId] = useState(initialData?.payment_account_id ?? '');
  const [piAccountId, setPiAccountId] = useState(initialData?.pi_account_id ?? '');
  const [buysCurrency, setBuysCurrency] = useState<FXCurrency>(initialData?.buys_currency ?? 'USD');
  const [paysCurrency, setPaysCurrency] = useState<FXCurrency>(initialData?.pays_currency ?? 'MXN');
  const [activeTab, setActiveTab] = useState<OperationTab>(
    deriveTabFromCurrency(initialData?.buys_currency ?? 'USD'),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isEdit = mode === 'edit';

  // Payment Instructions accounts — filtered by currency based on operation tab
  const { data: piAccounts } = usePaymentAccounts();
  const piCurrencyFilter = activeTab === 'buy' ? 'USD' : 'MXN';
  const filteredPiAccounts = useMemo(
    () => (piAccounts ?? []).filter((a) => a.is_active && a.currency_types.includes(piCurrencyFilter)),
    [piAccounts, piCurrencyFilter],
  );

  // Pre-populate company in edit mode
  useEffect(() => {
    if (initialCompany) setSelectedCompany(initialCompany);
  }, [initialCompany]);

  useEffect(() => {
    if (initialData) {
      const raw = String(initialData.buys_usd);
      setBuysRaw(raw);
      setBuysDisplay(formatCurrencyDisplay(raw));
      setBaseRateRaw(String(initialData.base_rate ?? initialData.exchange_rate));
      setMarkupRateRaw(String(initialData.markup_rate ?? initialData.exchange_rate));
      setBuysCurrency(initialData.buys_currency ?? 'USD');
      setPaysCurrency(initialData.pays_currency ?? 'MXN');
    }
  }, [initialData]);

  const handleBuysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseCurrencyInput(e.target.value);
    setBuysRaw(raw);
    setBuysDisplay(formatCurrencyDisplay(raw));
  }, []);

  const accounts = selectedCompany?.payment_accounts ?? [];
  const filteredAccounts = accounts.filter((acc) =>
    activeTab === 'buy' ? acc.currency === 'MXP' : acc.currency === 'USD',
  );

  // Auto-select when only one account matches
  useEffect(() => {
    if (filteredAccounts.length === 1 && paymentAccountId !== filteredAccounts[0]!.id) {
      setPaymentAccountId(filteredAccounts[0]!.id);
    }
  }, [filteredAccounts.length, filteredAccounts[0]?.id, paymentAccountId]);

  // Auto-select PI account when only one matches the currency filter
  useEffect(() => {
    if (filteredPiAccounts.length === 1 && piAccountId !== filteredPiAccounts[0]!.id) {
      setPiAccountId(filteredPiAccounts[0]!.id);
    }
  }, [filteredPiAccounts.length, filteredPiAccounts[0]?.id, piAccountId]);

  const errors = validate(selectedCompany, buysRaw, baseRateRaw, markupRateRaw, paymentAccountId, piAccountId, activeTab, filteredAccounts.length > 0, filteredPiAccounts.length > 0);

  // Markup difference and chip
  const baseRate = parseFloat(baseRateRaw) || 0;
  const markupRate = parseFloat(markupRateRaw) || 0;
  const rawDiff = markupRate - baseRate;
  const markupDiff = activeTab === 'buy' ? rawDiff * -1 : rawDiff;
  const effectiveRate = markupRate || baseRate;

  // Real-time Pays calculation
  const paysDisplay = useMemo(() => {
    const buys = parseFloat(buysRaw);
    if (!isNaN(buys) && buys > 0 && effectiveRate > 0) {
      const pays = Math.round((buys * effectiveRate) * 100) / 100;
      return formatCurrency(pays, 'MXN');
    }
    return 'MXN 0.00';
  }, [buysRaw, effectiveRate]);

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleTabChange(tab: OperationTab) {
    setActiveTab(tab);
    const { buysCurrency: buys, paysCurrency: pays } = getCurrenciesForTab(tab);
    setBuysCurrency(buys);
    setPaysCurrency(pays);
    setPaymentAccountId('');
    setPiAccountId('');
  }

  function handleCompanySelect(company: CompanyFX) {
    setSelectedCompany(company);
    setPaymentAccountId('');
    setTouched((prev) => ({ ...prev, company: false }));

    // Fetch full company data including payment_accounts
    getCompanyFXById(company.id).then((full) => {
      if (full) setSelectedCompany(full);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {};
    for (const f of ['company', 'buys_usd', 'base_rate', 'markup_rate', 'payment_account', 'pi_account']) {
      allTouched[f] = true;
    }
    setTouched(allTouched);

    if (Object.keys(errors).length > 0) return;

    // Validate zero rates in sell tab to prevent division by zero
    if (activeTab === 'sell' && (baseRate === 0 || markupRate === 0)) {
      setTouched(allTouched);
      return;
    }

    const transformed = transformRatesForSubmit(activeTab, baseRate, markupRate);

    onSubmit({
      company_id: selectedCompany!.id,
      payment_account_id: paymentAccountId,
      pi_account_id: piAccountId,
      buys_currency: buysCurrency,
      buys_usd: parseFloat(buysRaw),
      base_rate: transformed.base_rate,
      markup_rate: transformed.markup_rate,
      exchange_rate: transformed.exchange_rate,
      pays_currency: paysCurrency,
    });
  }

  const isValid = Object.keys(errors).length === 0;

  // ─── Styling helpers ─────────────────────────────────────────────

  const inputBase =
    'w-full px-3 py-2 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2';
  const inputOk = `${inputBase} border-border focus:ring-primary/40`;
  const inputErr = `${inputBase} border-status-error focus:ring-status-error/40`;
  const readOnlyInput =
    'w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm cursor-default';

  function cls(field: string): string {
    return touched[field] && (errors as Record<string, string | undefined>)[field] ? inputErr : inputOk;
  }

  function errMsg(field: string): string | undefined {
    return touched[field] ? (errors as Record<string, string | undefined>)[field] : undefined;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-lg border border-border p-6 space-y-6 max-w-2xl"
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {isEdit ? 'Editar Transacción FX' : 'Registrar Transacción FX'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          {isEdit && initialData && (
            <>
              Folio: {initialData.folio}
              <StatusChip status={initialData.status} />
            </>
          )}
          {!isEdit && 'Seleccione una empresa y capture los datos de la operación.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {/* ─── Company search ───────────────────────────────────────── */}
      <div>
        {isEdit ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Empresa</label>
            <input
              type="text"
              value={selectedCompany?.legal_name ?? '—'}
              readOnly
              className={readOnlyInput}
              tabIndex={-1}
            />
          </div>
        ) : (
          <CompanySearchInput onSelect={handleCompanySelect} disabled={isLoading} />
        )}
        {errMsg('company') && (
          <p className="text-xs text-status-error mt-1" role="alert">{errMsg('company')}</p>
        )}
      </div>

      {/* ─── Read-only company fields ─────────────────────────────── */}
      {selectedCompany && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground">Datos de la Empresa</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Razón Social</label>
              <input
                type="text"
                value={selectedCompany.legal_name}
                readOnly
                className={readOnlyInput}
                tabIndex={-1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">RFC</label>
              <input
                type="text"
                value={selectedCompany.rfc}
                readOnly
                className={readOnlyInput}
                tabIndex={-1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
              <input
                type="text"
                value={selectedCompany.metadata?.phone as string ?? '—'}
                readOnly
                className={readOnlyInput}
                tabIndex={-1}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Dirección Fiscal</label>
              <input
                type="text"
                value={formatAddressDisplay(selectedCompany.address)}
                readOnly
                className={readOnlyInput}
                tabIndex={-1}
              />
            </div>

            {/* CLABE accounts — shown via selector in transaction fields */}
          </div>
        </fieldset>
      )}

      {/* ─── Operation Tabs ─────────────────────────────────────── */}
      <OperationTabs activeTab={activeTab} onChange={handleTabChange} disabled={readOnly} />

      {/* ─── Transaction fields ───────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Datos de la Operación</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buys — amount */}
          <div>
            <label htmlFor="tx-buys" className="block text-sm font-medium text-foreground mb-1">
              {activeTab === 'buy' ? 'Compra (USD)' : 'Vende (USD)'}
            </label>
            <input
              id="tx-buys"
              type="text"
              inputMode="decimal"
              value={buysDisplay}
              onChange={handleBuysChange}
              onBlur={() => handleBlur('buys_usd')}
              className={readOnly ? readOnlyInput : cls('buys_usd')}
              placeholder="0.00"
              readOnly={readOnly}
              tabIndex={readOnly ? -1 : undefined}
              aria-invalid={!!errMsg('buys_usd')}
            />
            {errMsg('buys_usd') && (
              <p className="text-xs text-status-error mt-1" role="alert">{errMsg('buys_usd')}</p>
            )}
          </div>

          {/* Base Rate + Markup Rate — side by side */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-base-rate" className="block text-sm font-medium text-foreground mb-1">
                {activeTab === 'buy' ? 'TC Base (MXP por USD)' : 'TC Base (USD por MXP)'}
              </label>
              <input
                id="tx-base-rate"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0.0001"
                value={baseRateRaw}
                onChange={(e) => setBaseRateRaw(e.target.value)}
                onBlur={() => handleBlur('base_rate')}
                className={readOnly ? readOnlyInput : cls('base_rate')}
                placeholder="0.0000"
                readOnly={readOnly}
                tabIndex={readOnly ? -1 : undefined}
                aria-invalid={!!errMsg('base_rate')}
              />
              {errMsg('base_rate') && (
                <p className="text-xs text-status-error mt-1" role="alert">{errMsg('base_rate')}</p>
              )}
            </div>

            <div>
              <label htmlFor="tx-markup-rate" className="block text-sm font-medium text-foreground mb-1">
                {activeTab === 'buy' ? 'TC Markup (MXP por USD)' : 'TC Markup (USD por MXP)'}
              </label>
              <input
                id="tx-markup-rate"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0.0001"
                value={markupRateRaw}
                onChange={(e) => setMarkupRateRaw(e.target.value)}
                onBlur={() => handleBlur('markup_rate')}
                className={readOnly ? readOnlyInput : cls('markup_rate')}
                placeholder="0.0000"
                readOnly={readOnly}
                tabIndex={readOnly ? -1 : undefined}
                aria-invalid={!!errMsg('markup_rate')}
              />
              {errMsg('markup_rate') && (
                <p className="text-xs text-status-error mt-1" role="alert">{errMsg('markup_rate')}</p>
              )}
            </div>
          </div>

          {/* Markup Diff chip */}
          <div className="md:col-span-2 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Diferencia Markup:</span>
            {baseRate > 0 && markupRate > 0 ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                markupDiff > 0 ? 'bg-green-100 text-green-800' :
                markupDiff < 0 ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {markupDiff > 0 ? '+' : ''}{markupDiff.toFixed(4)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            {markupDiff < 0 && !readOnly && (
              <span className="text-xs text-red-600">Solo administradores pueden aplicar markup negativo</span>
            )}
          </div>

          {/* Payment account selector + CLABE + Banco */}
          {selectedCompany && filteredAccounts.length > 0 && (
            <>
              <div className="md:col-span-2">
                <label htmlFor="tx-account" className="block text-sm font-medium text-foreground mb-1">
                  Cuenta de Pago
                </label>
                <select
                  id="tx-account"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  onBlur={() => handleBlur('payment_account')}
                  className={readOnly ? readOnlyInput : cls('payment_account')}
                  disabled={readOnly}
                  aria-invalid={!!errMsg('payment_account')}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {filteredAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name ? `${acc.bank_name} — ` : ''}{maskClabe(acc.clabe)}
                      {acc.is_primary ? ' (Principal)' : ''}
                    </option>
                  ))}
                </select>
                {errMsg('payment_account') && (
                  <p className="text-xs text-status-error mt-1" role="alert">{errMsg('payment_account')}</p>
                )}
              </div>

              {/* Read-only CLABE + Banco for selected account */}
              {(() => {
                const selected = filteredAccounts.find((a) => a.id === paymentAccountId);
                if (!selected) return null;
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">CLABE</label>
                      <input
                        type="text"
                        value={maskClabe(selected.clabe)}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Banco</label>
                      <input
                        type="text"
                        value={selected.bank_name ?? '—'}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* No accounts warning */}
          {selectedCompany && filteredAccounts.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">
              No hay cuentas de pago en {activeTab === 'buy' ? 'MXP' : 'USD'} registradas para esta empresa. Agregue una cuenta en la sección de edición de empresa.
            </div>
          )}

          {/* Pays — currency auto-selected + calculated display */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {activeTab === 'buy' ? 'Paga (MXN)' : 'Recibe (MXN)'}
            </label>
            <div className="flex gap-2">
              <select
                value="MXN"
                disabled
                className={`${readOnlyInput} w-24`}
              >
                <option value="MXN">MXN</option>
              </select>
              <input
                type="text"
                value={paysDisplay}
                readOnly
                className={readOnlyInput}
                tabIndex={-1}
                aria-label="Monto calculado en MXN"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === 'buy'
                ? 'Calculado: Compra (USD) × TC Markup (MXP por USD)'
                : 'Calculado: Vende (USD) × TC Markup (USD por MXP)'}
            </p>
          </div>
        </div>
      </fieldset>

      {/* ─── Payment Instructions selector ────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Payment Instructions</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPiAccounts.length > 0 ? (
            <>
              <div className="md:col-span-2">
                <label htmlFor="tx-pi-account" className="block text-sm font-medium text-foreground mb-1">
                  Cuenta de Depósito (Xending) — {piCurrencyFilter}
                </label>
                <select
                  id="tx-pi-account"
                  value={piAccountId}
                  onChange={(e) => setPiAccountId(e.target.value)}
                  onBlur={() => handleBlur('pi_account')}
                  className={readOnly ? readOnlyInput : cls('pi_account')}
                  disabled={readOnly}
                  aria-invalid={!!errMsg('pi_account')}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {filteredPiAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} — {acc.account_name} ({acc.currency_types.join(', ')})
                    </option>
                  ))}
                </select>
                {errMsg('pi_account') && (
                  <p className="text-xs text-status-error mt-1" role="alert">{errMsg('pi_account')}</p>
                )}
              </div>

              {/* Read-only details for selected PI account */}
              {(() => {
                const selected = filteredPiAccounts.find((a) => a.id === piAccountId);
                if (!selected) return null;
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
                      <input
                        type="text"
                        value={selected.account_number}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={selected.bank_name}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">SWIFT Code</label>
                      <input
                        type="text"
                        value={selected.swift_code ?? '—'}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Bank Address</label>
                      <input
                        type="text"
                        value={selected.bank_address}
                        readOnly
                        className={readOnlyInput}
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Moneda</label>
                      <div className="flex flex-wrap gap-1 py-2">
                        {selected.currency_types.map((currency) => (
                          <span
                            key={currency}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {currency}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="md:col-span-2 rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">
              No hay cuentas de Payment Instructions en {piCurrencyFilter} disponibles. Agregue una cuenta en la sección de Payment Instructions.
            </div>
          )}
        </div>
      </fieldset>

      {/* ─── Extra content (authorize, proof upload in edit mode) ── */}
      {extraContent}

      {/* ─── Submit ───────────────────────────────────────────────── */}
      {!readOnly && (
        <button
          type="submit"
          disabled={isLoading || (!isValid && Object.values(touched).some(Boolean))}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          {isLoading
            ? (isEdit ? 'Guardando...' : 'Registrando...')
            : (isEdit ? 'Guardar Cambios' : 'Registrar Transacción')}
        </button>
      )}
    </form>
  );
}
