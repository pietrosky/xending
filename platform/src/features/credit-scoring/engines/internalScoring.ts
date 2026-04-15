/**
 * Engine de Scoring Interno — Modelo de 2 capas para otorgamiento de crédito.
 *
 * Implementa la metodología completa documentada en:
 * @see docs/SCORING_METHODOLOGY_EXCEL_REFERENCE.md
 *
 * Capa 1: Solvencia (1300 pts) — 13 variables documentales/cualitativas
 * Capa 2: Combinado (1800 pts) — solicitud(700) + fuentes(600) + P&L(200) + indicadores(200) + buró(100)
 *
 * Clasificación de riesgo:
 *   < 652  → Riesgo Alto (Aval + Garantía)
 *   652-680 → Riesgo Medio Alto (Aval + Garantía)
 *   681-700 → Riesgo Medio Bajo (Solo Garantía)
 *   701+   → Riesgo Bajo (No Aplica)
 */

import type {
  InternalScoringInput,
  SolvenciaResult,
  SolvenciaVariableResult,
  SubVariableResult,
  CombinedScoringResult,
  CategoryResult,
  CategoryDetailItem,
  RiskClassification,
  RiskLevel,
  GuaranteeRequirement,
  FinancialIndicatorsInput,
  BusinessType,
  BusinessZone,
  CreditFocus,
  CorporateDocStatus,
} from '../types/scoring.types';
import {
  MAX_SOLVENCIA_SCORE,
  MAX_COMBINED_SCORE,
  APPROVAL_THRESHOLD_PCT,
} from '../types/scoring.types';

// ─── Catálogos de scoring ────────────────────────────────────────────

/** Giros de negocio reconocidos (todos valen 100) */
const VALID_BUSINESS_TYPES: BusinessType[] = [
  'construccion', 'manufactura', 'transporte', 'comercial', 'industrial', 'servicios',
];

/** Scoring por zona geográfica */
const ZONE_SCORES: Record<BusinessZone, number> = {
  fronteriza: 100,
  comercial: 90,
  industrial: 100,
  otra: 0,
};

/** Scoring por enfoque de crédito */
const CREDIT_FOCUS_SCORES: Record<CreditFocus, number> = {
  capital_trabajo: 100,
  instalaciones: 100,
  equipamiento: 100,
  otro: 0,
};

/** Scoring por estado de acta constitutiva */
const CORPORATE_DOC_SCORES: Record<CorporateDocStatus, number> = {
  inscripcion_rpc: 100,
  poderes_inscritos: 100,
  asambleas_capital: 85,
  sin_inscripcion: 80,
  no_presenta: 0,
};

// ─── Capa 1: Scoring de Solvencia (1300 pts) ────────────────────────

/** Evalúa la antigüedad del negocio */
function scoreBusinessAge(years: number): SolvenciaVariableResult {
  let score: number;
  let reason: string;
  if (years > 1) {
    score = 100;
    reason = `Antigüedad de ${years} años (> 1 año)`;
  } else if (years >= 11 / 12) {
    score = 80;
    reason = `Antigüedad de ${Math.round(years * 12)} meses (11-12 meses)`;
  } else {
    score = 70;
    reason = `Antigüedad de ${Math.round(years * 12)} meses (≤ 10 meses)`;
  }
  return { variable: 'business_age', label: 'Antigüedad del negocio', score, maxScore: 100, reason };
}

/** Evalúa el giro del negocio */
function scoreBusinessType(type: BusinessType): SolvenciaVariableResult {
  const valid = VALID_BUSINESS_TYPES.includes(type);
  return {
    variable: 'business_type',
    label: 'Giro del negocio',
    score: valid ? 100 : 0,
    maxScore: 100,
    reason: valid ? `Giro "${type}" reconocido` : `Giro "${type}" no reconocido en catálogo`,
  };
}

/** Evalúa la zona/ubicación */
function scoreLocation(zone: BusinessZone): SolvenciaVariableResult {
  const score = ZONE_SCORES[zone];
  return {
    variable: 'location',
    label: 'Zona / Ubicación',
    score,
    maxScore: 100,
    reason: `Zona "${zone}" = ${score} pts`,
  };
}

/** Evalúa el enfoque del crédito */
function scoreCreditFocus(focus: CreditFocus): SolvenciaVariableResult {
  const score = CREDIT_FOCUS_SCORES[focus];
  return {
    variable: 'credit_focus',
    label: 'Enfoque del crédito',
    score,
    maxScore: 100,
    reason: `Enfoque "${focus}" = ${score} pts`,
  };
}

/** Evalúa documentos de identificación (CURP=25, INE=25, domicilio empresa=25, domicilio persona=25) */
function scoreIdDocuments(docs: InternalScoringInput['identificationDocs']): SolvenciaVariableResult {
  const subs: SubVariableResult[] = [
    { name: 'CURP', score: docs.curp ? 25 : 0, maxScore: 25, present: docs.curp },
    { name: 'INE', score: docs.ine ? 25 : 0, maxScore: 25, present: docs.ine },
    { name: 'Comprobante domicilio empresa', score: docs.addressProofCompany ? 25 : 0, maxScore: 25, present: docs.addressProofCompany },
    { name: 'Comprobante domicilio persona', score: docs.addressProofPerson ? 25 : 0, maxScore: 25, present: docs.addressProofPerson },
  ];
  const score = subs.reduce((sum, s) => sum + s.score, 0);
  return {
    variable: 'id_documents',
    label: 'Documentos de identificación',
    score,
    maxScore: 100,
    subVariables: subs,
    reason: `${subs.filter(s => s.present).length}/4 documentos presentados`,
  };
}

/** Evalúa acta constitutiva y poderes */
function scoreCorporateDocs(status: CorporateDocStatus): SolvenciaVariableResult {
  const score = CORPORATE_DOC_SCORES[status];
  return {
    variable: 'corporate_docs',
    label: 'Acta Constitutiva, poderes, asambleas',
    score,
    maxScore: 100,
    reason: `Estado: "${status}" = ${score} pts`,
  };
}

/** Evalúa constancia de situación fiscal (empresa=50, accionista=50) */
function scoreTaxStatus(company: boolean, shareholder: boolean): SolvenciaVariableResult {
  const subs: SubVariableResult[] = [
    { name: 'Constancia empresa', score: company ? 50 : 0, maxScore: 50, present: company },
    { name: 'Constancia accionista', score: shareholder ? 50 : 0, maxScore: 50, present: shareholder },
  ];
  const score = subs.reduce((sum, s) => sum + s.score, 0);
  return {
    variable: 'tax_status',
    label: 'Constancia de situación fiscal',
    score,
    maxScore: 100,
    subVariables: subs,
    reason: `${company ? 'Empresa ✓' : 'Empresa ✗'} | ${shareholder ? 'Accionista ✓' : 'Accionista ✗'}`,
  };
}

/** Evalúa comprobante de domicilio empresa */
function scoreAddressProof(presented: boolean): SolvenciaVariableResult {
  return {
    variable: 'address_proof',
    label: 'Comprobante de domicilio empresa',
    score: presented ? 100 : 0,
    maxScore: 100,
    reason: presented ? 'Comprobante presentado' : 'No presentado',
  };
}

/** Evalúa estados financieros con 5 sub-variables (cada una 20 pts) */
function scoreFinancialStatements(analysis: InternalScoringInput['financialAnalysis']): SolvenciaVariableResult {
  const subs: SubVariableResult[] = [
    { name: 'Análisis Vertical', score: clamp(analysis.verticalAnalysis, 0, 20), maxScore: 20, present: analysis.verticalAnalysis > 0 },
    { name: 'Análisis Horizontal', score: clamp(analysis.horizontalAnalysis, 0, 20), maxScore: 20, present: analysis.horizontalAnalysis > 0 },
    { name: 'Análisis de Apalancamiento', score: clamp(analysis.leverageAnalysis, 0, 20), maxScore: 20, present: analysis.leverageAnalysis > 0 },
    { name: 'Análisis de Liquidez', score: clamp(analysis.liquidityAnalysis, 0, 20), maxScore: 20, present: analysis.liquidityAnalysis > 0 },
    { name: 'Análisis de Rentabilidad', score: clamp(analysis.profitabilityAnalysis, 0, 20), maxScore: 20, present: analysis.profitabilityAnalysis > 0 },
  ];
  const score = subs.reduce((sum, s) => sum + s.score, 0);
  return {
    variable: 'financial_statements',
    label: 'Estados Financieros (3 cierres + periodo)',
    score,
    maxScore: 100,
    subVariables: subs,
    reason: `Score financiero: ${score}/100`,
  };
}

/** Evalúa variable binaria simple (presenta/no presenta = 100/0) */
function scoreBinaryVariable(
  variable: SolvenciaVariableResult['variable'],
  label: string,
  presented: boolean,
): SolvenciaVariableResult {
  return {
    variable,
    label,
    score: presented ? 100 : 0,
    maxScore: 100,
    reason: presented ? 'Documento presentado' : 'No presentado',
  };
}

/** Ejecuta la capa 1 completa: Solvencia (1300 pts) */
export function runSolvenciaScoring(input: InternalScoringInput): SolvenciaResult {
  const variables: SolvenciaVariableResult[] = [
    scoreBusinessAge(input.businessAgeYears),
    scoreBusinessType(input.businessType),
    scoreLocation(input.zone),
    scoreCreditFocus(input.creditFocus),
    scoreIdDocuments(input.identificationDocs),
    scoreCorporateDocs(input.corporateDocStatus),
    scoreTaxStatus(input.taxStatusCompany, input.taxStatusShareholder),
    scoreAddressProof(input.addressProofRecent),
    scoreFinancialStatements(input.financialAnalysis),
    scoreBinaryVariable('tax_returns', 'Declaraciones anuales (3 periodos)', input.taxReturnsPresented),
    scoreBinaryVariable('liabilities_table', 'Tabla de pasivos financieros', input.liabilitiesTablePresented),
    scoreBinaryVariable('shareholder_equity', 'Relación patrimonial accionista', input.shareholderEquityPresented),
    scoreBinaryVariable('marriage_certificate', 'Acta de matrimonio accionista', input.marriageCertificatePresented),
  ];

  const score = variables.reduce((sum, v) => sum + v.score, 0);

  return {
    score,
    maxScore: MAX_SOLVENCIA_SCORE,
    percentage: round2((score / MAX_SOLVENCIA_SCORE) * 100),
    variables,
  };
}

// ─── Indicadores Financieros — Scoring por rangos ────────────────────

/** Utilidad Bruta: 1-10%=0, 11-20%=50, 21-30%=50, 31-40%=80, 41-50%=90, >50%=100 */
function scoreGrossProfitMargin(margin: number): number {
  const pct = margin * 100;
  if (pct > 50) return 100;
  if (pct >= 41) return 90;
  if (pct >= 31) return 80;
  if (pct >= 11) return 50;
  return 0;
}

/** Utilidad Operación: 1-10%=50, 11-20%=50, 21-30%=70, 31-40%=80, 41-50%=100, >50%=100 */
function scoreOperatingProfitMargin(margin: number): number {
  const pct = margin * 100;
  if (pct >= 41) return 100;
  if (pct >= 31) return 80;
  if (pct >= 21) return 70;
  if (pct >= 1) return 50;
  return 0;
}

/** Razón de Liquidez: Baja(0-1)=30, Media(1.1-1.5)=70, Alta(1.5-2.5)=100 */
function scoreCurrentRatio(ratio: number): number {
  if (ratio >= 1.5) return 100;
  if (ratio >= 1.1) return 70;
  return 30;
}

/** Margen Utilidad Operativa: Baja(0-9%)=30, Promedio(10-15%)=70, Fuerte(16-20%)=90, Excelente(>21%)=100 */
function scoreOperatingMargin(margin: number): number {
  const pct = margin * 100;
  if (pct >= 21) return 100;
  if (pct >= 16) return 90;
  if (pct >= 10) return 70;
  return 30;
}

/** Score Buró: Baja(0-600)=40, Media(601-700)=90, Alta(701+)=100 */
function scoreBuroCredit(buroScore: number): number {
  if (buroScore >= 701) return 100;
  if (buroScore >= 601) return 90;
  return 40;
}

// ─── Capa 2: Scoring Combinado (1800 pts) ────────────────────────────

/** Categoría 1: Información del Solicitante (700 pts) */
function scoreApplicantInfo(input: InternalScoringInput): CategoryResult {
  const details: CategoryDetailItem[] = [
    { name: 'Razón Social', score: input.companyName.trim() ? 100 : 0, maxScore: 100, actualValue: input.companyName, criterion: 'Nombre de empresa proporcionado' },
    { name: 'RFC', score: input.rfc.trim() ? 100 : 0, maxScore: 100, actualValue: input.rfc, criterion: 'RFC válido proporcionado' },
    { name: 'Representante Legal', score: input.legalRepresentative.trim() ? 100 : 0, maxScore: 100, actualValue: input.legalRepresentative, criterion: 'Nombre del representante' },
    { name: 'Contacto', score: input.contactInfo.trim() ? 100 : 0, maxScore: 100, actualValue: input.contactInfo, criterion: 'Información de contacto' },
    { name: 'Giro', score: VALID_BUSINESS_TYPES.includes(input.businessType) ? 100 : 0, maxScore: 100, actualValue: input.businessType, criterion: 'Giro reconocido en catálogo' },
    { name: 'Antigüedad', score: input.businessAgeYears > 1 ? 100 : (input.businessAgeYears >= 11 / 12 ? 80 : 70), maxScore: 100, actualValue: `${input.businessAgeYears} años`, criterion: '>1 año=100, 11-12mo=80, ≤10mo=70' },
    { name: 'Ubicación', score: ZONE_SCORES[input.zone], maxScore: 100, actualValue: input.zone, criterion: 'Fronteriza/Industrial=100, Comercial=90' },
  ];
  const score = details.reduce((sum, d) => sum + d.score, 0);
  return {
    category: 'applicant_info',
    label: 'Información del Solicitante',
    score,
    maxScore: 700,
    percentage: round2((score / 700) * 100),
    details,
  };
}

/** Categoría 2: Fuentes de Información (600 pts) */
function scoreInformationSources(input: InternalScoringInput): CategoryResult {
  const details: CategoryDetailItem[] = [
    { name: 'ID Oficial (INE)', score: input.hasOfficialId ? 100 : 0, maxScore: 100, actualValue: input.hasOfficialId, criterion: 'Presenta identificación oficial' },
    { name: 'Comprobante de Domicilio', score: input.hasAddressProof ? 100 : 0, maxScore: 100, actualValue: input.hasAddressProof, criterion: 'Presenta comprobante reciente' },
    { name: 'Acta Constitutiva', score: input.hasActaConstitutiva ? 100 : 0, maxScore: 100, actualValue: input.hasActaConstitutiva, criterion: 'Presenta acta constitutiva' },
    { name: 'Reporte Buró de Crédito', score: input.hasBuroReport ? 100 : 0, maxScore: 100, actualValue: input.hasBuroReport, criterion: 'Reporte Buró disponible' },
    { name: 'Estados de Cuenta', score: input.hasBankStatements ? 100 : 0, maxScore: 100, actualValue: input.hasBankStatements, criterion: 'Presenta estados de cuenta bancarios' },
    { name: 'Constancia Fiscal', score: input.hasTaxCertificate ? 100 : 0, maxScore: 100, actualValue: input.hasTaxCertificate, criterion: 'Constancia de situación fiscal' },
  ];
  const score = details.reduce((sum, d) => sum + d.score, 0);
  return {
    category: 'information_sources',
    label: 'Fuentes de Información',
    score,
    maxScore: 600,
    percentage: round2((score / 600) * 100),
    details,
  };
}

/** Categoría 3: Estado de Resultados (200 pts) */
function scoreIncomeStatement(fi: FinancialIndicatorsInput): CategoryResult {
  const grossScore = scoreGrossProfitMargin(fi.grossProfitMargin);
  const opScore = scoreOperatingProfitMargin(fi.operatingProfitMargin);
  const details: CategoryDetailItem[] = [
    { name: 'Utilidad Bruta', score: grossScore, maxScore: 100, actualValue: `${round2(fi.grossProfitMargin * 100)}%`, criterion: '1-10%=0, 11-20%=50, 31-40%=80, 41-50%=90, >50%=100' },
    { name: 'Utilidad de Operación', score: opScore, maxScore: 100, actualValue: `${round2(fi.operatingProfitMargin * 100)}%`, criterion: '1-10%=50, 21-30%=70, 31-40%=80, ≥41%=100' },
  ];
  const score = grossScore + opScore;
  return {
    category: 'income_statement',
    label: 'Estado de Resultados',
    score,
    maxScore: 200,
    percentage: round2((score / 200) * 100),
    details,
  };
}

/** Categoría 4: Indicadores Financieros (200 pts) */
function scoreFinancialIndicators(fi: FinancialIndicatorsInput): CategoryResult {
  const liquidityScore = scoreCurrentRatio(fi.currentRatio);
  const marginScore = scoreOperatingMargin(fi.operatingMargin);
  const details: CategoryDetailItem[] = [
    { name: 'Razón de Liquidez', score: liquidityScore, maxScore: 100, actualValue: fi.currentRatio.toFixed(2), criterion: '0-1=30, 1.1-1.5=70, 1.5-2.5=100' },
    { name: 'Margen Utilidad Operativa', score: marginScore, maxScore: 100, actualValue: `${round2(fi.operatingMargin * 100)}%`, criterion: '0-9%=30, 10-15%=70, 16-20%=90, >21%=100' },
  ];
  const score = liquidityScore + marginScore;
  return {
    category: 'financial_indicators',
    label: 'Indicadores Financieros',
    score,
    maxScore: 200,
    percentage: round2((score / 200) * 100),
    details,
  };
}

/** Categoría 5: Historial Crediticio — Buró (100 pts) */
function scoreCreditHistory(fi: FinancialIndicatorsInput): CategoryResult {
  const bScore = scoreBuroCredit(fi.buroScore);
  const details: CategoryDetailItem[] = [
    { name: 'Score Buró de Crédito', score: bScore, maxScore: 100, actualValue: fi.buroScore, criterion: '0-600=40, 601-700=90, 701+=100' },
  ];
  return {
    category: 'credit_history',
    label: 'Historial Crediticio (Buró)',
    score: bScore,
    maxScore: 100,
    percentage: round2((bScore / 100) * 100),
    details,
  };
}

// ─── Clasificación de Riesgo ─────────────────────────────────────────

/** Plazos disponibles según la matriz */
const AVAILABLE_TERMS = [15, 20, 25, 30, 35, 40, 45];

/** Clasifica el riesgo según el score normalizado a escala 0-1000 */
export function classifyRisk(combinedScore: number): RiskClassification {
  // Normalizar score de 1800 a escala comparable con la matriz (que usa rangos ~652-701+)
  // La matriz del Excel usa una escala propia. Mapeamos proporcionalmente.
  const normalized = Math.round((combinedScore / MAX_COMBINED_SCORE) * 1000);

  let level: RiskLevel;
  let label: string;
  let scoreRange: { min: number; max: number };
  let guaranteeRequired: GuaranteeRequirement;
  let guaranteeLabel: string;
  let maxCreditLinePct: number;
  let availableAmounts: { min: number; max: number };

  if (normalized < 652) {
    level = 'alto';
    label = 'Riesgo Alto';
    scoreRange = { min: 0, max: 651 };
    guaranteeRequired = 'aval_garantia';
    guaranteeLabel = 'Aval + Garantía';
    maxCreditLinePct = 30;
    availableAmounts = { min: 500_000, max: 1_500_000 };
  } else if (normalized <= 680) {
    level = 'medio_alto';
    label = 'Riesgo Medio Alto';
    scoreRange = { min: 652, max: 680 };
    guaranteeRequired = 'aval_garantia';
    guaranteeLabel = 'Aval + Garantía';
    maxCreditLinePct = 49;
    availableAmounts = { min: 500_000, max: 4_500_000 };
  } else if (normalized <= 700) {
    level = 'medio_bajo';
    label = 'Riesgo Medio Bajo';
    scoreRange = { min: 681, max: 700 };
    guaranteeRequired = 'garantia';
    guaranteeLabel = 'Solo Garantía';
    maxCreditLinePct = 70;
    availableAmounts = { min: 500_000, max: 7_500_000 };
  } else {
    level = 'bajo';
    label = 'Riesgo Bajo';
    scoreRange = { min: 701, max: 1000 };
    guaranteeRequired = 'no_aplica';
    guaranteeLabel = 'No Aplica';
    maxCreditLinePct = 90;
    availableAmounts = { min: 500_000, max: 10_000_000 };
  }

  return {
    level,
    label,
    scoreRange,
    guaranteeRequired,
    guaranteeLabel,
    maxCreditLinePct,
    availableAmounts,
    availableTermDays: AVAILABLE_TERMS,
  };
}

// ─── Engine principal ────────────────────────────────────────────────

/**
 * Ejecuta el scoring interno completo (2 capas).
 *
 * @param input - Datos del solicitante, documentos e indicadores financieros
 * @returns Resultado combinado con score, clasificación de riesgo y detalle por categoría
 */
export function runInternalScoring(input: InternalScoringInput): CombinedScoringResult {
  // Capa 1: Solvencia
  const solvencia = runSolvenciaScoring(input);

  // Capa 2: Categorías del scoring combinado
  const categories: CategoryResult[] = [
    scoreApplicantInfo(input),
    scoreInformationSources(input),
    scoreIncomeStatement(input.financialIndicators),
    scoreFinancialIndicators(input.financialIndicators),
    scoreCreditHistory(input.financialIndicators),
  ];

  const score = categories.reduce((sum, c) => sum + c.score, 0);
  const percentage = round2((score / MAX_COMBINED_SCORE) * 100);
  const approved = percentage >= APPROVAL_THRESHOLD_PCT * 100;
  const riskClassification = classifyRisk(score);

  return {
    score,
    maxScore: MAX_COMBINED_SCORE,
    percentage,
    approved,
    categories,
    solvencia,
    riskClassification,
  };
}

// ─── Utilidades ──────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
