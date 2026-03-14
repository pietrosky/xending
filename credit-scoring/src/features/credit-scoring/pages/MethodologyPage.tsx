import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Shield,
  Zap,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import {
  ENGINE_INFO,
  DECISION_ENGINE_INFO,
  CREDIT_LIMIT_INFO,
  GATE_INFO,
  CROSS_INFO,
} from '../lib/engineDescriptions';
import type { InfoPopupData } from '../components/InfoPopup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <Icon className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function DescriptionCard({ data }: { data: InfoPopupData }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h4 className="text-sm font-semibold text-foreground">{data.title}</h4>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{data.subtitle}</p>
      <p className="text-sm text-foreground leading-relaxed">{data.whatIs}</p>
      <p className="text-xs text-muted-foreground mt-2 italic">{data.impact}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MethodologyPage() {
  const engines = Object.values(ENGINE_INFO);
  const decisionEngines = Object.values(DECISION_ENGINE_INFO);
  const creditLimits = Object.values(CREDIT_LIMIT_INFO);
  const gates = Object.values(GATE_INFO);
  const crosses = Object.entries(CROSS_INFO)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v);

  return (
    <div className="max-w-5xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Metodologia de Evaluacion Crediticia
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Descripcion completa de motores, gates, cruces inteligentes y limites
            de credito del sistema Scory Credit.
          </p>
        </div>
      </div>

      {/* 1. Gates */}
      <SectionHeader
        icon={Shield}
        title="Gates de Riesgo"
        subtitle="Barreras criticas que deben superarse antes de continuar el analisis"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gates.map((g) => (
          <DescriptionCard key={g.title} data={g} />
        ))}
      </div>

      {/* 2. Analysis Engines */}
      <SectionHeader
        icon={Zap}
        title="Motores de Analisis (16)"
        subtitle="Cada motor evalua una dimension de riesgo y contribuye al score consolidado"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {engines.map((e) => (
          <DescriptionCard key={e.title} data={e} />
        ))}
      </div>

      {/* 3. Decision Engines */}
      <SectionHeader
        icon={Brain}
        title="Motores de Decision"
        subtitle="Capas de decision que determinan monto, condiciones y frecuencia de revision"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decisionEngines.map((d) => (
          <DescriptionCard key={d.title} data={d} />
        ))}
      </div>

      {/* 4. Credit Limits */}
      <SectionHeader
        icon={BarChart3}
        title="Limites de Credito (Regla del Minimo)"
        subtitle="Se calculan 5 limites independientes; el monto aprobado es el MINIMO de los 5"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creditLimits.map((cl) => (
          <DescriptionCard key={cl.title} data={cl} />
        ))}
      </div>

      {/* 5. Cross Analysis */}
      <SectionHeader
        icon={GitBranch}
        title="Cruces Inteligentes (20)"
        subtitle="Combinaciones entre motores que detectan riesgos ocultos y contradicciones"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crosses.map((c) => (
          <DescriptionCard key={c.title} data={c} />
        ))}
      </div>

      {/* 6. Benchmark Strategy */}
      <SectionHeader
        icon={AlertTriangle}
        title="Estrategia de Benchmark (3 Capas)"
        subtitle="Comparacion progresiva contra referencias del mercado y portafolio propio"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Capa 1: Estatica (Activa)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            FUENTE: VALORES CONSERVADORES SOFOM
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            18 metricas con valores conservadores calibrados para SOFOMes que
            prestan a PyMEs mexicanas. Incluye DSCR &ge; 1.3x, leverage &le;
            65%, margen neto &ge; 10%, entre otros. Es la base inicial mientras
            se construye historial.
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Capa 2: Portafolio (Automatica)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            FUENTE: CARTERA PROPIA XENDING (n &ge; 5)
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Se activa automaticamente cuando hay 5 o mas empresas aprobadas en
            un sector. Usa medianas reales del portafolio propio como referencia,
            lo que refleja mejor el perfil de riesgo real de Xending.
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Capa 3: Industria (Futura)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            FUENTE: DATOS EXTERNOS DE INDUSTRIA
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Cuando se integren fuentes externas de benchmarks sectoriales, esta
            capa tendra la prioridad mas alta. Permite comparar contra el
            mercado real, no solo contra el portafolio propio.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 mb-8">
        Prioridad de resolucion: Industria &gt; Portafolio &gt; Estatica. El
        engine reporta que fuente esta usando para cada metrica.
      </p>
    </div>
  );
}
