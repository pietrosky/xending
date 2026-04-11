import { describe, it, expect } from 'vitest';
import {
  validateSWIFT,
  validateAccountNumber,
  validateRequiredFields,
  validateCreateAccountForm,
} from './validators';
import type { CreateAccountInput } from '../types/payment-instruction.types';

const validInput: CreateAccountInput = {
  account_number: 'ACC123456',
  account_name: 'Test Account',
  swift_code: 'ABCDEF12',
  bank_name: 'Test Bank',
  bank_address: '123 Main St',
  currency_types: ['USD'],
};

describe('validateSWIFT', () => {
  it('accepts valid 8-character SWIFT code', () => {
    expect(validateSWIFT('ABCDEF12').valid).toBe(true);
  });

  it('accepts valid 11-character SWIFT code', () => {
    expect(validateSWIFT('ABCDEF12345').valid).toBe(true);
  });

  it('rejects SWIFT code shorter than 8 characters', () => {
    const result = validateSWIFT('ABC1234');
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBeDefined();
  });

  it('rejects SWIFT code longer than 11 characters', () => {
    const result = validateSWIFT('ABCDEF123456');
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBeDefined();
  });

  it('rejects SWIFT code with special characters', () => {
    const result = validateSWIFT('ABCD-F12');
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBeDefined();
  });

  it('rejects empty string', () => {
    const result = validateSWIFT('');
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBeDefined();
  });
});

describe('validateAccountNumber', () => {
  it('accepts valid alphanumeric account number', () => {
    expect(validateAccountNumber('ACC123456').valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateAccountNumber('');
    expect(result.valid).toBe(false);
    expect(result.errors.account_number).toBeDefined();
  });

  it('rejects account number with spaces', () => {
    const result = validateAccountNumber('ACC 123');
    expect(result.valid).toBe(false);
    expect(result.errors.account_number).toBeDefined();
  });

  it('rejects account number with special characters', () => {
    const result = validateAccountNumber('ACC-123');
    expect(result.valid).toBe(false);
    expect(result.errors.account_number).toBeDefined();
  });
});

describe('validateRequiredFields', () => {
  it('passes when all fields are present', () => {
    expect(validateRequiredFields(validInput).valid).toBe(true);
  });

  it('fails when account_number is empty', () => {
    const result = validateRequiredFields({ ...validInput, account_number: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.account_number).toBeDefined();
  });

  it('fails when currency_types is empty array', () => {
    const result = validateRequiredFields({ ...validInput, currency_types: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.currency_types).toBeDefined();
  });

  it('identifies multiple missing fields', () => {
    const result = validateRequiredFields({
      ...validInput,
      account_name: '',
      bank_name: '  ',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.account_name).toBeDefined();
    expect(result.errors.bank_name).toBeDefined();
  });
});

describe('validateCreateAccountForm', () => {
  it('passes with fully valid input', () => {
    expect(validateCreateAccountForm(validInput).valid).toBe(true);
  });

  it('returns required field errors before format errors', () => {
    const result = validateCreateAccountForm({ ...validInput, swift_code: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBe('Este campo es requerido');
  });

  it('returns SWIFT format error when required fields pass but SWIFT is invalid', () => {
    const result = validateCreateAccountForm({ ...validInput, swift_code: 'SHORT' });
    expect(result.valid).toBe(false);
    expect(result.errors.swift_code).toBeDefined();
  });

  it('returns account number format error for non-alphanumeric', () => {
    const result = validateCreateAccountForm({ ...validInput, account_number: 'ACC-123' });
    expect(result.valid).toBe(false);
    expect(result.errors.account_number).toBeDefined();
  });
});
