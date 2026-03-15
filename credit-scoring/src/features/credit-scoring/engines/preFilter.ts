/**
 * Engine de Pre-Filtro — Etapa 1 del flujo de otorgamiento Xending.
 *
 * Evalúa datos mínimos del solicitante contra las reglas de negocio
 * para decidir GO/NO-GO antes de incurrir en costos (PLD, Buró, SAT).
 *
 * Reglas de negocio Xending:
 * - Monto: $100K - $1M USD
 * - Ventas anuales ≥ 10x monto solicitado
 * - Antigüedad ≥ 2 años
 * - Propósito: importación, factoraje, operaciones FX, exportación
 * - Plazo: 2-45 días (hasta 90 con garantía)
 * - NO capital de trabajo puro
 */

import type {
  PreFilterInput,
  PreFilterResult,
  PreFilterRuleResult,
  BusinessRules,
  CreditPurpose,
} from '../types/expediente.types';
import { DEFAULT_BUSINESS_RULES } from '../types/expediente.types';

// ─── Tipo de cambio referencia para conversión MXN→USD ───────────────

/** Tipo de cambio conservador para pre-filtro (se actualiza después con dato real) */
const MXN_USD_RATE = 17.5;

/** Convierte monto a USD si viene en MXN */
function toUsd(amount: number, currency: string): number {
  return currency === 'MXN' ? amount / MXN_USD_RATE : amount;
}

// ─── Validación de RFC ───────────────────────────────────────────────

const RFC_MORAL_REGEX = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/i;
const RFC_FISICA_REGEX = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/i;

function isValidRfc(rfc: string): boolean {
  const clean = rfc.trim().toUpperCase();
  return RFC_MORAL_REGEX.test(clean) || RFC_FISICA_REGEX.test(clean);
}

// ─── Reglas individuales ─────────────────────────────────────────────

function checkRfc(input: PreFilterInput): PreFilterRuleResult {
  const valid = isValidRfc(input.rfc);
  return {
    rule: 'rfc_valid',
    passed: valid,
    message: valid ? 'RFC con formato válido' : 'RFC con formato inválido',
    actual_value: input.rfc,
    threshold: 'Formato RFC válido (12-13 caracteres)',
  };
}

function checkAmount(input: PreFilterInput, rules: BusinessRules): PreFilterRuleResult {
  const amountUsd = toUsd(input.requested_amount, input.currency);
  const passed = amountUsd >= rules.min_amount_usd && amountUsd <= rules.max_amount_usd;
  let message: string;
  if (amountUsd < rules.min_amount_usd) {
    message = `Monto USD $${amountUsd.toLocaleString()} menor al mínimo de $${rules.min_amount_usd.toLocaleString()}`;
  } else if (amountUsd > rules.max_amount_usd) {
    message = `Monto USD $${amountUsd.toLocaleString()} excede el máximo de $${rules.max_amount_usd.toLocaleString()}`;
  } else {
    message = `Monto USD $${amountUsd.toLocaleString()} dentro del rango permitido`;
  }
  return {
    rule: 'amount_range',
    passed,
    message,
    actual_value: amountUsd,
    threshold: `$${rules.min_amount_usd.toLocaleString()} - $${rules.max_amount_usd.toLocaleString()} USD`,
  };
}

function checkPurpose(input: PreFilterInput, rules: BusinessRules): PreFilterRuleResult {
  const passed = rules.accepted_purposes.includes(input.credit_purpose);
  return {
    rule: 'credit_purpose',
    passed,
    message: passed
      ? `Propósito "${input.credit_purpose}" es válido para Xending`
      : `Propósito "${input.credit_purpose}" no es elegible. Solo: ${rules.accepted_purposes.join(', ')}`,
    actual_value: input.credit_purpose,
    threshold: rules.accepted_purposes,
  };
}

function checkRevenue(input: PreFilterInput, rules: BusinessRules): PreFilterRuleResult {
  const amountUsd = toUsd(input.requested_amount, input.currency);
  const revenueUsd = toUsd(input.declared_annual_revenue, input.currency);
  const requiredRevenue = amountUsd * rules.min_revenue_multiplier;
  const passed = revenueUsd >= requiredRevenue;
  const ratio = revenueUsd > 0 ? (revenueUsd / amountUsd).toFixed(1) : '0';
  return {
    rule: 'revenue_multiplier',
    passed,
    message: passed
      ? `Ventas anuales USD $${revenueUsd.toLocaleString()} = ${ratio}x el monto (mínimo ${rules.min_revenue_multiplier}x)`
      : `Ventas anuales USD $${revenueUsd.toLocaleString()} = ${ratio}x el monto. Requiere mínimo ${rules.min_revenue_multiplier}x ($${requiredRevenue.toLocaleString()})`,
    actual_value: revenueUsd,
    threshold: requiredRevenue,
  };
}

function checkBusinessAge(input: PreFilterInput, rules: BusinessRules): PreFilterRuleResult {
  const passed = input.declared_business_age >= rules.min_business_age_years;
  return {
    rule: 'business_age',
    passed,
    message: passed
      ? `Antigüedad de ${input.declared_business_age} años cumple el mínimo de ${rules.min_business_age_years}`
      : `Antigüedad de ${input.declared_business_age} años no cumple el mínimo de ${rules.min_business_age_years} años`,
    actual_value: input.declared_business_age,
    threshold: rules.min_business_age_years,
  };
}

function checkTermDays(input: PreFilterInput, rules: BusinessRules): PreFilterRuleResult {
  const maxAllowed = rules.max_term_days_with_guarantee;
  const passed = input.term_days >= rules.min_term_days && input.term_days <= maxAllowed;
  return {
    rule: 'term_days',
    passed,
    message: passed
      ? `Plazo de ${input.term_days} días dentro del rango permitido`
      : `Plazo de ${input.term_days} días fuera del rango ${rules.min_term_days}-${maxAllowed} días`,
    actual_value: input.term_days,
    threshold: `${rules.min_term_days}-${maxAllowed} días`,
  };
}

function checkEmail(input: PreFilterInput): PreFilterRuleResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passed = emailRegex.test(input.contact_email);
  return {
    rule: 'contact_email',
    passed,
    message: passed ? 'Email de contacto válido' : 'Email de contacto inválido',
    actual_value: input.contact_email,
    threshold: 'Formato de email válido',
  };
}

// ─── Engine principal ────────────────────────────────────────────────

/**
 * Ejecuta el pre-filtro completo contra las reglas de negocio.
 * Retorna GO (passed=true) o NO-GO (passed=false) con detalle por regla.
 */
export function runPreFilter(
  input: PreFilterInput,
  rules: BusinessRules = DEFAULT_BUSINESS_RULES
): PreFilterResult {
  const ruleResults: PreFilterRuleResult[] = [
    checkRfc(input),
    checkAmount(input, rules),
    checkPurpose(input, rules),
    checkRevenue(input, rules),
    checkBusinessAge(input, rules),
    checkTermDays(input, rules),
    checkEmail(input),
  ];

  const passed = ruleResults.every((r) => r.passed);
  const failedRules = ruleResults.filter((r) => !r.passed);

  // Score: porcentaje de reglas que pasaron (0-100)
  const score = Math.round((ruleResults.filter((r) => r.passed).length / ruleResults.length) * 100);

  // Primera razón de rechazo (la más importante)
  const firstFailed = failedRules[0] as PreFilterRuleResult | undefined;
  const rejectionReason = firstFailed ? firstFailed.message : null;

  return {
    passed,
    score,
    rules: ruleResults,
    rejection_reason: rejectionReason,
  };
}

// ─── Utilidades ──────────────────────────────────────────────────────

/** Valida solo los campos requeridos del formulario (sin reglas de negocio) */
export function validatePreFilterInput(input: Partial<PreFilterInput>): string[] {
  const errors: string[] = [];
  if (!input.rfc?.trim()) errors.push('RFC es requerido');
  if (!input.company_name?.trim()) errors.push('Nombre de empresa es requerido');
  if (!input.requested_amount || input.requested_amount <= 0) errors.push('Monto debe ser mayor a 0');
  if (!input.currency) errors.push('Moneda es requerida');
  if (!input.credit_purpose) errors.push('Propósito del crédito es requerido');
  if (!input.declared_annual_revenue || input.declared_annual_revenue <= 0) errors.push('Ventas anuales son requeridas');
  if (!input.declared_business_age || input.declared_business_age <= 0) errors.push('Antigüedad del negocio es requerida');
  if (!input.term_days || input.term_days <= 0) errors.push('Plazo en días es requerido');
  if (!input.contact_email?.trim()) errors.push('Email de contacto es requerido');
  return errors;
}

/** Lista de propósitos válidos para mostrar en el formulario */
export const CREDIT_PURPOSE_OPTIONS: Array<{ value: CreditPurpose; label: string }> = [
  { value: 'importacion', label: 'Financiamiento de importaciones' },
  { value: 'factoraje', label: 'Adelanto de facturas (factoraje)' },
  { value: 'operaciones_fx', label: 'Operaciones de cambio de divisas' },
  { value: 'exportacion', label: 'Financiamiento de exportaciones' },
];
