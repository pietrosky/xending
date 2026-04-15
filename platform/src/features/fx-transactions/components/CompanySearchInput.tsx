/**
 * CompanySearchInput — Buscador de empresas con autocompletado.
 *
 * Input de texto que busca por razón social o RFC con sugerencias en tiempo real.
 * Excluye empresas deshabilitadas (filtrado por el servicio).
 * Al seleccionar, emite onSelect(company) con datos completos.
 *
 * Requerimientos: 5.1, 5.2, 5.3
 */

import { useState, useRef, useEffect } from 'react';
import { useSearchCompanies } from '../hooks/useCompaniesFX';
import type { CompanyFX } from '../types/company-fx.types';

export interface CompanySearchInputProps {
  onSelect: (company: CompanyFX) => void;
  disabled?: boolean;
}

export function CompanySearchInput({ onSelect, disabled = false }: CompanySearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyFX | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = useSearchCompanies(query);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setIsOpen(value.length >= 2);
    if (selectedCompany) {
      setSelectedCompany(null);
    }
  }

  function handleSelect(company: CompanyFX) {
    setSelectedCompany(company);
    setQuery(company.legal_name);
    setIsOpen(false);
    onSelect(company);
  }

  const showDropdown = isOpen && query.length >= 2;

  const inputBase =
    'w-full px-3 py-2 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2';
  const inputCls = `${inputBase} border-border focus:ring-primary/40`;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="company-search" className="block text-sm font-medium text-foreground mb-1">
        Buscar Empresa
      </label>

      <div className="relative">
        <input
          id="company-search"
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (query.length >= 2 && !selectedCompany) setIsOpen(true); }}
          disabled={disabled}
          className={`${inputCls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder="Buscar por razón social o RFC..."
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="company-search-listbox"
          aria-autocomplete="list"
        />

        {isLoading && query.length >= 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && (
        <ul
          id="company-search-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {results.length === 0 && !isLoading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No se encontraron empresas
            </li>
          )}

          {results.map((company) => (
            <li
              key={company.id}
              role="option"
              aria-selected={false}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
              onMouseDown={() => handleSelect(company)}
            >
              <span className="font-medium text-foreground">{company.legal_name}</span>
              <span className="ml-2 text-muted-foreground">{company.rfc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
