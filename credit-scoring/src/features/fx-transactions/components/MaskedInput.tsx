import React, { forwardRef, useState } from 'react';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, placeholder, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    const applyMask = (inputValue: string, maskPattern: string) => {
      const cleanValue = inputValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      if (maskPattern === 'RFC') {
        return applyRFCMask(cleanValue);
      }

      let maskedValue = '';
      let valueIndex = 0;

      for (let i = 0; i < maskPattern.length && valueIndex < cleanValue.length; i++) {
        const maskChar = maskPattern[i];
        const inputChar = cleanValue[valueIndex];

        if (maskChar === 'A') {
          if (/[A-Z]/.test(inputChar!)) {
            maskedValue += inputChar;
            valueIndex++;
          } else {
            break;
          }
        } else if (maskChar === '9') {
          if (/[0-9]/.test(inputChar!)) {
            maskedValue += inputChar;
            valueIndex++;
          } else {
            break;
          }
        } else if (maskChar === 'X') {
          if (/[A-Z0-9]/.test(inputChar!)) {
            maskedValue += inputChar;
            valueIndex++;
          } else {
            break;
          }
        } else {
          maskedValue += maskChar;
        }
      }

      return maskedValue;
    };

    const applyRFCMask = (cleanValue: string) => {
      let maskedValue = '';
      let valueIndex = 0;

      // First 3-4 letters (alphabetical)
      while (valueIndex < cleanValue.length && valueIndex < 4 && /[A-Z]/.test(cleanValue[valueIndex]!)) {
        maskedValue += cleanValue[valueIndex];
        valueIndex++;
      }

      if (maskedValue.length < 3) return maskedValue;

      // Next 6 digits
      let numberCount = 0;
      while (valueIndex < cleanValue.length && numberCount < 6 && /[0-9]/.test(cleanValue[valueIndex]!)) {
        maskedValue += cleanValue[valueIndex];
        valueIndex++;
        numberCount++;
      }

      if (numberCount < 6) return maskedValue;

      // Next 1 letter
      if (valueIndex < cleanValue.length && /[A-Z]/.test(cleanValue[valueIndex]!)) {
        maskedValue += cleanValue[valueIndex];
        valueIndex++;
      } else {
        return maskedValue;
      }

      // Last 2 alphanumeric characters
      let alphaNumCount = 0;
      while (valueIndex < cleanValue.length && alphaNumCount < 2 && /[A-Z0-9]/.test(cleanValue[valueIndex]!)) {
        maskedValue += cleanValue[valueIndex];
        valueIndex++;
        alphaNumCount++;
      }

      return maskedValue;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const masked = applyMask(inputValue, mask);
      setDisplayValue(masked);
      const cleanValue = masked.replace(/[^a-zA-Z0-9]/g, '');
      onChange(cleanValue);
    };

    React.useEffect(() => {
      if (value !== displayValue.replace(/[^a-zA-Z0-9]/g, '')) {
        const masked = applyMask(value, mask);
        setDisplayValue(masked);
      }
    }, [value, mask]);

    return (
      <input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
      />
    );
  },
);

MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };
export type { MaskedInputProps };
