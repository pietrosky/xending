import { useState } from 'react';
import type { Currency, NewApplicationData } from '../types/application.types';

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;

interface NewApplicationFormProps {
  onSubmit: (data: NewApplicationData) => void;
  isLoading?: boolean;
}

interface FormErrors {
  rfc?: string;
  company_name?: string;
  requested_amount?: string;
}

function validateRfc(value: string): string | undefined {
  if (!value.trim()) return 'RFC es requerido';
  if (!RFC_REGEX.test(value.trim())) return 'RFC invalido (12-13 caracteres alfanumericos)';
  return undefined;
}

function validateCompanyName(value: string): string | undefined {
  if (!value.trim()) return 'Nombre de empresa es requerido';
  return undefined;
}

function validateAmount(value: string): string | undefined {
  if (!value.trim()) return 'Monto es requerido';
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return 'Monto debe ser mayor a 0';
  return undefined;
}

export function NewApplicationForm({ onSubmit, isLoading = false }: NewApplicationFormProps) {
  const [rfc, setRfc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    return {
      rfc: validateRfc(rfc),
      company_name: validateCompanyName(companyName),
      requested_amount: validateAmount(amount),
    };
  }

  const currentErrors = validate();
  const isValid = !currentErrors.rfc && !currentErrors.company_name && !currentErrors.requested_amount;

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ rfc: true, company_name: true, requested_amount: true });

    if (validationErrors.rfc || validationErrors.company_name || validationErrors.requested_amount) {
      return;
    }

    onSubmit({
      rfc: rfc.trim().toUpperCase(),
      company_name: companyName.trim(),
      requested_amount: Number(amount),
      term_months: termMonths.trim() ? Number(termMonths) : null,
      currency,
    });
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
  const errorInputClass =
    'w-full px-3 py-2 rounded-lg border border-status-error bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-status-error/40';

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 space-y-5 max-w-lg" noValidate>
      {/* RFC */}
      <div>
        <label htmlFor="naf-rfc" className="block text-sm font-medium text-foreground mb-1">
          RFC
        </label>
        <input
          id="naf-rfc"
          type="text"
          value={rfc}
          onChange={(e) => setRfc(e.target.value)}
          onBlur={() => handleBlur('rfc')}
          className={touched.rfc && errors.rfc ? errorInputClass : inputClass}
          placeholder="XAXX010101000"
          maxLength={13}
          autoComplete="off"
          aria-invalid={touched.rfc && !!errors.rfc}
          aria-describedby={touched.rfc && errors.rfc ? 'naf-rfc-error' : undefined}
        />
        {touched.rfc && errors.rfc && (
          <p id="naf-rfc-error" className="text-xs text-status-error mt-1" role="alert">{errors.rfc}</p>
        )}
      </div>

      {/* Empresa */}
      <div>
        <label htmlFor="naf-company" className="block text-sm font-medium text-foreground mb-1">
          Empresa
        </label>
        <input
          id="naf-company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onBlur={() => handleBlur('company_name')}
          className={touched.company_name && errors.company_name ? errorInputClass : inputClass}
          placeholder="Nombre de la empresa"
          autoComplete="organization"
          aria-invalid={touched.company_name && !!errors.company_name}
          aria-describedby={touched.company_name && errors.company_name ? 'naf-company-error' : undefined}
        />
        {touched.company_name && errors.company_name && (
          <p id="naf-company-error" className="text-xs text-status-error mt-1" role="alert">{errors.company_name}</p>
        )}
      </div>

      {/* Monto solicitado */}
      <div>
        <label htmlFor="naf-amount" className="block text-sm font-medium text-foreground mb-1">
          Monto solicitado
        </label>
        <input
          id="naf-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => handleBlur('requested_amount')}
          className={touched.requested_amount && errors.requested_amount ? errorInputClass : inputClass}
          placeholder="0"
          min="1"
          step="any"
          aria-invalid={touched.requested_amount && !!errors.requested_amount}
          aria-describedby={touched.requested_amount && errors.requested_amount ? 'naf-amount-error' : undefined}
        />
        {touched.requested_amount && errors.requested_amount && (
          <p id="naf-amount-error" className="text-xs text-status-error mt-1" role="alert">{errors.requested_amount}</p>
        )}
      </div>

      {/* Plazo */}
      <div>
        <label htmlFor="naf-term" className="block text-sm font-medium text-foreground mb-1">
          Plazo (meses) <span className="text-muted-foreground font-normal">— opcional</span>
        </label>
        <input
          id="naf-term"
          type="number"
          value={termMonths}
          onChange={(e) => setTermMonths(e.target.value)}
          className={inputClass}
          placeholder="12"
          min="1"
          step="1"
        />
      </div>

      {/* Moneda */}
      <div>
        <label htmlFor="naf-currency" className="block text-sm font-medium text-foreground mb-1">
          Moneda
        </label>
        <select
          id="naf-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className={inputClass}
        >
          <option value="MXN">MXN — Peso mexicano</option>
          <option value="USD">USD — Dolar estadounidense</option>
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
      >
        {isLoading ? 'Creando solicitud...' : 'Crear solicitud'}
      </button>
    </form>
  );
}
