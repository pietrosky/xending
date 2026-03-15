/**
 * Formulario de solicitud de crédito Xending — Fase 6A.
 *
 * Campos: RFC, empresa, monto, moneda, propósito, ventas anuales,
 * antigüedad, plazo (días), email, teléfono, representante legal.
 *
 * Ejecuta el pre-filtro en tiempo real conforme el usuario llena
 * los campos, mostrando feedback inmediato de GO/NO-GO.
 */

import { useState, useMemo } from 'react';
import type { Currency } from '../types/application.types';
import type { PreFilterInput, CreditPurpose } from '../types/expediente.types';
import { runPreFilter, CREDIT_PURPOSE_OPTIONS } from '../engines/preFilter';

// ─── Props ───────────────────────────────────────────────────────────

interface NewApplicationFormProps {
  onSubmit: (data: PreFilterInput) => void;
  isLoading?: boolean;
}

// ─── Validación básica de campos ─────────────────────────────────────

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  rfc?: string;
  company_name?: string;
  requested_amount?: string;
  credit_purpose?: string;
  declared_annual_revenue?: string;
  declared_business_age?: string;
  term_days?: string;
  contact_email?: string;
}

function validateFields(data: Partial<PreFilterInput>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.rfc?.trim()) errors.rfc = 'RFC es requerido';
  else if (!RFC_REGEX.test(data.rfc.trim())) errors.rfc = 'RFC inválido (12-13 caracteres)';
  if (!data.company_name?.trim()) errors.company_name = 'Nombre de empresa es requerido';
  if (!data.requested_amount || data.requested_amount <= 0) errors.requested_amount = 'Monto debe ser mayor a 0';
  if (!data.credit_purpose) errors.credit_purpose = 'Selecciona un propósito';
  if (!data.declared_annual_revenue || data.declared_annual_revenue <= 0) errors.declared_annual_revenue = 'Ventas anuales requeridas';
  if (!data.declared_business_age || data.declared_business_age <= 0) errors.declared_business_age = 'Antigüedad requerida';
  if (!data.term_days || data.term_days <= 0) errors.term_days = 'Plazo requerido';
  if (!data.contact_email?.trim()) errors.contact_email = 'Email requerido';
  else if (!EMAIL_REGEX.test(data.contact_email.trim())) errors.contact_email = 'Email inválido';
  return errors;
}

// ─── Componente ──────────────────────────────────────────────────────

export function NewApplicationForm({ onSubmit, isLoading = false }: NewApplicationFormProps) {
  const [rfc, setRfc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [purpose, setPurpose] = useState<CreditPurpose | ''>('');
  const [revenue, setRevenue] = useState('');
  const [businessAge, setBusinessAge] = useState('');
  const [termDays, setTermDays] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [legalRep, setLegalRep] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Construir input para pre-filtro
  const currentInput: Partial<PreFilterInput> = useMemo(() => ({
    rfc: rfc.trim().toUpperCase(),
    company_name: companyName.trim(),
    requested_amount: Number(amount) || 0,
    currency,
    credit_purpose: purpose || undefined,
    declared_annual_revenue: Number(revenue) || 0,
    declared_business_age: Number(businessAge) || 0,
    term_days: Number(termDays) || 0,
    contact_email: email.trim(),
    contact_phone: phone.trim() || undefined,
    legal_representative: legalRep.trim() || undefined,
  }), [rfc, companyName, amount, currency, purpose, revenue, businessAge, termDays, email, phone, legalRep]);

  // Validación de campos
  const fieldErrors = validateFields(currentInput);
  const hasAllFields = Object.keys(fieldErrors).length === 0;

  // Pre-filtro en tiempo real (solo si todos los campos están llenos)
  const preFilterResult = useMemo(() => {
    if (!hasAllFields) return null;
    return runPreFilter(currentInput as PreFilterInput);
  }, [currentInput, hasAllFields]);

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Marcar todos como touched
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(fieldErrors)) allTouched[key] = true;
    allTouched.rfc = true;
    allTouched.company_name = true;
    allTouched.requested_amount = true;
    allTouched.credit_purpose = true;
    allTouched.declared_annual_revenue = true;
    allTouched.declared_business_age = true;
    allTouched.term_days = true;
    allTouched.contact_email = true;
    setTouched(allTouched);

    if (!hasAllFields || !preFilterResult) return;

    onSubmit(currentInput as PreFilterInput);
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
  const errorInputClass =
    'w-full px-3 py-2 rounded-lg border border-status-error bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-status-error/40';

  function fieldCls(field: keyof FieldErrors): string {
    return touched[field] && fieldErrors[field] ? errorInputClass : inputClass;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 space-y-5 max-w-2xl" noValidate>
      <h2 className="text-lg font-semibold text-foreground">Solicitud de Crédito</h2>
      <p className="text-sm text-muted-foreground">Complete los datos para evaluar elegibilidad.</p>

      {/* Grid 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* RFC */}
        <div>
          <label htmlFor="naf-rfc" className="block text-sm font-medium text-foreground mb-1">RFC</label>
          <input
            id="naf-rfc"
            type="text"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            onBlur={() => handleBlur('rfc')}
            className={fieldCls('rfc')}
            placeholder="XAXX010101000"
            maxLength={13}
            autoComplete="off"
            aria-invalid={touched.rfc && !!fieldErrors.rfc}
            aria-describedby={touched.rfc && fieldErrors.rfc ? 'naf-rfc-err' : undefined}
          />
          {touched.rfc && fieldErrors.rfc && (
            <p id="naf-rfc-err" className="text-xs text-status-error mt-1" role="alert">{fieldErrors.rfc}</p>
          )}
        </div>

        {/* Empresa */}
        <div>
          <label htmlFor="naf-company" className="block text-sm font-medium text-foreground mb-1">Empresa</label>
          <input
            id="naf-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onBlur={() => handleBlur('company_name')}
            className={fieldCls('company_name')}
            placeholder="Nombre de la empresa"
            autoComplete="organization"
            aria-invalid={touched.company_name && !!fieldErrors.company_name}
          />
          {touched.company_name && fieldErrors.company_name && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.company_name}</p>
          )}
        </div>

        {/* Monto solicitado */}
        <div>
          <label htmlFor="naf-amount" className="block text-sm font-medium text-foreground mb-1">Monto solicitado</label>
          <input
            id="naf-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => handleBlur('requested_amount')}
            className={fieldCls('requested_amount')}
            placeholder="100000"
            min="1"
            step="any"
            aria-invalid={touched.requested_amount && !!fieldErrors.requested_amount}
          />
          {touched.requested_amount && fieldErrors.requested_amount && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.requested_amount}</p>
          )}
        </div>

        {/* Moneda */}
        <div>
          <label htmlFor="naf-currency" className="block text-sm font-medium text-foreground mb-1">Moneda</label>
          <select
            id="naf-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={inputClass}
          >
            <option value="USD">USD — Dólar estadounidense</option>
            <option value="MXN">MXN — Peso mexicano</option>
          </select>
        </div>

        {/* Propósito del crédito */}
        <div>
          <label htmlFor="naf-purpose" className="block text-sm font-medium text-foreground mb-1">Propósito del crédito</label>
          <select
            id="naf-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as CreditPurpose)}
            onBlur={() => handleBlur('credit_purpose')}
            className={fieldCls('credit_purpose')}
            aria-invalid={touched.credit_purpose && !!fieldErrors.credit_purpose}
          >
            <option value="">Seleccionar propósito...</option>
            {CREDIT_PURPOSE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {touched.credit_purpose && fieldErrors.credit_purpose && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.credit_purpose}</p>
          )}
        </div>

        {/* Ventas anuales */}
        <div>
          <label htmlFor="naf-revenue" className="block text-sm font-medium text-foreground mb-1">
            Ventas anuales ({currency})
          </label>
          <input
            id="naf-revenue"
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            onBlur={() => handleBlur('declared_annual_revenue')}
            className={fieldCls('declared_annual_revenue')}
            placeholder="1000000"
            min="1"
            step="any"
            aria-invalid={touched.declared_annual_revenue && !!fieldErrors.declared_annual_revenue}
          />
          {touched.declared_annual_revenue && fieldErrors.declared_annual_revenue && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.declared_annual_revenue}</p>
          )}
        </div>

        {/* Antigüedad */}
        <div>
          <label htmlFor="naf-age" className="block text-sm font-medium text-foreground mb-1">Antigüedad del negocio (años)</label>
          <input
            id="naf-age"
            type="number"
            value={businessAge}
            onChange={(e) => setBusinessAge(e.target.value)}
            onBlur={() => handleBlur('declared_business_age')}
            className={fieldCls('declared_business_age')}
            placeholder="5"
            min="0"
            step="0.5"
            aria-invalid={touched.declared_business_age && !!fieldErrors.declared_business_age}
          />
          {touched.declared_business_age && fieldErrors.declared_business_age && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.declared_business_age}</p>
          )}
        </div>

        {/* Plazo en días */}
        <div>
          <label htmlFor="naf-term" className="block text-sm font-medium text-foreground mb-1">Plazo (días)</label>
          <input
            id="naf-term"
            type="number"
            value={termDays}
            onChange={(e) => setTermDays(e.target.value)}
            onBlur={() => handleBlur('term_days')}
            className={fieldCls('term_days')}
            placeholder="45"
            min="2"
            max="90"
            step="1"
            aria-invalid={touched.term_days && !!fieldErrors.term_days}
          />
          <p className="text-xs text-muted-foreground mt-1">2-45 días estándar, hasta 90 con garantía</p>
          {touched.term_days && fieldErrors.term_days && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.term_days}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="naf-email" className="block text-sm font-medium text-foreground mb-1">Email de contacto</label>
          <input
            id="naf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('contact_email')}
            className={fieldCls('contact_email')}
            placeholder="contacto@empresa.com"
            autoComplete="email"
            aria-invalid={touched.contact_email && !!fieldErrors.contact_email}
          />
          {touched.contact_email && fieldErrors.contact_email && (
            <p className="text-xs text-status-error mt-1" role="alert">{fieldErrors.contact_email}</p>
          )}
        </div>

        {/* Teléfono (opcional) */}
        <div>
          <label htmlFor="naf-phone" className="block text-sm font-medium text-foreground mb-1">
            Teléfono <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="naf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="55 1234 5678"
            autoComplete="tel"
          />
        </div>

        {/* Representante legal (opcional) */}
        <div className="md:col-span-2">
          <label htmlFor="naf-legal" className="block text-sm font-medium text-foreground mb-1">
            Representante legal <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="naf-legal"
            type="text"
            value={legalRep}
            onChange={(e) => setLegalRep(e.target.value)}
            className={inputClass}
            placeholder="Nombre completo del representante legal"
          />
        </div>
      </div>

      {/* ─── Panel de Pre-filtro en tiempo real ─────────────────────────── */}
      {preFilterResult && (
        <div className={`rounded-lg border p-4 ${
          preFilterResult.passed
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-lg ${preFilterResult.passed ? 'text-green-500' : 'text-red-500'}`}>
              {preFilterResult.passed ? '✅' : '❌'}
            </span>
            <span className="text-sm font-medium text-foreground">
              Pre-filtro: {preFilterResult.passed ? 'ELEGIBLE' : 'NO ELEGIBLE'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {preFilterResult.score}% ({preFilterResult.rules.filter(r => r.passed).length}/{preFilterResult.rules.length} reglas)
            </span>
          </div>
          <div className="space-y-1">
            {preFilterResult.rules.map((rule) => (
              <div key={rule.rule} className="flex items-start gap-2 text-xs">
                <span className={rule.passed ? 'text-green-500' : 'text-red-500'}>
                  {rule.passed ? '✓' : '✗'}
                </span>
                <span className={rule.passed ? 'text-muted-foreground' : 'text-red-400'}>
                  {rule.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Submit ───────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={!hasAllFields || isLoading}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
      >
        {isLoading ? 'Procesando solicitud...' : 'Enviar solicitud'}
      </button>

      {preFilterResult && !preFilterResult.passed && (
        <p className="text-xs text-muted-foreground text-center">
          La solicitud no cumple los requisitos mínimos. Revisa los campos marcados arriba.
        </p>
      )}
    </form>
  );
}
