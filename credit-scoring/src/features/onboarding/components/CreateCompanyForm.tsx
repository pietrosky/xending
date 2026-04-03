/**
 * Formulario de alta de empresa — M01 Onboarding Lite.
 *
 * El admin captura: RFC, razón social, nombre comercial (opcional),
 * giro, email de contacto, teléfono (opcional), nombre de contacto (opcional).
 */

import { useState, useCallback } from 'react';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CreateCompanyInput } from '../types/company.types';
import { BUSINESS_ACTIVITIES } from '../types/company.types';

// ─── Validation ──────────────────────────────────────────────────────

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  rfc?: string;
  legal_name?: string;
  business_activity?: string;
  contact_email?: string;
}

function validate(data: Partial<CreateCompanyInput>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.rfc?.trim()) errors.rfc = 'RFC es requerido';
  else if (!RFC_REGEX.test(data.rfc.trim())) errors.rfc = 'Formato de RFC inválido';
  if (!data.legal_name?.trim() || (data.legal_name?.trim().length ?? 0) < 3)
    errors.legal_name = 'Razón social es requerida (mín. 3 caracteres)';
  if (!data.business_activity) errors.business_activity = 'Selecciona un giro';
  if (!data.contact_email?.trim()) errors.contact_email = 'Email es requerido';
  else if (!EMAIL_REGEX.test(data.contact_email.trim())) errors.contact_email = 'Email inválido';
  return errors;
}

// ─── Props ───────────────────────────────────────────────────────────

interface CreateCompanyFormProps {
  onSubmit: (data: CreateCompanyInput) => void;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export function CreateCompanyForm({
  onSubmit,
  isLoading = false,
  error,
  success,
}: CreateCompanyFormProps) {
  const [rfc, setRfc] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [activity, setActivity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const currentInput: Partial<CreateCompanyInput> = {
    rfc: rfc.trim().toUpperCase(),
    legal_name: legalName.trim(),
    trade_name: tradeName.trim() || undefined,
    business_activity: activity || undefined,
    contact_email: email.trim(),
    contact_phone: phone.trim() || undefined,
    contact_name: contactName.trim() || undefined,
  };

  const fieldErrors = validate(currentInput);
  const isValid = Object.keys(fieldErrors).length === 0;

  const handleBlur = useCallback((field: string) => {
    setTouched((prev: Record<string, boolean>) => ({ ...prev, [field]: true }));
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched({ rfc: true, legal_name: true, business_activity: true, contact_email: true });
    if (!isValid) return;
    onSubmit(currentInput as CreateCompanyInput);
  }

  function resetForm() {
    setRfc('');
    setLegalName('');
    setTradeName('');
    setActivity('');
    setEmail('');
    setPhone('');
    setContactName('');
    setTouched({});
  }

  const inputBase =
    'w-full px-3 py-2 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2';
  const inputOk = `${inputBase} border-border focus:ring-primary/40`;
  const inputErr = `${inputBase} border-status-error focus:ring-status-error/40`;

  function cls(field: keyof FieldErrors) {
    return touched[field] && fieldErrors[field] ? inputErr : inputOk;
  }

  // Success state
  if (success) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 max-w-2xl text-center space-y-4">
        <CheckCircle size={48} className="mx-auto text-status-success" />
        <h3 className="text-lg font-semibold text-foreground">Empresa registrada</h3>
        <p className="text-sm text-muted-foreground">
          La empresa fue dada de alta correctamente. Ya puedes crear una línea de servicio para operar.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          Registrar otra empresa
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-lg border border-border p-6 space-y-5 max-w-2xl"
      noValidate
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Alta de Empresa</h2>
          <p className="text-sm text-muted-foreground">
            Registra un nuevo cliente para operar
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-error/10 border border-status-error/20">
          <AlertCircle size={16} className="text-status-error shrink-0" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RFC */}
        <div>
          <label htmlFor="cc-rfc" className="block text-sm font-medium text-foreground mb-1">
            RFC
          </label>
          <input
            id="cc-rfc"
            type="text"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            onBlur={() => handleBlur('rfc')}
            className={cls('rfc')}
            placeholder="XAXX010101000"
            maxLength={13}
            autoComplete="off"
            aria-invalid={touched.rfc && !!fieldErrors.rfc}
            aria-describedby={touched.rfc && fieldErrors.rfc ? 'cc-rfc-err' : undefined}
          />
          {touched.rfc && fieldErrors.rfc && (
            <p id="cc-rfc-err" className="text-xs text-status-error mt-1" role="alert">
              {fieldErrors.rfc}
            </p>
          )}
        </div>

        {/* Razón social */}
        <div>
          <label htmlFor="cc-legal" className="block text-sm font-medium text-foreground mb-1">
            Razón social
          </label>
          <input
            id="cc-legal"
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            onBlur={() => handleBlur('legal_name')}
            className={cls('legal_name')}
            placeholder="Empresa S.A. de C.V."
            autoComplete="organization"
            aria-invalid={touched.legal_name && !!fieldErrors.legal_name}
          />
          {touched.legal_name && fieldErrors.legal_name && (
            <p className="text-xs text-status-error mt-1" role="alert">
              {fieldErrors.legal_name}
            </p>
          )}
        </div>

        {/* Nombre comercial (opcional) */}
        <div>
          <label htmlFor="cc-trade" className="block text-sm font-medium text-foreground mb-1">
            Nombre comercial{' '}
            <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="cc-trade"
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            className={inputOk}
            placeholder="Nombre comercial"
          />
        </div>

        {/* Giro */}
        <div>
          <label htmlFor="cc-activity" className="block text-sm font-medium text-foreground mb-1">
            Giro o actividad
          </label>
          <select
            id="cc-activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            onBlur={() => handleBlur('business_activity')}
            className={cn(cls('business_activity'), !activity && 'text-muted-foreground')}
            aria-invalid={touched.business_activity && !!fieldErrors.business_activity}
          >
            <option value="">Seleccionar giro...</option>
            {BUSINESS_ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          {touched.business_activity && fieldErrors.business_activity && (
            <p className="text-xs text-status-error mt-1" role="alert">
              {fieldErrors.business_activity}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="cc-email" className="block text-sm font-medium text-foreground mb-1">
            Email de contacto
          </label>
          <input
            id="cc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('contact_email')}
            className={cls('contact_email')}
            placeholder="contacto@empresa.com"
            autoComplete="email"
            aria-invalid={touched.contact_email && !!fieldErrors.contact_email}
          />
          {touched.contact_email && fieldErrors.contact_email && (
            <p className="text-xs text-status-error mt-1" role="alert">
              {fieldErrors.contact_email}
            </p>
          )}
        </div>

        {/* Teléfono (opcional) */}
        <div>
          <label htmlFor="cc-phone" className="block text-sm font-medium text-foreground mb-1">
            Teléfono{' '}
            <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="cc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputOk}
            placeholder="55 1234 5678"
            autoComplete="tel"
          />
        </div>

        {/* Nombre de contacto (opcional) */}
        <div className="md:col-span-2">
          <label htmlFor="cc-name" className="block text-sm font-medium text-foreground mb-1">
            Nombre del contacto{' '}
            <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="cc-name"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputOk}
            placeholder="Nombre de la persona de contacto"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
      >
        {isLoading ? 'Registrando...' : 'Registrar empresa'}
      </button>
    </form>
  );
}
