/**
 * CompanyCatalogTable — Tabla del catálogo de empresas FX.
 *
 * Columnas con filtro de texto y botones de orden asc/desc.
 * Requerimientos: 4.1, 4.2, 4.3, 4.4
 */

import { useState, useMemo } from 'react';
import type { CompanyFX } from '../types/company-fx.types';
import { formatCurrency } from '../utils/formatters';

export interface CompanyCatalogTableProps {
  companies: CompanyFX[];
  isAdmin: boolean;
  onEdit: (companyId: string) => void;
  onToggleStatus: (companyId: string, disabled: boolean) => void;
}

type SortKey = 'legal_name' | 'rfc' | 'owner_name' | 'total_quantity' | 'last_transaction_at';
type SortDir = 'asc' | 'desc';

// ─── Sort icon ───────────────────────────────────────────────────────

function SortButton({ active, dir, onToggle }: { active: boolean; dir: SortDir; onToggle: (d: SortDir) => void }) {
  return (
    <span className="inline-flex flex-col ml-1 -space-y-0.5">
      <button
        type="button"
        onClick={() => onToggle('asc')}
        className={`text-[10px] leading-none ${active && dir === 'asc' ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
        aria-label="Orden ascendente"
      >▲</button>
      <button
        type="button"
        onClick={() => onToggle('desc')}
        className={`text-[10px] leading-none ${active && dir === 'desc' ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
        aria-label="Orden descendente"
      >▼</button>
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function CompanyCatalogTable({
  companies,
  isAdmin,
  onEdit,
  onToggleStatus,
}: CompanyCatalogTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSort(key: SortKey, dir: SortDir) {
    if (sortKey === key && sortDir === dir) {
      setSortKey(null); // toggle off
    } else {
      setSortKey(key);
      setSortDir(dir);
    }
  }

  // Filter + sort
  const processed = useMemo(() => {
    let result = [...companies];

    // Apply text filters
    const q = (key: string) => (filters[key] ?? '').trim().toLowerCase();
    if (q('legal_name')) result = result.filter((c) => c.legal_name?.toLowerCase().includes(q('legal_name')));
    if (q('rfc')) result = result.filter((c) => c.rfc?.toLowerCase().includes(q('rfc')));
    if (q('owner_name')) result = result.filter((c) => (c.owner_name ?? '').toLowerCase().includes(q('owner_name')));

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        switch (sortKey) {
          case 'legal_name': va = a.legal_name ?? ''; vb = b.legal_name ?? ''; break;
          case 'rfc': va = a.rfc ?? ''; vb = b.rfc ?? ''; break;
          case 'owner_name': va = a.owner_name ?? ''; vb = b.owner_name ?? ''; break;
          case 'total_quantity': va = a.total_quantity ?? 0; vb = b.total_quantity ?? 0; break;
          case 'last_transaction_at': va = a.last_transaction_at ?? ''; vb = b.last_transaction_at ?? ''; break;
        }
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        const cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [companies, filters, sortKey, sortDir]);

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay empresas registradas.
      </div>
    );
  }

  const filterInput = 'w-full px-2 py-1 mt-1 rounded border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40';

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          {/* Column headers with sort */}
          <tr className="bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">
              Razón Social
              <SortButton active={sortKey === 'legal_name'} dir={sortDir} onToggle={(d) => handleSort('legal_name', d)} />
            </th>
            <th className="px-4 py-2 font-medium">
              RFC
              <SortButton active={sortKey === 'rfc'} dir={sortDir} onToggle={(d) => handleSort('rfc', d)} />
            </th>
            {isAdmin && (
              <th className="px-4 py-2 font-medium">
                Broker
                <SortButton active={sortKey === 'owner_name'} dir={sortDir} onToggle={(d) => handleSort('owner_name', d)} />
              </th>
            )}
            <th className="px-4 py-2 font-medium text-right">
              Total Transacciones (USD)
              <SortButton active={sortKey === 'total_quantity'} dir={sortDir} onToggle={(d) => handleSort('total_quantity', d)} />
            </th>
            <th className="px-4 py-2 font-medium">
              Última Transacción
              <SortButton active={sortKey === 'last_transaction_at'} dir={sortDir} onToggle={(d) => handleSort('last_transaction_at', d)} />
            </th>
            <th className="px-4 py-2 font-medium text-center">Acciones</th>
            {isAdmin && <th className="px-4 py-2 font-medium text-center">Deshabilitar</th>}
          </tr>
          {/* Filter row */}
          <tr className="bg-muted/20">
            <th className="px-4 py-1">
              <input type="text" placeholder="Filtrar..." value={filters.legal_name ?? ''} onChange={(e) => updateFilter('legal_name', e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-1">
              <input type="text" placeholder="Filtrar..." value={filters.rfc ?? ''} onChange={(e) => updateFilter('rfc', e.target.value)} className={filterInput} />
            </th>
            {isAdmin && (
              <th className="px-4 py-1">
                <input type="text" placeholder="Filtrar..." value={filters.owner_name ?? ''} onChange={(e) => updateFilter('owner_name', e.target.value)} className={filterInput} />
              </th>
            )}
            <th className="px-4 py-1" />
            <th className="px-4 py-1" />
            <th className="px-4 py-1" />
            {isAdmin && <th className="px-4 py-1" />}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {processed.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 7 : 5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                No se encontraron empresas con los filtros aplicados.
              </td>
            </tr>
          ) : (
            processed.map((company) => {
              const isDisabled = company.status !== 'active';
              return (
                <tr
                  key={company.id}
                  className={isDisabled ? 'bg-muted/30 text-muted-foreground' : 'bg-card text-foreground hover:bg-muted/20 transition-colors'}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={isDisabled ? 'line-through' : ''}>{company.legal_name}</span>
                      {isDisabled && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Deshabilitada</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{company.rfc}</td>
                  {isAdmin && <td className="px-4 py-3">{company.owner_name ?? '—'}</td>}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {company.total_quantity != null ? formatCurrency(company.total_quantity, 'USD') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {company.last_transaction_at
                      ? new Date(company.last_transaction_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => onEdit(company.id)} className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors">
                      Editar
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDisabled}
                          onChange={() => onToggleStatus(company.id, !isDisabled)}
                          className="sr-only peer"
                          aria-label={isDisabled ? `Habilitar ${company.legal_name}` : `Deshabilitar ${company.legal_name}`}
                        />
                        <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
