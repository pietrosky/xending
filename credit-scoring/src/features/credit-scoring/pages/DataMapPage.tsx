/**
 * Mapa Visual de Datos y Motores — /mapa-datos
 *
 * Muestra gráficamente de dónde viene cada dato, cómo fluye
 * por el sistema, y qué motor lo consume. Todo en español México.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// ─── Componentes de bloques visuales ─────────────────────────────────

function SourceBox({ id, name, provider, items, color }: {
  id: string;
  name: string;
  provider: string;
  items: string[];
  color: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-3 ${color}`}>
      <div className="text-[10px] font-mono text-muted-foreground">{id}</div>
      <div className="text-sm font-semibold text-foreground">{name}</div>
      <div className="text-[11px] text-muted-foreground mb-2">{provider}</div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-xs text-foreground">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function EngineBox({ name, weight, source, isGate }: {
  name: string;
  weight: string;
  source: string;
  isGate?: boolean;
}) {
  return (
    <div className={`rounded border p-2 text-xs ${
      isGate
        ? 'border-red-400/50 bg-red-500/5'
        : 'border-border bg-card'
    }`}>
      <div className="font-semibold text-foreground">{name}</div>
      <div className="text-muted-foreground">
        {isGate ? 'GATE — pasa o bloquea' : `Peso: ${weight}`}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">Fuente: {source}</div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-4 bg-muted-foreground/30" />
      <div className="text-muted-foreground text-lg leading-none">▼</div>
      {label && <div className="text-[10px] text-muted-foreground">{label}</div>}
    </div>
  );
}

function HorizontalArrow() {
  return <div className="text-muted-foreground text-lg self-center px-1">→</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
      <span className="text-sm font-semibold text-primary">{children}</span>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────

export function DataMapPage() {
  return (
    <div className="max-w-6xl pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al dashboard
      </Link>

      <h2 className="text-2xl font-semibold text-foreground mb-1">
        Mapa de Datos y Motores
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        De donde viene cada dato, como fluye por el sistema, y que motor lo consume.
      </p>

      {/* ═══ CAPA 1: FUENTES DE DATOS ═══ */}
      <SectionTitle>CAPA 1 — Fuentes de Datos (Data Sources)</SectionTitle>
      <p className="text-xs text-muted-foreground text-center mb-3">
        Datos crudos que se extraen de proveedores externos o se suben manualmente.
        Se guardan en la tabla cs_provider_data del Data Layer.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
        <SourceBox
          id="M03a"
          name="SAT"
          provider="Syntage"
          items={['Facturas emitidas', 'Facturas recibidas', 'Declaraciones', 'Constancia fiscal', 'Nomina', 'Balanza']}
          color="border-blue-400/50 bg-blue-500/5"
        />
        <SourceBox
          id="M03b"
          name="Buro de Credito"
          provider="Syntage"
          items={['Score PyME', 'Creditos activos', 'Creditos liquidados', 'Consultas', 'Hawk Checks']}
          color="border-purple-400/50 bg-purple-500/5"
        />
        <SourceBox
          id="M03c"
          name="Financieros"
          provider="Upload PDF/Excel"
          items={['Balance General', 'Estado de Resultados', 'Razones financieras', 'Relacion patrimonial']}
          color="border-green-400/50 bg-green-500/5"
        />
        <SourceBox
          id="M03d"
          name="PLD / Cumplimiento"
          provider="Scory + Hawk"
          items={['Listas negras', 'OFAC / PEPs', '69-B SAT', 'Verificacion KYB']}
          color="border-red-400/50 bg-red-500/5"
        />
        <SourceBox
          id="M03e"
          name="Registro Publico"
          provider="Syntage"
          items={['Accionistas', 'Garantias RUG', 'Incidencias legales', 'Estructura corporativa']}
          color="border-amber-400/50 bg-amber-500/5"
        />
      </div>

      <Arrow label="Los datos crudos alimentan a los motores de analisis" />

      {/* ═══ CAPA 2: MOTORES DE ANÁLISIS ═══ */}
      <SectionTitle>CAPA 2 — Motores de Analisis (16 motores)</SectionTitle>
      <p className="text-xs text-muted-foreground text-center mb-3">
        Cada motor lee datos crudos de una o mas fuentes, calcula metricas, y produce un score de 0 a 100.
        Los pesos se normalizan al 100% segun motores activos.
      </p>

      {/* Grupo SAT */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Alimentados por datos del SAT (Syntage)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <EngineBox name="Facturacion SAT" weight="14%" source="M03a SAT" />
          <EngineBox name="Red de Clientes" weight="8%" source="M03a SAT" />
          <EngineBox name="Estabilidad" weight="9%" source="M03a SAT" />
          <EngineBox name="Empleados" weight="3%" source="M03a SAT" />
          <EngineBox name="Riesgo Cambiario" weight="7%" source="M03a SAT" />
        </div>
      </div>

      {/* Grupo Buró */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
          Alimentado por Buro de Credito (Syntage)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <EngineBox name="Buro de Credito" weight="10%" source="M03b Buro" />
        </div>
      </div>

      {/* Grupo Financieros */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Alimentados por SAT + Financieros manuales
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <EngineBox name="Flujo de Efectivo" weight="16%" source="M03a + M03c" />
          <EngineBox name="Financiero" weight="11%" source="M03a + M03c" />
          <EngineBox name="Capital de Trabajo" weight="4%" source="M03a + M03c" />
        </div>
      </div>

      {/* Grupo Internos + Gates */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          Datos internos + Expediente
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <EngineBox name="Riesgo Operativo" weight="9%" source="M03e Reg. Publico" />
          <EngineBox name="Documentacion" weight="4%" source="Expediente" />
          <EngineBox name="Portafolio" weight="5%" source="Datos internos" />
          <EngineBox name="Benchmark" weight="ref." source="Industria / Cartera" />
        </div>
      </div>

      {/* Gates */}
      <div className="mb-2">
        <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Gates — No dan puntos, pero bloquean si fallan
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <EngineBox name="Cumplimiento PLD" weight="" source="M03d Scory" isGate />
          <EngineBox name="Garantias" weight="" source="Expediente" isGate />
          <EngineBox name="Fraude en Red" weight="" source="M03a + M03d" isGate />
        </div>
      </div>

      <Arrow label="Los 16 scores + gates alimentan los cruces y la decision" />

      {/* ═══ CAPA 3: CRUCES INTELIGENTES ═══ */}
      <SectionTitle>CAPA 3 — Cruces Inteligentes (20 combinaciones)</SectionTitle>
      <p className="text-xs text-muted-foreground text-center mb-3">
        Combinan metricas de 2 o mas motores para detectar patrones ocultos.
        Si un motor requerido no esta activo, el cruce se salta sin error.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {[
          { n: '01', name: 'SAT vs Declarado', engines: 'Facturacion + Financiero' },
          { n: '02', name: 'DSCR vs Deuda', engines: 'Flujo + Buro' },
          { n: '03', name: 'Concentracion + Volatilidad', engines: 'Red + Estabilidad' },
          { n: '04', name: 'Rotacion de Deuda', engines: 'Buro + Flujo' },
          { n: '05', name: 'Capital vs Pagos', engines: 'Capital Trabajo + Flujo' },
          { n: '06', name: 'Productividad', engines: 'Empleados + Facturacion' },
          { n: '07', name: 'Garantia vs Riesgo', engines: 'Garantias + Operativo' },
          { n: '08', name: 'FX vs Ingresos', engines: 'Riesgo FX + Facturacion' },
          { n: '09', name: 'Razones Cruzadas', engines: 'Financiero + Flujo' },
          { n: '10', name: 'Docs vs Riesgo', engines: 'Documentacion + Varios' },
          { n: '11', name: 'Cancelaciones', engines: 'Facturacion + Red' },
          { n: '12', name: 'Busqueda Credito', engines: 'Buro + Varios' },
          { n: '13', name: 'Partes Relacionadas', engines: 'Financiero + Red' },
          { n: '14', name: 'Tendencia vs Estabilidad', engines: 'Facturacion + Estabilidad' },
          { n: '15', name: 'Flujo Estresado', engines: 'Flujo + Garantias' },
          { n: '16', name: 'Dependencia Gobierno', engines: 'Red + Facturacion' },
          { n: '17', name: 'Empresa Fachada', engines: 'Fraude + PLD' },
          { n: '18', name: 'Sobreendeudamiento', engines: 'Buro + Financiero' },
          { n: '19', name: 'Estacionalidad vs Plazo', engines: 'Estabilidad + Expediente' },
          { n: '20', name: 'Coherencia General', engines: 'Todos los motores' },
        ].map((c) => (
          <div key={c.n} className="rounded border border-border bg-card p-2 text-xs">
            <span className="font-mono text-muted-foreground">#{c.n}</span>{' '}
            <span className="font-semibold text-foreground">{c.name}</span>
            <div className="text-[10px] text-muted-foreground">{c.engines}</div>
          </div>
        ))}
      </div>

      <Arrow label="Cruces + scores alimentan la capa de decision" />

      {/* ═══ CAPA 4: SCORE CONSOLIDADO ═══ */}
      <SectionTitle>CAPA 4 — Score Consolidado</SectionTitle>
      <div className="bg-card rounded-lg border border-border p-4 text-center mb-2">
        <div className="text-sm text-foreground mb-2">
          Score = Suma de (score_motor x peso_motor) para los 12 motores con peso
        </div>
        <div className="font-mono text-xs text-muted-foreground mb-3">
          Score = (flujo×16%) + (facturacion×14%) + (financiero×11%) + (buro×10%) + (estabilidad×9%) + (operativo×9%) + (red×8%) + (fx×7%) + (portafolio×5%) + (capital_trabajo×4%) + (documentacion×4%) + (empleados×3%)
        </div>
        <div className="text-xs text-muted-foreground">
          Resultado: un numero de 0 a 100. Los gates (PLD, garantias, fraude) no suman pero pueden bloquear.
        </div>
      </div>

      <Arrow label="Score + cruces + gates determinan la decision" />

      {/* ═══ CAPA 5: DECISIÓN ═══ */}
      <SectionTitle>CAPA 5 — Decision Final</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-sm font-semibold text-foreground mb-2">Limite de Credito (Regla del Minimo)</div>
          <div className="space-y-1 text-xs text-foreground">
            <div className="flex justify-between"><span>Por Flujo (DSCR)</span><span className="font-mono">EBITDA × Factor ÷ Tasa</span></div>
            <div className="flex justify-between"><span>Por Ventas</span><span className="font-mono">Ventas Anuales × 20%</span></div>
            <div className="flex justify-between"><span>Por EBITDA</span><span className="font-mono">EBITDA × 2</span></div>
            <div className="flex justify-between"><span>Por Garantia</span><span className="font-mono">Valor × (1-Haircut) ÷ 2</span></div>
            <div className="flex justify-between"><span>Por Portafolio</span><span className="font-mono">Limite concentracion</span></div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Monto aprobado = el MENOR de los 5 limites
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-sm font-semibold text-foreground mb-2">Resultado por Score</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              <span className="text-foreground">Score ≥ 75 + sin alertas → APROBADO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
              <span className="text-foreground">Score 60-74 + garantias → CONDICIONADO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
              <span className="text-foreground">Score 50-74 + cruces complejos → COMITE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <span className="text-foreground">Score &lt; 50 o hard stop → RECHAZADO</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FLUJO COMPLETO ═══ */}
      <SectionTitle>Flujo Completo — De Solicitud a Decision</SectionTitle>
      <div className="flex flex-col items-center gap-1 mt-3 mb-6">
        {[
          { step: '1', label: 'Solicitud', detail: 'Empresa llena formulario → Pre-filtro (7 reglas automaticas)', color: 'bg-blue-500' },
          { step: '2', label: 'PLD / Scory', detail: 'Check rapido de listas negras → GO / NO-GO', color: 'bg-red-500' },
          { step: '3', label: 'Buro', detail: 'Firma autorizacion → Consulta via Syntage → Score', color: 'bg-purple-500' },
          { step: '4', label: 'SAT', detail: 'Ingresa CIEC → Syntage extrae 3 anios de datos', color: 'bg-blue-500' },
          { step: '5', label: 'Analisis', detail: '16 motores + 20 cruces → Score consolidado 0-100', color: 'bg-green-500' },
          { step: '6', label: 'Documentacion + KYB', detail: 'Sube financieros + docs → Scory KYB → Re-scoring', color: 'bg-amber-500' },
          { step: '7', label: 'Decision', detail: 'Score + limite + matriz → Aprobado / Condicionado / Comite / Rechazado', color: 'bg-primary' },
        ].map((s, i) => (
          <div key={s.step} className="w-full max-w-lg">
            {i > 0 && <div className="flex justify-center"><div className="w-0.5 h-3 bg-muted-foreground/30" /><span className="text-muted-foreground text-sm ml-0.5">▼</span></div>}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className={`w-8 h-8 rounded-full ${s.color} text-white flex items-center justify-center text-sm font-semibold shrink-0`}>
                {s.step}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Para ver las formulas y calculos detallados de cada motor, ve a{' '}
        <Link to="/fichas-tecnicas" className="text-primary hover:underline">Fichas Tecnicas</Link>.
      </p>
    </div>
  );
}
