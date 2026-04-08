/**
 * TransactionCatalogTable — Tabla del catálogo de transacciones FX.
 *
 * Tres secciones agrupadas por estado:
 * - "No Autorizadas" (pending) — siempre expandida
 * - "Autorizadas sin Comprobante" (authorized) — siempre expandida
 * - "Historial" (completed) — colapsable
 *
 * Columnas: Razón Social, RFC, Buys (USD), Tipo de Cambio, Pays (MXN),
 *           Fecha, Orden de Pago (PDF), Autorizada, Autorizó, Comprobante.
 * Columna Broker visible solo para admin.
 *
 * Integra AuthorizeButton en filas pendientes (admin only),
 * ProofUpload en filas autorizadas, y PaymentOrderPDF callback en cada fila.
 *
 * Requerimientos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useState, useMemo } from 'react';
import type { FXTransactionSummary } from '../types/transaction.types';
import { groupTransactionsByStatus } from '../services/transactionService';
import { formatCurrency } from '../utils/formatters';
import { AuthorizeButton } from './AuthorizeButton';
import { ProofUpload } from './ProofUpload';

export interface TransactionCatalogTableProps {
  transactions: FXTransactionSummary[];
  isAdmin: boolean;
  onGeneratePDF?: (transactionId: string) => void;
  onUploadComplete?: () => void;
  onEdit?: (transactionId: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function TransactionCatalogTable({
  transactions,
  isAdmin,
  onGeneratePDF,
  onUploadComplete,
  onEdit,
}: TransactionCatalogTableProps) {
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const HISTORIAL_PAGE_SIZE = 50;

  // Filter transactions by folio, RFC, razón social, broker
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) =>
      (tx.folio?.toLowerCase().includes(q)) ||
      (tx.company_rfc?.toLowerCase().includes(q)) ||
      (tx.company_legal_name?.toLowerCase().includes(q)) ||
      (tx.broker_name?.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  const groups = groupTransactionsByStatus(filtered);

  const colCount = isAdmin ? 13 : 11;

  function renderHeader() {
    return (
      <thead>
        <tr className="bg-muted/50 text-left text-muted-foreground">
          <th className="px-4 py-3 font-medium">Folio</th>
          <th className="px-4 py-3 font-medium">Razón Social</th>
          <th className="px-4 py-3 font-medium">RFC</th>
          {isAdmin && <th className="px-4 py-3 font-medium">Broker</th>}
          <th className="px-4 py-3 font-medium text-right">Buys (USD)</th>
          <th className="px-4 py-3 font-medium text-right">Tipo de Cambio</th>
          <th className="px-4 py-3 font-medium text-right">Pays (MXN)</th>
          <th className="px-4 py-3 font-medium">Fecha</th>
          <th className="px-4 py-3 font-medium text-center">Orden de Pago</th>
          <th className="px-4 py-3 font-medium">Autorizada</th>
          <th className="px-4 py-3 font-medium">Autorizó</th>
          <th className="px-4 py-3 font-medium text-center">Comprobante</th>
          {isAdmin && <th className="px-4 py-3 font-medium text-center">Acciones</th>}
        </tr>
      </thead>
    );
  }

  function renderRow(tx: FXTransactionSummary) {
    return (
      <tr
        key={tx.id}
        className="bg-card text-foreground hover:bg-muted/20 transition-colors"
      >
        <td className="px-4 py-3 font-mono text-xs text-primary">{tx.folio}</td>
        <td className="px-4 py-3">{tx.company_legal_name}</td>
        <td className="px-4 py-3 font-mono text-xs">{tx.company_rfc}</td>
        {isAdmin && <td className="px-4 py-3">{tx.broker_name ?? '—'}</td>}
        <td className="px-4 py-3 text-right tabular-nums">
          {formatCurrency(tx.buys_usd, 'USD')}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {tx.exchange_rate.toFixed(4)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {formatCurrency(tx.pays_mxn, 'MXN')}
        </td>
        <td className="px-4 py-3">{formatDate(tx.created_at)}</td>
        <td className="px-4 py-3 text-center">
          {tx.folio ? (
            <button
              type="button"
              onClick={() => onGeneratePDF?.(tx.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              PDF
            </button>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3">{formatDate(tx.authorized_at)}</td>
        <td className="px-4 py-3">{tx.authorized_by_name ?? '—'}</td>
        <td className="px-4 py-3 text-center">
          {tx.status === 'pending' && isAdmin ? (
            <AuthorizeButton
              transactionId={tx.id}
              isAdmin={isAdmin}
              onAuthorized={() => onUploadComplete?.()}
            />
          ) : tx.status === 'authorized' ? (
            <ProofUpload
              transactionId={tx.id}
              isAuthorized
              existingProofUrl={tx.proof_url}
              onUploadComplete={() => onUploadComplete?.()}
            />
          ) : tx.status === 'completed' && tx.proof_url ? (
            <a
              href={tx.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors"
            >
              Ver comprobante
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
        {isAdmin && (
          <td className="px-4 py-3 text-center">
            <button
              type="button"
              onClick={() => onEdit?.(tx.id)}
              className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors"
            >
              Editar
            </button>
          </td>
        )}
      </tr>
    );
  }

  function renderSectionHeader(
    title: string,
    count: number,
    collapsible: boolean,
    isOpen?: boolean,
    onToggle?: () => void,
  ) {
    return (
      <tr className="bg-muted/30">
        <td colSpan={colCount} className="px-4 py-2">
          {collapsible ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
            >
              <svg
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {title}
              <span className="text-xs font-normal text-muted-foreground">({count})</span>
            </button>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {title}
              <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
            </span>
          )}
        </td>
      </tr>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay transacciones registradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search filter */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setHistorialPage(0); }}
          placeholder="Buscar por Folio, RFC, Razón Social o Broker..."
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 && searchQuery ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No se encontraron transacciones para "{searchQuery}"
        </div>
      ) : (
      <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        {renderHeader()}
        <tbody className="divide-y divide-border">
          {/* No Autorizadas — always expanded */}
          {renderSectionHeader('No Autorizadas', groups.noAutorizadas.length, false)}
          {groups.noAutorizadas.length > 0
            ? groups.noAutorizadas.map(renderRow)
            : (
                <tr>
                  <td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">
                    Sin transacciones pendientes
                  </td>
                </tr>
              )}

          {/* Autorizadas sin Comprobante — always expanded */}
          {renderSectionHeader('Autorizadas sin Comprobante', groups.autorizadasSinComprobante.length, false)}
          {groups.autorizadasSinComprobante.length > 0
            ? groups.autorizadasSinComprobante.map(renderRow)
            : (
                <tr>
                  <td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">
                    Sin transacciones autorizadas pendientes de comprobante
                  </td>
                </tr>
              )}

          {/* Historial — collapsible + paginated */}
          {renderSectionHeader(
            'Historial',
            groups.historial.length,
            true,
            historialOpen,
            () => setHistorialOpen((prev) => !prev),
          )}
          {historialOpen && (
            groups.historial.length > 0
              ? (
                  <>
                    {groups.historial
                      .slice(historialPage * HISTORIAL_PAGE_SIZE, (historialPage + 1) * HISTORIAL_PAGE_SIZE)
                      .map(renderRow)}
                    {groups.historial.length > HISTORIAL_PAGE_SIZE && (
                      <tr>
                        <td colSpan={colCount} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {historialPage * HISTORIAL_PAGE_SIZE + 1}–{Math.min((historialPage + 1) * HISTORIAL_PAGE_SIZE, groups.historial.length)} de {groups.historial.length}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={historialPage === 0}
                                onClick={() => setHistorialPage((p) => p - 1)}
                                className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                ← Anterior
                              </button>
                              <button
                                type="button"
                                disabled={(historialPage + 1) * HISTORIAL_PAGE_SIZE >= groups.historial.length}
                                onClick={() => setHistorialPage((p) => p + 1)}
                                className="px-3 py-1 text-xs rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Siguiente →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              : (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-4 text-center text-muted-foreground text-xs">
                      Sin transacciones completadas
                    </td>
                  </tr>
                )
          )}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}
