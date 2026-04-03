/**
 * Lista de empresas registradas — M01 Onboarding Lite.
 */

import { useState } from 'react';
import type React from 'react';
import { Building2, Search, Mail, Phone, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CompanySummary } from '../types/company.types';
import { BUSINESS_ACTIVITIES } from '../types/company.types';

interface CompanyListProps {
  companies: CompanySummary[];
  isLoading: boolean;
  onNewCompany: () => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-status-success-bg text-status-success' },
  inactive: { label: 'Inactivo', className: 'bg-muted text-muted-foreground' },
  blacklisted: { label: 'Bloqueado', className: 'bg-status-error-bg text-status-error' },
};

function getActivityLabel(value: string | null): string {
  if (!value) return '—';
  return BUSINESS_ACTIVITIES.find((a) => a.value === value)?.label ?? value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CompanyList({ companies, isLoading, onNewCompany }: CompanyListProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? companies.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.rfc.toLowerCase().includes(q) ||
          c.legal_name.toLowerCase().includes(q) ||
          (c.trade_name?.toLowerCase().includes(q) ?? false) ||
          (c.primary_email?.toLowerCase().includes(q) ?? false)
        );
      })
    : companies;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Cargando empresas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + search + new button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Buscar por RFC, nombre o email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Buscar empresas"
          />
        </div>
        <button
          type="button"
          onClick={onNewCompany}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          <Plus size={16} />
          Nueva empresa
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center space-y-3">
          <Building2 size={40} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search.trim()
              ? 'No se encontraron empresas con esa búsqueda'
              : 'No hay empresas registradas aún'}
          </p>
          {!search.trim() && (
            <button
              type="button"
              onClick={onNewCompany}
              className="text-sm font-medium underline underline-offset-2"
              style={{ color: 'hsl(213, 67%, 25%)' }}
            >
              Registrar primera empresa
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">RFC</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Giro
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden lg:table-cell">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden sm:table-cell">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.active;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{c.legal_name}</div>
                        {c.trade_name && (
                          <div className="text-xs text-muted-foreground">{c.trade_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {c.rfc}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {getActivityLabel(c.business_activity)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {c.primary_email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail size={12} />
                              {c.primary_email}
                            </div>
                          )}
                          {c.primary_phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone size={12} />
                              {c.primary_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                            st?.className,
                          )}
                        >
                          {st?.label ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {filtered.length} empresa{filtered.length !== 1 ? 's' : ''}
            {search.trim() ? ` (de ${companies.length} total)` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
