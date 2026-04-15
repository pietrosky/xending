/** Xending Capital brand colors for Recharts */
export const CHART_COLORS = {
  dataLine: 'hsl(213, 67%, 25%)',       // Primary azul oscuro
  projectionLine: 'hsl(174, 54%, 55%)', // Teal brand-2
  benchmarkLine: 'hsl(215, 16%, 47%)',  // Muted gris
  zoneOk: 'hsl(142, 76%, 96%)',         // Success bg verde claro
  zoneWarning: 'hsl(45, 93%, 95%)',     // Warning bg amarillo claro
  zoneCritical: 'hsl(0, 84%, 96%)',     // Error bg rojo claro
  cardBg: 'hsl(0, 0%, 100%)',           // Blanco
  text: 'hsl(215, 25%, 27%)',           // Foreground
  success: 'hsl(142, 76%, 36%)',        // Verde status
  warning: 'hsl(45, 93%, 47%)',         // Amarillo status
  error: 'hsl(0, 84%, 60%)',            // Rojo status
  info: 'hsl(213, 67%, 55%)',           // Azul medio
} as const;

/** Grade colors for A-F trend classification */
export const GRADE_COLORS: Record<string, string> = {
  A: CHART_COLORS.success,
  B: 'hsl(142, 50%, 50%)',
  C: CHART_COLORS.warning,
  D: 'hsl(25, 80%, 55%)',
  F: CHART_COLORS.error,
};

/** Module grade background colors for EngineScoreCard UI */
export const MODULE_GRADE_BG: Record<string, string> = {
  A: CHART_COLORS.zoneOk,
  B: 'hsl(142, 60%, 94%)',
  C: CHART_COLORS.zoneWarning,
  D: 'hsl(25, 80%, 95%)',
  F: CHART_COLORS.zoneCritical,
};

/** Module status colors (pass/fail/warning/blocked) */
export const STATUS_COLORS: Record<string, string> = {
  pass: CHART_COLORS.success,
  warning: CHART_COLORS.warning,
  fail: CHART_COLORS.error,
  blocked: 'hsl(215, 16%, 47%)',
};

/** Sidebar gradient (brand-1 → brand-2) */
export const SIDEBAR_GRADIENT = 'linear-gradient(135deg, hsl(210, 50%, 18%), hsl(174, 54%, 55%))';
