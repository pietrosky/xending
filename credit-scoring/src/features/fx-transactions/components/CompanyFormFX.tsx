/**
 * CompanyFormFX — Formulario de registro/edición de empresa FX.
 *
 * Campos: razón social, RFC (maskRfc), teléfono (maskPhone), dirección fiscal,
 * cuentas de pago CLABE (maskClabe, dinámicas), email y nombre de contacto.
 * Campo adicional para admin: selector de owners.
 *
 * Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 2.4
 */

import { useState, useEffect } from 'react';
import {
  RFC_3_REGEX,
  RFC_4_REGEX,
} from '../../credit-scoring/utils/inputMasks';
import { MaskedInput } from './MaskedInput';
import { useRFCValidation } from '../hooks/useRFCValidation';
import type { CompanyFX, CreateCompanyFXInput } from '../types/company-fx.types';
import type { CompanyAddress } from '../../onboarding/types/company.types';

// ─── Props ───────────────────────────────────────────────────────────

export interface CompanyFormFXProps {
  mode: 'create' | 'edit';
  initialData?: CompanyFX;
  isAdmin?: boolean;
  onSubmit: (input: CreateCompanyFXInput) => void;
  onToggleStatus?: (companyId: string, disabled: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
}

// ─── Validation ──────────────────────────────────────────────────────

interface FieldErrors {
  legal_name?: string;
  rfc?: string;
  business_activity?: string;
  phone?: string;
  contact_email?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  clabes?: string;
  owners?: string;
}

function validate(
  legalName: string,
  rfc: string,
  businessActivity: string,
  phone: string,
  contactEmail: string,
  address: CompanyAddress,
  clabes: Array<{ clabe: string; bank_name: string }>,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!legalName.trim()) errors.legal_name = 'Razón social es requerida';
  if (!rfc.trim()) {
    errors.rfc = 'RFC es requerido';
  } else if (!RFC_3_REGEX.test(rfc) && !RFC_4_REGEX.test(rfc)) {
    errors.rfc = 'RFC debe tener 12 (moral) o 13 (física) caracteres válidos';
  }
  if (!businessActivity.trim()) errors.business_activity = 'Giro de negocio es requerido';

  const phoneDigits = phone.replace(/\s/g, '');
  if (phoneDigits && phoneDigits.length !== 10) {
    errors.phone = 'Teléfono debe tener 10 dígitos';
  }

  if (!contactEmail.trim()) {
    errors.contact_email = 'Email de contacto es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
    errors.contact_email = 'Email inválido';
  }

  if (!address.street?.trim()) errors.street = 'Calle es requerida';
  if (!address.city?.trim()) errors.city = 'Ciudad es requerida';
  if (!address.state?.trim()) errors.state = 'Estado es requerido';
  if (!address.zip?.trim()) errors.zip = 'Código postal es requerido';
  if (!address.country?.trim()) errors.country = 'País es requerido';

  // At least 1 CLABE with 18 digits
  const validClabes = clabes.filter((c) => /^\d{18}$/.test(c.clabe));
  if (validClabes.length === 0) {
    errors.clabes = 'Al menos una cuenta CLABE válida (18 dígitos) es requerida';
  }

  return errors;
}

// ─── Component ───────────────────────────────────────────────────────

export function CompanyFormFX({
  mode,
  initialData,
  isAdmin = false,
  onSubmit,
  onToggleStatus,
  isLoading = false,
  error,
}: CompanyFormFXProps) {
  // Form state
  const [legalName, setLegalName] = useState('');
  const [rfc, setRfc] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [businessActivity, setBusinessActivity] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [address, setAddress] = useState<CompanyAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'México',
  });
  const [clabes, setClabes] = useState<Array<{ clabe: string; bank_name: string }>>([{ clabe: '', bank_name: '' }]);
  const [owners, setOwners] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // RFC duplicate validation (debounced API check)
  const rfcValidation = useRFCValidation(rfc, mode === 'edit' ? initialData?.id : null);

  // Pre-populate in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setLegalName(initialData.legal_name ?? '');
      setRfc(initialData.rfc ?? '');
      setTradeName(initialData.trade_name ?? '');
      setBusinessActivity(initialData.business_activity ?? '');
      setContactEmail('');
      setContactName('');
      setAddress(initialData.address ?? { street: '', city: '', state: '', zip: '', country: 'México' });

      if (initialData.payment_accounts?.length) {
        setClabes(initialData.payment_accounts.map((pa) => ({
          clabe: pa.clabe.replace(/[^0-9]/g, ''),
          bank_name: pa.bank_name ?? '',
        })));
      }
    }
  }, [mode, initialData]);

  const errors = validate(legalName, rfc, businessActivity, phone, contactEmail, address, clabes);

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function updateAddress(field: keyof CompanyAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  // ─── CLABE management ────────────────────────────────────────────

  function updateClabe(index: number, field: 'clabe' | 'bank_name', value: string) {
    setClabes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addClabe() {
    setClabes((prev) => [...prev, { clabe: '', bank_name: '' }]);
  }

  function removeClabe(index: number) {
    if (clabes.length <= 1) return; // min 1
    setClabes((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Submit ──────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Touch all fields
    const allTouched: Record<string, boolean> = {};
    const allFields = [
      'legal_name', 'rfc', 'business_activity', 'phone', 'contact_email',
      'street', 'city', 'state', 'zip', 'country', 'clabes',
    ];
    for (const f of allFields) allTouched[f] = true;
    setTouched(allTouched);

    if (Object.keys(errors).length > 0) return;

    // Block submit if RFC is being checked or is a duplicate
    if (rfcValidation.isChecking || rfcValidation.isDuplicate) return;

    const input: CreateCompanyFXInput = {
      rfc: rfc.toUpperCase(),
      legal_name: legalName.trim(),
      trade_name: tradeName.trim() || undefined,
      business_activity: businessActivity.trim(),
      phone: phone.replace(/\s/g, '') || undefined,
      address,
      payment_accounts: clabes
        .filter((c) => /^\d{18}$/.test(c.clabe))
        .map((c) => ({ clabe: c.clabe, bank_name: c.bank_name || undefined })),
      contact_email: contactEmail.trim(),
      contact_name: contactName.trim() || undefined,
    };

    onSubmit(input);
  }

  // ─── Styling helpers ─────────────────────────────────────────────

  const inputBase =
    'w-full px-3 py-2 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2';
  const inputOk = `${inputBase} border-border focus:ring-primary/40`;
  const inputErr = `${inputBase} border-status-error focus:ring-status-error/40`;

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
          {mode === 'create' ? 'Registrar Empresa' : 'Editar Empresa'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'create'
            ? 'Complete los datos fiscales y cuentas de pago de la empresa.'
            : 'Modifique los datos de la empresa.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {/* ─── Datos generales ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Razón social */}
        <div className="md:col-span-2">
          <label htmlFor="cfx-legal-name" className="block text-sm font-medium text-foreground mb-1">
            Razón Social
          </label>
          <input
            id="cfx-legal-name"
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            onBlur={() => handleBlur('legal_name')}
            className={cls('legal_name')}
            placeholder="Empresa S.A. de C.V."
            aria-invalid={!!errMsg('legal_name')}
          />
          {errMsg('legal_name') && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('legal_name')}</p>
          )}
        </div>

        {/* RFC */}
        <div>
          <label htmlFor="cfx-rfc" className="block text-sm font-medium text-foreground mb-1">RFC</label>
          <MaskedInput
            id="cfx-rfc"
            mask="RFC"
            value={rfc}
            onChange={(val) => setRfc(val)}
            onBlur={() => handleBlur('rfc')}
            className={rfcValidation.isDuplicate ? inputErr : cls('rfc')}
            placeholder="XAXX010101000"
            maxLength={13}
            autoComplete="off"
            aria-invalid={!!errMsg('rfc') || rfcValidation.isDuplicate}
          />
          {rfcValidation.isChecking && (
            <p className="text-xs text-muted-foreground mt-1">Verificando RFC…</p>
          )}
          {rfcValidation.error && (
            <p className="text-xs text-status-error mt-1" role="alert">{rfcValidation.error}</p>
          )}
          {errMsg('rfc') && !rfcValidation.error && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('rfc')}</p>
          )}
        </div>

        {/* Nombre comercial */}
        <div>
          <label htmlFor="cfx-trade-name" className="block text-sm font-medium text-foreground mb-1">
            Nombre Comercial <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="cfx-trade-name"
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            className={inputOk}
            placeholder="Nombre comercial"
          />
        </div>

        {/* Giro de negocio */}
        <div>
          <label htmlFor="cfx-activity" className="block text-sm font-medium text-foreground mb-1">
            Giro de Negocio
          </label>
          <input
            id="cfx-activity"
            type="text"
            value={businessActivity}
            onChange={(e) => setBusinessActivity(e.target.value)}
            onBlur={() => handleBlur('business_activity')}
            className={cls('business_activity')}
            placeholder="Comercio internacional"
            aria-invalid={!!errMsg('business_activity')}
          />
          {errMsg('business_activity') && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('business_activity')}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="cfx-phone" className="block text-sm font-medium text-foreground mb-1">
            Teléfono <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <MaskedInput
            id="cfx-phone"
            mask="99 9999 9999"
            value={phone}
            onChange={(val) => setPhone(val)}
            onBlur={() => handleBlur('phone')}
            className={cls('phone')}
            placeholder="55 1234 5678"
            autoComplete="tel"
            aria-invalid={!!errMsg('phone')}
          />
          {errMsg('phone') && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('phone')}</p>
          )}
        </div>
      </div>

      {/* ─── Contacto ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cfx-email" className="block text-sm font-medium text-foreground mb-1">
            Email de Contacto
          </label>
          <input
            id="cfx-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onBlur={() => handleBlur('contact_email')}
            className={cls('contact_email')}
            placeholder="contacto@empresa.com"
            autoComplete="email"
            aria-invalid={!!errMsg('contact_email')}
          />
          {errMsg('contact_email') && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('contact_email')}</p>
          )}
        </div>

        <div>
          <label htmlFor="cfx-contact-name" className="block text-sm font-medium text-foreground mb-1">
            Nombre de Contacto <span className="text-muted-foreground font-normal">— opcional</span>
          </label>
          <input
            id="cfx-contact-name"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputOk}
            placeholder="Nombre del contacto"
          />
        </div>
      </div>

      {/* ─── Dirección fiscal ─────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Dirección Fiscal</legend>

        <div>
          <label htmlFor="cfx-street" className="block text-sm font-medium text-foreground mb-1">Calle</label>
          <input
            id="cfx-street"
            type="text"
            value={address.street ?? ''}
            onChange={(e) => updateAddress('street', e.target.value)}
            onBlur={() => handleBlur('street')}
            className={cls('street')}
            placeholder="Av. Reforma 123, Col. Centro"
            aria-invalid={!!errMsg('street')}
          />
          {errMsg('street') && (
            <p className="text-xs text-status-error mt-1" role="alert">{errMsg('street')}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cfx-city" className="block text-sm font-medium text-foreground mb-1">Ciudad</label>
            <input
              id="cfx-city"
              type="text"
              value={address.city ?? ''}
              onChange={(e) => updateAddress('city', e.target.value)}
              onBlur={() => handleBlur('city')}
              className={cls('city')}
              placeholder="Ciudad de México"
              aria-invalid={!!errMsg('city')}
            />
            {errMsg('city') && (
              <p className="text-xs text-status-error mt-1" role="alert">{errMsg('city')}</p>
            )}
          </div>

          <div>
            <label htmlFor="cfx-state" className="block text-sm font-medium text-foreground mb-1">Estado</label>
            <input
              id="cfx-state"
              type="text"
              value={address.state ?? ''}
              onChange={(e) => updateAddress('state', e.target.value)}
              onBlur={() => handleBlur('state')}
              className={cls('state')}
              placeholder="CDMX"
              aria-invalid={!!errMsg('state')}
            />
            {errMsg('state') && (
              <p className="text-xs text-status-error mt-1" role="alert">{errMsg('state')}</p>
            )}
          </div>

          <div>
            <label htmlFor="cfx-zip" className="block text-sm font-medium text-foreground mb-1">Código Postal</label>
            <input
              id="cfx-zip"
              type="text"
              value={address.zip ?? ''}
              onChange={(e) => updateAddress('zip', e.target.value)}
              onBlur={() => handleBlur('zip')}
              className={cls('zip')}
              placeholder="06600"
              maxLength={5}
              aria-invalid={!!errMsg('zip')}
            />
            {errMsg('zip') && (
              <p className="text-xs text-status-error mt-1" role="alert">{errMsg('zip')}</p>
            )}
          </div>

          <div>
            <label htmlFor="cfx-country" className="block text-sm font-medium text-foreground mb-1">País</label>
            <input
              id="cfx-country"
              type="text"
              value={address.country ?? ''}
              onChange={(e) => updateAddress('country', e.target.value)}
              onBlur={() => handleBlur('country')}
              className={cls('country')}
              placeholder="México"
              aria-invalid={!!errMsg('country')}
            />
            {errMsg('country') && (
              <p className="text-xs text-status-error mt-1" role="alert">{errMsg('country')}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ─── Cuentas CLABE ────────────────────────────────────────── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Cuentas de Pago CLABE</legend>

        {clabes.map((account, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`cfx-clabe-${idx}`}
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  CLABE {idx + 1}
                </label>
                <MaskedInput
                  id={`cfx-clabe-${idx}`}
                  mask="999-999-99999999999-9"
                  value={account.clabe}
                  onChange={(val) => updateClabe(idx, 'clabe', val)}
                  onBlur={() => handleBlur('clabes')}
                  className={touched.clabes && account.clabe.length > 0 && account.clabe.length !== 18 ? inputErr : inputOk}
                  placeholder="012-345-67890123456-7"
                  aria-invalid={touched.clabes && account.clabe.length > 0 && account.clabe.length !== 18}
                />
              </div>
              <div>
                <label
                  htmlFor={`cfx-bank-${idx}`}
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Banco
                </label>
                <input
                  id={`cfx-bank-${idx}`}
                  type="text"
                  value={account.bank_name}
                  onChange={(e) => updateClabe(idx, 'bank_name', e.target.value)}
                  className={inputOk}
                  placeholder="Nombre del banco"
                />
              </div>
            </div>
            {clabes.length > 1 && (
              <button
                type="button"
                onClick={() => removeClabe(idx)}
                className="mt-7 px-2 py-2 text-sm text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                aria-label={`Eliminar cuenta ${idx + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {touched.clabes && errors.clabes && (
          <p className="text-xs text-status-error" role="alert">{errors.clabes}</p>
        )}

        <button
          type="button"
          onClick={addClabe}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          + Agregar cuenta CLABE
        </button>
      </fieldset>

      {/* ─── Admin: Owner selector ────────────────────────────────── */}
      {isAdmin && (
        <div>
          <label htmlFor="cfx-owners" className="block text-sm font-medium text-foreground mb-1">
            Asignar Acceso (Usuarios)
          </label>
          <input
            id="cfx-owners"
            type="text"
            value={owners}
            onChange={(e) => setOwners(e.target.value)}
            className={inputOk}
            placeholder="UUID del usuario o email (separados por coma)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ingrese los identificadores de los usuarios que tendrán acceso a esta empresa.
          </p>
        </div>
      )}

      {/* ─── Deshabilitar empresa (admin only, edit mode) ─────────── */}
      {isAdmin && mode === 'edit' && initialData && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Estado de la empresa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {initialData.status === 'active'
                ? 'La empresa está activa. Deshabilitar impedirá crear nuevas transacciones.'
                : 'La empresa está deshabilitada. Habilitar permitirá operar nuevamente.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              initialData.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {initialData.status === 'active' ? 'Activa' : 'Deshabilitada'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={initialData.status !== 'active'}
                onChange={() => onToggleStatus?.(initialData.id, initialData.status === 'active')}
                className="sr-only peer"
                aria-label={initialData.status === 'active' ? 'Deshabilitar empresa' : 'Habilitar empresa'}
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
      )}

      {/* ─── Submit ───────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
      >
        {isLoading
          ? 'Guardando...'
          : mode === 'create'
            ? 'Registrar Empresa'
            : 'Guardar Cambios'}
      </button>
    </form>
  );
}
