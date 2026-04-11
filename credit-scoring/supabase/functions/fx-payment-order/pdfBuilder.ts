/**
 * pdfBuilder.ts — Generates Xending FX payment order PDF using pdf-lib (Deno).
 *
 * Reproduces the Xending HTML template layout programmatically.
 * No browser/DOM required — pure PDF binary generation.
 */

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

// ─── Types ───────────────────────────────────────────────────────────

export interface PdfDealData {
  dealNumber: string;
  clientName: string;
  clientAddress: string;
  tradeDate: string;
  dealType: string;
  buyCurrency: string;
  buyAmount: string;
  exchangeRate: string;
  payCurrency: string;
  payAmount: string;
  totalDue: string;
  accountNumber1: string;
  accountName1: string;
  accountAddress1: string;
  swift1: string;
  bankName1: string;
  bankAddress1: string;
  byOrderOf1: string;
  beneficiaryAccountNumber: string;
  beneficiaryAccountName: string;
  beneficiaryBankName: string;
  beneficiaryBankAddress: string;
}

// ─── Colors ──────────────────────────────────────────────────────────

const TEAL = rgb(0, 0.83, 0.67);
const DARK_SLATE = rgb(0.2, 0.25, 0.33);
const DARK_BG = rgb(0.12, 0.16, 0.21);
const ORANGE = rgb(0.976, 0.451, 0.086);
const RED = rgb(0.863, 0.149, 0.149);
const WHITE = rgb(1, 1, 1);
const GRAY_TEXT = rgb(0.28, 0.33, 0.41);
const LIGHT_GRAY = rgb(0.97, 0.97, 0.98);
const MID_GRAY = rgb(0.58, 0.64, 0.72);
const TABLE_BORDER = rgb(0.91, 0.93, 0.95);
const TABLE_HEADER_BG = rgb(0.95, 0.96, 0.97);
const BENEFICIARY_BG = rgb(0.2, 0.29, 0.37);

// ─── Helpers ─────────────────────────────────────────────────────────

type Page = ReturnType<PDFDocument['addPage']>;
type Font = Awaited<ReturnType<PDFDocument['embedFont']>>;
type Color = ReturnType<typeof rgb>;

function drawBanner(page: Page, y: number, text: string, color: Color, font: Font, w: number, mL: number): number {
  const h = 22;
  page.drawRectangle({ x: mL, y: y - h, width: w, height: h, color });
  const tw = font.widthOfTextAtSize(text, 10);
  page.drawText(text, { x: mL + (w - tw) / 2, y: y - 15, size: 10, font, color: WHITE });
  return y - h - 8;
}

function drawLV(page: Page, x: number, y: number, label: string, value: string, fb: Font, fn: Font, lw = 90): number {
  page.drawText(label, { x, y, size: 9, font: fb, color: GRAY_TEXT });
  page.drawText(value || '—', { x: x + lw, y, size: 9, font: fn, color: DARK_BG });
  return y - 14;
}

function hLine(page: Page, x: number, y: number, w: number, c: Color = TABLE_BORDER, t = 1) {
  page.drawRectangle({ x, y, width: w, height: t, color: c });
}

// ─── Main builder ────────────────────────────────────────────────────

export async function buildPaymentOrderPDF(d: PdfDealData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const fn = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const mL = 40, mR = 40;
  const cW = width - mL - mR;
  let y = height - 40;

  // Header
  page.drawText('Xending Global', { x: mL, y, size: 16, font: fb, color: DARK_SLATE });
  const hLines = ['Xending Global Payments', 'Your trusted partner for international', 'foreign exchange transactions'];
  let hY = y;
  for (const l of hLines) { const tw = fn.widthOfTextAtSize(l, 8); page.drawText(l, { x: width - mR - tw, y: hY, size: 8, font: fn, color: MID_GRAY }); hY -= 11; }
  y -= 25;
  hLine(page, mL, y, cW, TEAL, 2);
  y -= 15;

  // Deal header
  page.drawText(`Deal No. ${d.dealNumber}`, { x: mL, y, size: 10, font: fb, color: DARK_BG });
  const ct = 'www.xendingglobal.com  |  T: +52 55.1234.5678  |  E: deals@xendingglobal.com';
  page.drawText(ct, { x: width - mR - fn.widthOfTextAtSize(ct, 7), y, size: 7, font: fn, color: MID_GRAY });
  y -= 10; hLine(page, mL, y, cW); y -= 15;

  // Confirmation banner
  y = drawBanner(page, y, 'XENDING GLOBAL - DEAL CONFIRMATION', TEAL, fb, cW, mL);

  // Client info box
  page.drawRectangle({ x: mL, y: y - 65, width: cW, height: 65, color: LIGHT_GRAY });
  page.drawRectangle({ x: mL, y: y - 65, width: 3, height: 65, color: TEAL });
  const iY = y - 14;
  let lY = drawLV(page, mL + 10, iY, 'Client:', d.clientName, fb, fn);
  for (const line of d.clientAddress.split('\n').filter(Boolean)) {
    page.drawText(line, { x: mL + 100, y: lY, size: 8, font: fn, color: MID_GRAY }); lY -= 11;
  }
  let rY = iY; const rX = mL + cW / 2 + 20;
  rY = drawLV(page, rX, rY, 'Trade Date:', d.tradeDate, fb, fn);
  drawLV(page, rX, rY, 'Deal Type:', d.dealType, fb, fn);
  y = iY - 70;

  // Transaction Details banner
  y = drawBanner(page, y, 'TRANSACTION DETAILS', DARK_SLATE, fb, cW, mL);

  // Transaction table
  const colW = cW / 3, rowH = 28;
  // Header row
  page.drawRectangle({ x: mL, y: y - rowH, width: cW, height: rowH, color: TABLE_HEADER_BG });
  hLine(page, mL, y - rowH, cW, TABLE_BORDER, 2);
  const shortName = d.clientName.substring(0, 25);
  const hdrs = [[shortName, 'Buys'], ['Exchange', 'Rate'], [shortName, 'Pays']];
  for (let i = 0; i < 3; i++) {
    const cx = mL + colW * i + colW / 2;
    for (let j = 0; j < 2; j++) {
      const tw = fb.widthOfTextAtSize(hdrs[i][j], 8);
      page.drawText(hdrs[i][j], { x: cx - tw / 2, y: y - 11 - j * 11, size: 8, font: fb, color: GRAY_TEXT });
    }
    if (i < 2) page.drawRectangle({ x: mL + colW * (i + 1), y: y - rowH, width: 1, height: rowH, color: TABLE_BORDER });
  }

  // Data row
  const dY = y - rowH;
  page.drawRectangle({ x: mL, y: dY - rowH, width: cW, height: rowH, color: WHITE });
  const vals = [`${d.buyCurrency} ${d.buyAmount}`, d.exchangeRate, `${d.payCurrency} ${d.payAmount}`];
  const fonts = [fn, fb, fn];
  const colors = [DARK_BG, RED, DARK_BG];
  for (let i = 0; i < 3; i++) {
    const tw = fonts[i].widthOfTextAtSize(vals[i], 9);
    page.drawText(vals[i], { x: mL + colW * i + colW / 2 - tw / 2, y: dY - 18, size: 9, font: fonts[i], color: colors[i] });
    if (i < 2) page.drawRectangle({ x: mL + colW * (i + 1), y: dY - rowH, width: 1, height: rowH, color: TABLE_BORDER });
  }
  hLine(page, mL, dY - rowH, cW);

  // Total row
  const tY = dY - rowH;
  page.drawRectangle({ x: mL, y: tY - 22, width: cW, height: 22, color: TEAL });
  const tLabel = `Total Due (${d.payCurrency}):`;
  const tLW = fb.widthOfTextAtSize(tLabel, 10);
  const tVW = fb.widthOfTextAtSize(d.totalDue, 10);
  page.drawText(tLabel, { x: width - mR - tVW - tLW - 20, y: tY - 15, size: 10, font: fb, color: WHITE });
  page.drawText(d.totalDue, { x: width - mR - tVW - 10, y: tY - 15, size: 10, font: fb, color: WHITE });
  y = tY - 34;

  // Payment Instructions banner (orange)
  y = drawBanner(page, y, 'PAYMENT INSTRUCTIONS', ORANGE, fb, cW, mL);

  // Left — client text
  page.drawText(d.clientName, { x: mL, y, size: 9, font: fb, color: DARK_BG });
  hLine(page, mL, y - 3, cW / 2 - 20, TEAL, 1.5);
  y -= 16;
  page.drawText(`to pay Xending Global ${d.payCurrency}`, { x: mL, y, size: 8, font: fn, color: GRAY_TEXT }); y -= 12;
  page.drawText(`${d.totalDue} by Electronic Wire`, { x: mL, y, size: 8, font: fb, color: GRAY_TEXT }); y -= 12;
  page.drawText(`transfer on ${d.tradeDate} to:`, { x: mL, y, size: 8, font: fn, color: GRAY_TEXT }); y -= 16;
  page.drawText('Payment must be received for', { x: mL, y, size: 8, font: fn, color: GRAY_TEXT }); y -= 12;
  page.drawText('Xending Global to process the currency exchange.', { x: mL, y, size: 8, font: fn, color: GRAY_TEXT });

  // Right — PI bank details
  const bX = mL + cW / 2 + 10, bLW = 100;
  let bY = y + 68;
  bY = drawLV(page, bX, bY, 'Account Number:', d.accountNumber1, fb, fn, bLW);
  bY = drawLV(page, bX, bY, 'Account Name:', d.accountName1, fb, fn, bLW);
  bY = drawLV(page, bX, bY, 'SWIFT:', d.swift1, fb, fn, bLW);
  bY = drawLV(page, bX, bY, 'Bank Name:', d.bankName1, fb, fn, bLW);
  bY = drawLV(page, bX, bY, 'Bank Address:', d.bankAddress1, fb, fn, bLW);
  drawLV(page, bX, bY, 'By Order Of:', d.byOrderOf1, fb, fn, bLW);
  y -= 20;

  // Beneficiary section
  if (d.beneficiaryAccountNumber) {
    y = drawBanner(page, y, 'BENEFICIARY DETAILS - XENDING PAYS TO', BENEFICIARY_BG, fb, cW, mL);
    page.drawText('Xending Global', { x: mL, y, size: 9, font: fb, color: DARK_BG });
    hLine(page, mL, y - 3, cW / 2 - 20, TEAL, 1.5);
    y -= 16;
    page.drawText(`will pay ${d.buyCurrency} ${d.buyAmount}`, { x: mL, y, size: 8, font: fn, color: GRAY_TEXT }); y -= 12;
    page.drawText('by Electronic Wire transfer to:', { x: mL, y, size: 8, font: fn, color: GRAY_TEXT });
    let benY = y + 28;
    benY = drawLV(page, bX, benY, 'CLABE:', d.beneficiaryAccountNumber, fb, fn, bLW);
    benY = drawLV(page, bX, benY, 'Account Name:', d.beneficiaryAccountName, fb, fn, bLW);
    benY = drawLV(page, bX, benY, 'Bank Name:', d.beneficiaryBankName, fb, fn, bLW);
    drawLV(page, bX, benY, 'Bank Address:', d.beneficiaryBankAddress, fb, fn, bLW);
    y -= 40;
  }

  // Disclaimer
  y -= 15;
  hLine(page, mL, y, cW, TABLE_BORDER, 1.5);
  y -= 15;
  const d1 = 'Important Notice:';
  const d2 = 'Xending is a technology services provider, not a bank. Xending is powered by Conduit.';
  page.drawText(d1, { x: mL + (cW - fb.widthOfTextAtSize(d1, 8)) / 2, y, size: 8, font: fb, color: DARK_SLATE });
  y -= 12;
  page.drawText(d2, { x: mL + (cW - fn.widthOfTextAtSize(d2, 7)) / 2, y, size: 7, font: fn, color: MID_GRAY });

  return doc.save();
}
