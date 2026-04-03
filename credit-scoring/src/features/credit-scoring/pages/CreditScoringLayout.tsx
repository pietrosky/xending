import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  BookOpen,
  Map,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import logoSrc from '@/assets/logoxending.png';

const NAV_ITEMS = [
  { to: '/', label: 'Scory Credit', icon: LayoutDashboard, end: true },
  { to: '/companies', label: 'Empresas', icon: Building2, end: false },
  { to: '/portfolio', label: 'Portafolio', icon: TrendingUp, end: false },
  { to: '/policies', label: 'Politicas', icon: Shield, end: false },
  { to: '/benchmarks', label: 'Benchmarks', icon: BarChart3, end: false },
  { to: '/methodology', label: 'Metodologia', icon: BookOpen, end: false },
  { to: '/mapa-datos', label: 'Mapa de Datos', icon: Map, end: false },
  { to: '/fichas-tecnicas', label: 'Fichas Tecnicas', icon: ClipboardList, end: false },
  { to: '/applications', label: 'Solicitudes', icon: Settings, end: false },
];

export function CreditScoringLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, hsl(210, 50%, 18%), hsl(174, 54%, 55%))',
        }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <img src={logoSrc} alt="Xending Capital" className="h-8 w-auto" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Scory Credit
            </h1>
            <p className="text-xs text-white/70">Xending Capital</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Tramitar Credito button */}
          <NavLink
            to="/applications/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors mt-4 border border-white/20"
          >
            <FilePlus size={18} />
            Tramitar Credito
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-xs text-white/50">
          v1.0.0 — Scory Credit System
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background p-6">
        <Outlet />
      </main>
    </div>
  );
}
