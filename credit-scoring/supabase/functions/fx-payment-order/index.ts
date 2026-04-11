/**
 * fx-payment-order — Deno Edge Function
 *
 * Generates a PDF payment order server-side using pdf-lib.
 * POST { transaction_id: string } → application/pdf binary
 */

import { buildPaymentOrderPDF } from './pdfBuilder.ts';
import type { PdfDealData } from './pdfBuilder.ts';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PG_URL = Deno.env.get('SUPABASE_URL') || 'http://rest:3000';
const SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PG_HEADERS = { 'Authorization': `Bearer ${SVC_KEY}`, 'Accept': 'application/vnd.pgrst.object+json' };

function errJson(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

function fmtDate(s: string) { return new Date(s).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }); }
function fmtNum(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtClabe(c: string) { const d = c.replace(/\D/g, '').slice(0, 18); return d.length < 18 ? d : `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,17)}-${d.slice(17)}`; }
function fmtAddr(a: Record<string, string> | null) {
  if (!a) return '';
  return [a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join('\n');
}

// deno-lint-ignore no-explicit-any
async function pg(table: string, filter: string): Promise<any> {
  const r = await fetch(`${PG_URL}/${table}?${filter}&limit=1`, { headers: PG_HEADERS });
  if (!r.ok) throw new Error(`PG ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function loadData(txId: string) {
  const tx = await pg('fx_transactions', `id=eq.${txId}`);
  if (!tx?.id) throw new Error('Transaction not found');
  const co = await pg('cs_companies', `id=eq.${tx.company_id}`);
  if (!co?.id) throw new Error('Company not found');
  let pi = null;
  if (tx.pi_account_id) { try { pi = await pg('pi_accounts', `id=eq.${tx.pi_account_id}`); } catch { /* ok */ } }
  let pa = null;
  if (tx.payment_account_id) { try { pa = await pg('cs_company_payment_accounts', `id=eq.${tx.payment_account_id}`); } catch { /* ok */ } }
  return { tx, co, pi, pa };
}

// deno-lint-ignore no-explicit-any
function toDeal(tx: any, co: any, pi: any, pa: any): PdfDealData {
  const isSell = tx.buys_currency === 'MXN';
  const rate = Number(tx.exchange_rate) || 0;
  const dRate = isSell && rate > 0 ? 1 / rate : rate;
  return {
    dealNumber: tx.folio ?? '', clientName: co.legal_name ?? '',
    clientAddress: fmtAddr(co.address), tradeDate: fmtDate(tx.created_at ?? ''),
    dealType: 'Spot', buyCurrency: tx.buys_currency ?? 'USD',
    buyAmount: fmtNum(Number(tx.buys_usd) || 0), exchangeRate: dRate.toFixed(4),
    payCurrency: tx.pays_currency ?? 'MXN',
    payAmount: fmtNum(Number(tx.pays_mxn) || 0), totalDue: fmtNum(Number(tx.pays_mxn) || 0),
    accountNumber1: pi?.account_number ?? '', accountName1: pi?.account_name ?? '',
    accountAddress1: pi?.bank_address ?? '', swift1: pi?.swift_code ?? '',
    bankName1: pi?.bank_name ?? '', bankAddress1: pi?.bank_address ?? '',
    byOrderOf1: co.legal_name ?? '',
    beneficiaryAccountNumber: pa?.clabe ? fmtClabe(pa.clabe) : '',
    beneficiaryAccountName: co.legal_name ?? '',
    beneficiaryBankName: pa?.bank_name ?? '', beneficiaryBankAddress: '',
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return errJson('Method not allowed', 405);
  try {
    const { transaction_id } = await req.json();
    if (!transaction_id) return errJson('Missing transaction_id', 400);
    const { tx, co, pi, pa } = await loadData(transaction_id);
    const deal = toDeal(tx, co, pi, pa);
    const pdf = await buildPaymentOrderPDF(deal);
    return new Response(pdf, { status: 200, headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${deal.dealNumber || 'order'}.pdf"`,
      ...CORS,
    }});
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[fx-payment-order]', msg);
    return errJson(msg, 500);
  }
});
