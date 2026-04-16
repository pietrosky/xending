/**
 * TransactionCatalogTable — Tabla del catálogo de transacciones FX.
 *
 * Per-column filters + sort buttons. Three sections by status.
 * Historial is collapsible + paginated (50 per page).
 */

import { useState, useMemo } from 'react';
import type { FXTransactionSummary } from '../types/transaction.types';
import { groupTransactionsByStatus } from '../services/transactionService';
import { formatCurrency } from '../utils/formatters';
import { computePays } from '../utils/fxConversion';
import { AuthorizeButton } from './AuthorizeButton';
import { ProofUpload } from './ProofUpload';

export interface TransactionCatalogTableProps {
  transactions: FXTransactionSummary[];
  isAdmin: boolean;
  onGeneratePDF?: (transactionId: string) => void;
  onUploadComplete?: () => void;
  onEdit?: (transactionId: string) => void;
  onCancel?: (transactionId: string) => void;
  onRevertCancel?: (transactionId: string) => void;
}

type SortKey = 'folio' | 'company_legal_name' | 'company_rfc' | 'broker_name' | 'quantity' | 'base_rate' | 'markup_rate' | 'created_at';
type SortDir = 'asc' | 'desc';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SortButton({ active, dir, onToggle }: { active: boolean; dir: SortDir; onToggle: (d: SortDir) => void }) {
  return (
    <span className="inline-flex flex-col ml-1 -space-y-0.5">
      <button type="button" onClick={() => onToggle('asc')}
        className={`text-[10px] leading-none ${active && dir === 'asc' ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
        aria-label="Orden ascendente">▲</button>
      <button type="button" onClick={() => onToggle('desc')}
        className={`text-[10px] leading-none ${active && dir === 'desc' ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
        aria-label="Orden descendente">▼</button>
    </span>
  );
}

const HISTORIAL_PAGE_SIZE = 50;
const filterCls = 'w-full px-2 py-1 mt-1 rounded border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40';

export function TransactionCatalogTable({
  transactions, isAdmin, onGeneratePDF, onUploadComplete, onEdit, onCancel, onRevertCancel,
}: TransactionCatalogTableProps) {
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setHistorialPage(0);
  }

  function handleSort(key: SortKey, dir: SortDir) {
    if (sortKey === key && sortDir === dir) { setSortKey(null); }
    else { setSortKey(key); setSortDir(dir); }
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...transactions];
    const q = (k: string) => (filters[k] ?? '').trim().toLowerCase();

    if (q('folio')) result = result.filter((t) => t.folio?.toLowerCase().includes(q('folio')));
    if (q('company_legal_name')) result = result.filter((t) => t.company_legal_name?.toLowerCase().includes(q('company_legal_name')));
    if (q('company_rfc')) result = result.filter((t) => t.company_rfc?.toLowerCase().includes(q('company_rfc')));
    if (q('broker_name')) result = result.filter((t) => (t.broker_name ?? '').toLowerCase().includes(q('broker_name')));

    if (sortKey) {
      result.sort((a, b) => {
        const va = (a as unknown as Record<string, unknown>)[sortKey];
        const vb = (b as unknown as Record<string, unknown>)[sortKey];
        if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
        const cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'es', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [transactions, filters, sortKey, sortDir]);

  const groups = groupTransactionsByStatus(filtered);
  const colCount = isAdmin ? 16 : 14;

  // ─── Header with sort + filter row ─────────────────────────────

  function renderHeader() {
    const th = (label: string, key: SortKey, extra = '') => (
      <th className={`px-4 py-2 font-medium ${extra}`}>
        {label}
        <SortButton active={sortKey === key} dir={sortDir} onToggle={(d) => handleSort(key, d)} />
      </th>
    );
    const textCols: Array<{ key: string; hasFilter: boolean }> = [
      { key: 'folio', hasFilter: true },
      { key: 'company_legal_name', hasFilter: true },
      { key: 'company_rfc', hasFilter: true },
    ];
    if (isAdmin) textCols.push({ key: 'broker_name', hasFilter: true });

    return (
      <thead>
        <tr className="bg-muted/50 text-left text-muted-foreground">
          {th('Folio', 'folio')}
          {th('Razón Social', 'company_legal_name')}
          {th('RFC', 'company_rfc')}
          {isAdmin && th('Broker', 'broker_name')}
          {th('Buys', 'quantity', 'text-right')}
          {th('TC Base', 'base_rate', 'text-right')}
          {th('TC Markup', 'markup_rate', 'text-right')}
          {th('Pays', 'markup_rate', 'text-right')}
          <th className="px-4 py-2 font-medium text-right">Utilidad</th>
          {th('Fecha', 'created_at')}
          <th className="px-4 py-2 font-medium text-center">Orden de Pago</th>
          <th className="px-4 py-2 font-medium">Autorizada</th>
          <th className="px-4 py-2 font-medium">Autorizó</th>
          <th className="px-4 py-2 font-medium text-center">Comprobante</th>
          {isAdmin && <th className="px-4 py-2 font-medium text-center">Acciones</th>}
        </tr>
        <tr className="bg-muted/20">
          {textCols.map((col) => (
            <th key={col.key} className="px-4 py-1">
              <input type="text" placeholder="Filtrar..." value={filters[col.key] ?? ''}
                onChange={(e) => updateFilter(col.key, e.target.value)} className={filterCls} />
            </th>
          ))}
          {/* Empty cells for non-filterable columns */}
          <th className="px-4 py-1" />{/* buys */}
          <th className="px-4 py-1" />{/* base rate */}
          <th className="px-4 py-1" />{/* markup rate */}
          <th className="px-4 py-1" />{/* pays */}
          <th className="px-4 py-1" />{/* utilidad */}
          <th className="px-4 py-1" />{/* fecha */}
          <th className="px-4 py-1" />{/* orden */}
          <th className="px-4 py-1" />{/* autorizada */}
          <th className="px-4 py-1" />{/* autorizó */}
          <th className="px-4 py-1" />{/* comprobante */}
          {isAdmin && <th className="px-4 py-1" />}{/* acciones */}
        </tr>
      </thead>
    );
  }

  // ─── Row renderer ──────────────────────────────────────────────

  function renderRow(tx: FXTransactionSummary) {
    const isCancelled = tx.cancelled;
    const canCancel = !isCancelled && (
      (isAdmin) ||
      (!isAdmin && tx.status === 'pending')
    );

    return (
      <tr key={tx.id} className={isCancelled
        ? 'bg-red-50/50 text-muted-foreground line-through decoration-red-400/60'
        : 'bg-card text-foreground hover:bg-muted/20 transition-colors'}>
        <td className="px-4 py-3 font-mono text-xs">
          <span className={isCancelled ? 'text-muted-foreground' : 'text-primary'}>{tx.folio}</span>
          {isCancelled && (
            <span className="ml-2 no-underline inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
              Cancelada
            </span>
          )}
        </td>
        <td className="px-4 py-3">{tx.company_legal_name}</td>
        <td className="px-4 py-3 font-mono text-xs">{tx.company_rfc}</td>
        {isAdmin && <td className="px-4 py-3">{tx.broker_name ?? '—'}</td>}
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(tx.quantity, tx.buys_currency ?? 'USD')}</td>
        <td className="px-4 py-3 text-right tabular-nums">
          {tx.base_rate != null ? (tx.buys_currency === 'MXN' ? 1 / tx.base_rate : tx.base_rate).toFixed(4) : '—'}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {tx.markup_rate != null ? (tx.buys_currency === 'MXN' ? 1 / tx.markup_rate : tx.markup_rate).toFixed(4) : '—'}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(computePays(tx.quantity, tx.markup_rate), tx.pays_currency ?? 'MXN')}</td>
        <td className="px-4 py-3 text-right tabular-nums">
          {(() => {
            if (tx.base_rate == null || tx.markup_rate == null) return '—';
            const isSell = tx.buys_currency === 'MXN';
            let utilidad: number;
            if (isSell) {
              // Venta: rates almacenados como USD/MXN → invertir a MXN/USD
              const baseInv = 1 / tx.base_rate;
              const markupInv = 1 / tx.markup_rate;
              // pays_mxn contiene el monto en USD en operaciones de venta
              utilidad = (markupInv - baseInv) * computePays(tx.quantity, tx.markup_rate);
            } else {
              // Compra: rates ya en MXN/USD, quantity es el monto USD
              const diff = tx.markup_rate - tx.base_rate;
              utilidad = diff * tx.quantity;
            }
            return (
              <span className={utilidad > 0 ? 'text-green-700' : utilidad < 0 ? 'text-red-700' : ''}>
                {formatCurrency(Math.abs(utilidad), 'MXN')}
                {utilidad < 0 ? ' (-)' : ''}
              </span>
            );
          })()}
        </td>
        <td className="px-4 py-3">{formatDate(tx.created_at)}</td>
        <td className="px-4 py-3 text-center">
          {!isCancelled && tx.folio ? (
            <button type="button" onClick={() => onGeneratePDF?.(tx.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              PDF
            </button>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>
        <td className="px-4 py-3">{formatDate(tx.authorized_at)}</td>
        <td className="px-4 py-3">{tx.authorized_by_name ?? '—'}</td>
        <td className="px-4 py-3 text-center">
          {isCancelled ? (
            <span className="text-muted-foreground text-xs no-underline">—</span>
          ) : tx.status === 'pending' && isAdmin ? (
            <AuthorizeButton transactionId={tx.id} isAdmin={isAdmin} onAuthorized={() => onUploadComplete?.()} />
          ) : tx.status === 'authorized' ? (
            <ProofUpload transactionId={tx.id} isAuthorized existingProofUrl={tx.proof_url} onUploadComplete={() => onUploadComplete?.()} />
          ) : tx.status === 'completed' && tx.proof_url ? (
            <a href={tx.proof_url} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors no-underline">
              Ver comprobante
            </a>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>
        {isAdmin && (
          <td className="px-4 py-3 text-center no-underline">
            <div className="flex items-center justify-center gap-2">
              {!isCancelled && (
                <button type="button" onClick={() => onEdit?.(tx.id)}
                  className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors">
                  Editar
                </button>
              )}
              {canCancel && (
                <button type="button" onClick={() => onCancel?.(tx.id)}
                  className="text-red-600 hover:text-red-800 text-xs font-medium underline underline-offset-2 transition-colors">
                  Cancelar
                </button>
              )}
              {isCancelled && (
                <button type="button" onClick={() => onRevertCancel?.(tx.id)}
                  className="text-green-600 hover:text-green-800 text-xs font-medium underline underline-offset-2 transition-colors">
                  Revertir
                </button>
              )}
            </div>
          </td>
        )}
        {/* Broker cancel button (non-admin, only in actions-less layout — add cancel in comprobante col) */}
        {!isAdmin && canCancel && (
          <td className="px-4 py-3 text-center no-underline">
            <button type="button" onClick={() => onCancel?.(tx.id)}
              className="text-red-600 hover:text-red-800 text-xs font-medium underline underline-offset-2 transition-colors">
              Cancelar
            </button>
          </td>
        )}
      </tr>
    );
  }

  // ─── Section header ────────────────────────────────────────────

  function renderSectionHeader(title: string, count: number, collapsible: boolean, isOpen?: boolean, onToggle?: () => void) {
    return (
      <tr className="bg-muted/30">
        <td colSpan={colCount} className="px-4 py-2">
          {collapsible ? (
            <button type="button" onClick={onToggle}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left">
              <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {title} <span className="text-xs font-normal text-muted-foreground">({count})</span>
            </button>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {title} <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
            </span>
          )}
        </td>
      </tr>
    );
  }

  // ─── Render ────────────────────────────────────────────────────

  if (transactions.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No hay transacciones registradas.</div>;
  }

  const noResults = filtered.length === 0 && Object.values(filters).some((v) => v.trim());

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        {renderHeader()}
        <tbody className="divide-y divide-border">
          {noResults ? (
            <tr><td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground text-xs">No se encontraron transacciones con los filtros aplicados.</td></tr>
          ) : (
            <>
              {renderSectionHeader('No Autorizadas', groups.noAutorizadas.length, false)}
              {groups.noAutorizadas.length > 0 ? groups.noAutorizadas.map(renderRow) : (
                <tr><td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">Sin transacciones pendientes</td></tr>
              )}

              {renderSectionHeader('Autorizadas sin Comprobante', groups.autorizadasSinComprobante.length, false)}
              {groups.autorizadasSinComprobante.length > 0 ? groups.autorizadasSinComprobante.map(renderRow) : (
                <tr><td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">Sin transacciones autorizadas pendientes de comprobante</td></tr>
              )}

              {renderSectionHeader('Historial', groups.historial.length, true, historialOpen, () => setHistorialOpen((p) => !p))}
              {historialOpen && (
                groups.historial.length > 0 ? (
                  <>
                    {groups.historial.slice(historialPage * HISTORIAL_PAGE_SIZE, (historialPage + 1) * HISTORIAL_PAGE_SIZE).map(renderRow)}
                    {groups.historial.length > HISTORIAL_PAGE_SIZE && (
                      <tr><td colSpan={colCount} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {historialPage * HISTORIAL_PAGE_SIZE + 1}–{Math.min((historialPage + 1) * HISTORIAL_PAGE_SIZE, groups.historial.length)} de {groups.historial.length}
                          </span>
                          <div className="flex gap-2">
                            <button type="button" disabled={historialPage === 0} onClick={() => setHistorialPage((p) => p - 1)}
                              className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Anterior</button>
                            <button type="button" disabled={(historialPage + 1) * HISTORIAL_PAGE_SIZE >= groups.historial.length} onClick={() => setHistorialPage((p) => p + 1)}
                              className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Siguiente →</button>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </>
                ) : (
                  <tr><td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">Sin transacciones completadas</td></tr>
                )
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
