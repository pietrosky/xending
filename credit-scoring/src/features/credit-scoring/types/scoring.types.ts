/**
 * Tipos para el Scoring Interno de Otorgamiento y Pérdida Esperada.
 *
 * Basado en la metodología documentada en:
 * @see docs/SCORING_METHODOLOGY_EXCEL_REFERENCE.md
 *
 * Modelo de 2 capas:
 *   - Capa 1: Solvencia (1300 pts) — 13 variables documentales/cualitativas
 *   - Capa 2: Combinado (1800 pts) — 5 categorías (solicitud + fuentes + financiero + indicadores + buró)
 *
 * Pérdida Esperada: PE = PD × EAD × LGD
 */

// ─── Constantes del modelo ───────────────────────────────────────────

/** Puntuación máxima de la capa de solvencia */
export const MAX_SOLVENCIA_SCORE = 1300;

/** Puntuación máxima del modelo combinado */
export const MAX_COMBINED_SCORE = 1800;

/** Umbral de aprobación: ≥60% del score combinado */
export const APPROVAL_THRESHOLD_PCT = 0.60;

/** Umbral de aprobación en puntos absolutos */
export const APPROVAL_THRESHOLD_PTS = Math.round(MAX_COMBINED_SCORE * APPROVAL_THRESHOLD_PCT);

// ─── Scoring de Solvencia (Capa 1) ──────────────────────────────────

/** Identificador de cada variable de solvencia */
export type SolvenciaVariable =
  | 'business_age'
  | 'business_type'
  | 'location'
  | 'credit_focus'
  | 'id_documents'
  | 'corporate_docs'
  | 'tax_status'
  | 'address_proof'
  | 'financial_statements'
  | 'tax_returns'
  | 'liabilities_table'
  | 'shareholder_equity'
  | 'marriage_certificate';

/** Resultado de evaluar una variable de solvencia */
export interface SolvenciaVariableResult {
  variable: SolvenciaVariable;
  label: string;
  score: number;
  maxScore: number;
  /** Detalle de sub-variables si aplica */
  subVariables?: SubVariableResult[];
  /** Razón del score asignado */
  reason: string;
}

/** Sub-variable dentro de una variable (ej: CURP, INE dentro de id_documents) */
export interface SubVariableResult {
  name: string;
  score: number;
  maxScore: number;
  present: boolean;
}

/** Resultado completo de la capa de solvencia */
export interface SolvenciaResult {
  score: number;
  maxScore: number;
  percentage: number;
  variables: SolvenciaVariableResult[];
}

// ─── Scoring Combinado (Capa 2 — 1800 pts) ──────────────────────────

/** Categorías del scoring combinado */
export type ScoringCategory =
  | 'applicant_info'       // 700 pts — Información del solicitante
  | 'information_sources'  // 600 pts — Fuentes de información (documentos)
  | 'income_statement'     // 200 pts — Estado de resultados
  | 'financial_indicators' // 200 pts — Indicadores financieros
  | 'credit_history';      // 100 pts — Historial crediticio (Buró)

/** Resultado de una categoría del scoring combinado */
export interface CategoryResult {
  category: ScoringCategory;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: CategoryDetailItem[];
}

/** Detalle de un ítem dentro de una categoría */
export interface CategoryDetailItem {
  name: string;
  score: number;
  maxScore: number;
  /** Valor real evaluado */
  actualValue: unknown;
  /** Descripción del criterio */
  criterion: string;
}

/** Resultado completo del scoring combinado */
export interface CombinedScoringResult {
  score: number;
  maxScore: number;
  percentage: number;
  approved: boolean;
  categories: CategoryResult[];
  /** Resultado de solvencia (capa 1, incluido en el combinado) */
  solvencia: SolvenciaResult;
  /** Clasificación de riesgo basada en el score */
  riskClassification: RiskClassification;
}

// ─── Clasificación de Riesgo ─────────────────────────────────────────

/** Nivel de riesgo según la matriz del Excel */
export type RiskLevel = 'alto' | 'medio_alto' | 'medio_bajo' | 'bajo';

/** Tipo de garantía requerida */
export type GuaranteeRequirement = 'aval_garantia' | 'garantia' | 'no_aplica';

/** Clasificación de riesgo completa */
export interface RiskClassification {
  level: RiskLevel;
  label: string;
  scoreRange: { min: number; max: number };
  guaranteeRequired: GuaranteeRequirement;
  guaranteeLabel: string;
  /** Porcentaje máximo de línea de crédito permitido */
  maxCreditLinePct: number;
  /** Montos disponibles en MXN */
  availableAmounts: { min: number; max: number };
  /** Plazos disponibles en días */
  availableTermDays: number[];
}

// ─── Indicadores Financieros ─────────────────────────────────────────

/** Input de indicadores financieros para scoring */
export interface FinancialIndicatorsInput {
  /** Margen de utilidad bruta (0-1, ej: 0.35 = 35%) */
  grossProfitMargin: number;
  /** Margen de utilidad de operación (0-1) */
  operatingProfitMargin: number;
  /** Razón de liquidez (current ratio) */
  currentRatio: number;
  /** Margen de utilidad operativa (0-1) — puede ser igual a operatingProfitMargin */
  operatingMargin: number;
  /** Score de Buró de Crédito (0-999) */
  buroScore: number;
}

// ─── Input del Scoring Interno ───────────────────────────────────────

/** Giros de negocio reconocidos */
export type BusinessType =
  | 'construccion'
  | 'manufactura'
  | 'transporte'
  | 'comercial'
  | 'industrial'
  | 'servicios'
  | 'otro';

/** Zonas geográficas reconocidas */
export type BusinessZone =
  | 'fronteriza'
  | 'comercial'
  | 'industrial'
  | 'otra';

/** Enfoque del crédito */
export type CreditFocus =
  | 'capital_trabajo'
  | 'instalaciones'
  | 'equipamiento'
  | 'otro';

/** Estado de inscripción del acta constitutiva */
export type CorporateDocStatus =
  | 'inscripcion_rpc'       // Con inscripción en Registro Público de Comercio = 100
  | 'poderes_inscritos'     // Poderes vigentes con inscripción = 100
  | 'asambleas_capital'     // Asambleas con cambios de capital = 85
  | 'sin_inscripcion'       // Sin inscripción = 80
  | 'no_presenta';          // No presenta = 0

/** Documentos de identificación presentados */
export interface IdentificationDocs {
  curp: boolean;
  ine: boolean;
  addressProofCompany: boolean;
  addressProofPerson: boolean;
}

/** Sub-variables de análisis de estados financieros (cada una 0-20) */
export interface FinancialAnalysisSubVars {
  /** Análisis vertical (0-20) */
  verticalAnalysis: number;
  /** Análisis horizontal (0-20) */
  horizontalAnalysis: number;
  /** Análisis de apalancamiento (0-20) */
  leverageAnalysis: number;
  /** Análisis de liquidez (0-20) */
  liquidityAnalysis: number;
  /** Análisis de rentabilidad (0-20) */
  profitabilityAnalysis: number;
}

/** Input completo para el scoring interno */
export interface InternalScoringInput {
  // ── Datos del solicitante (Categoría 1: 700 pts) ──
  companyName: string;
  rfc: string;
  legalRepresentative: string;
  contactInfo: string;
  businessType: BusinessType;
  businessAgeYears: number;
  zone: BusinessZone;

  // ── Documentos y fuentes (Categoría 2: 600 pts + Solvencia) ──
  identificationDocs: IdentificationDocs;
  corporateDocStatus: CorporateDocStatus;
  taxStatusCompany: boolean;
  taxStatusShareholder: boolean;
  addressProofRecent: boolean;
  financialAnalysis: FinancialAnalysisSubVars;
  taxReturnsPresented: boolean;
  liabilitiesTablePresented: boolean;
  shareholderEquityPresented: boolean;
  marriageCertificatePresented: boolean;
  creditFocus: CreditFocus;

  // ── Fuentes adicionales (Categoría 2) ──
  hasOfficialId: boolean;
  hasAddressProof: boolean;
  hasActaConstitutiva: boolean;
  hasBuroReport: boolean;
  hasBankStatements: boolean;
  hasTaxCertificate: boolean;

  // ── Indicadores financieros (Categorías 3-5) ──
  financialIndicators: FinancialIndicatorsInput;
}

// ─── Pérdida Esperada (PE) ───────────────────────────────────────────

/** Input para calcular PE de un cliente individual */
export interface ExpectedLossInput {
  /** Identificador del cliente/crédito */
  clientId: string;
  clientName: string;
  /** Saldo utilizado (Exposure at Default) en MXN */
  ead: number;
  /** Días de atraso en pagos */
  daysPastDue: number;
  /** LGD override (default: 0.40) */
  lgd?: number;
}

/** Resultado de PE para un cliente individual */
export interface ExpectedLossResult {
  clientId: string;
  clientName: string;
  /** Exposure at Default (saldo utilizado) */
  ead: number;
  /** Probability of Default (basada en días de atraso) */
  pd: number;
  /** Loss Given Default (default 0.40) */
  lgd: number;
  /** Pérdida Esperada = PD × EAD × LGD */
  expectedLoss: number;
  /** PE como porcentaje del EAD */
  expectedLossPct: number;
  /** Días de atraso */
  daysPastDue: number;
  /** Categoría de atraso */
  pastDueCategory: string;
}

/** Resultado agregado de PE para un portafolio */
export interface PortfolioExpectedLossResult {
  /** Total EAD del portafolio */
  totalEad: number;
  /** Total PE del portafolio */
  totalExpectedLoss: number;
  /** PE como % del EAD total */
  portfolioPePct: number;
  /** Número de clientes */
  clientCount: number;
  /** Detalle por cliente */
  clients: ExpectedLossResult[];
  /** Distribución por categoría de atraso */
  distributionByCategory: Array<{
    category: string;
    clientCount: number;
    totalEad: number;
    totalPe: number;
    avgPd: number;
  }>;
}
