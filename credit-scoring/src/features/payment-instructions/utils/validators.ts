import type { CreateAccountInput, ValidationResult } from '../types/payment-instruction.types';

const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;

/**
 * Validates a SWIFT/BIC code: if provided, must be 8-11 alphanumeric characters.
 * Empty/undefined values are valid (SWIFT is optional).
 */
export function validateSWIFT(value: string | undefined): ValidationResult {
  const errors: Record<string, string> = {};

  if (value && value.trim() !== '') {
    if (value.length < 8 || value.length > 11 || !ALPHANUMERIC_REGEX.test(value)) {
      errors.swift_code = 'El código SWIFT debe tener entre 8 y 11 caracteres alfanuméricos';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates an account number: must be non-empty and alphanumeric only.
 */
export function validateAccountNumber(value: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!value || !ALPHANUMERIC_REGEX.test(value)) {
    errors.account_number = 'El número de cuenta debe contener solo caracteres alfanuméricos';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates that all required fields in CreateAccountInput are present and non-empty.
 * currency_types must have at least one element.
 */
export function validateRequiredFields(input: CreateAccountInput): ValidationResult {
  const errors: Record<string, string> = {};
  const requiredStringFields: (keyof Omit<CreateAccountInput, 'currency_types' | 'swift_code'>)[] = [
    'account_number',
    'account_name',
    'bank_name',
    'bank_address',
  ];

  for (const field of requiredStringFields) {
    if (!input[field] || input[field].trim() === '') {
      errors[field] = 'Este campo es requerido';
    }
  }

  if (!input.currency_types || input.currency_types.length === 0) {
    errors.currency_types = 'Este campo es requerido';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Combines all validations for the create account form.
 * Runs required fields, SWIFT format, and account number format validations.
 */
export function validateCreateAccountForm(input: CreateAccountInput): ValidationResult {
  const requiredResult = validateRequiredFields(input);

  // If required fields are missing, return those errors first
  if (!requiredResult.valid) {
    return requiredResult;
  }

  const swiftResult = validateSWIFT(input.swift_code);
  const accountResult = validateAccountNumber(input.account_number);

  const errors: Record<string, string> = {
    ...swiftResult.errors,
    ...accountResult.errors,
  };

  return { valid: Object.keys(errors).length === 0, errors };
}
