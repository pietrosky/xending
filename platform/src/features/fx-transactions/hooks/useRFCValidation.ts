import { useState, useEffect, useCallback } from 'react';
import { checkRFCExists } from '../services/rfcValidation';
import { useDebounce } from './useDebounce';

interface RFCValidationState {
  isChecking: boolean;
  isDuplicate: boolean;
  error: string | null;
}

export function useRFCValidation(rfc: string, companyId?: string | null) {
  const [validationState, setValidationState] = useState<RFCValidationState>({
    isChecking: false,
    isDuplicate: false,
    error: null,
  });

  const debouncedRFC = useDebounce(rfc, 1000);

  const validateRFC = useCallback(async (rfcValue: string, excludeId?: string | null) => {
    if (!rfcValue || (rfcValue.length !== 12 && rfcValue.length !== 13)) {
      setValidationState({ isChecking: false, isDuplicate: false, error: null });
      return;
    }

    const rfc3Pattern = /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/;
    const rfc4Pattern = /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const upperRFC = rfcValue.toUpperCase();

    if (!rfc3Pattern.test(upperRFC) && !rfc4Pattern.test(upperRFC)) {
      setValidationState({
        isChecking: false,
        isDuplicate: false,
        error: 'Formato de RFC inválido. Debe ser: 3-4 letras + 6 números + 1 letra + 2 caracteres alfanuméricos',
      });
      return;
    }

    setValidationState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const exists = await checkRFCExists(rfcValue, excludeId || undefined);
      setValidationState({
        isChecking: false,
        isDuplicate: exists,
        error: exists
          ? 'Ya hay un registro existente con este RFC, consulta con tu superior, que pasos seguir en estos casos'
          : null,
      });
    } catch (err) {
      console.error('Error validating RFC:', err);
      setValidationState({
        isChecking: false,
        isDuplicate: false,
        error: 'Error al validar RFC. Intenta nuevamente.',
      });
    }
  }, []);

  useEffect(() => {
    validateRFC(debouncedRFC, companyId);
  }, [debouncedRFC, companyId, validateRFC]);

  return validationState;
}
