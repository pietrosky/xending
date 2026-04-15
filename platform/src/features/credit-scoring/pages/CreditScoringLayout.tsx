import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  ArrowLeftRight,
  Landmark,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/lib/authStore';
import logoSrc from '@/assets/logoxending.png';

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; end: boolean; roles?: Array<'admin' | 'broker'> }> = [
  { to: '/', label: 'Scory Credit', icon: LayoutDashboard, end: true, roles: ['admin'] },
  { to: '/companies', label: 'Empresas', icon: Building2, end: false, roles: ['admin'] },
  { to: '/portfolio', label: 'Portafolio', icon: TrendingUp, end: false, roles: ['admin'] },
  { to: '/policies', label: 'Politicas', icon: Shield, end: false, roles: ['admin'] },
  { to: '/benchmarks', label: 'Benchmarks', icon: BarChart3, end: false, roles: ['admin'] },
  { to: '/methodology', label: 'Metodologia', icon: BookOpen, end: false, roles: ['admin'] },
  { to: '/mapa-datos', label: 'Mapa de Datos', icon: Map, end: false, roles: ['admin'] },
  { to: '/fichas-tecnicas', label: 'Fichas Tecnicas', icon: ClipboardList, end: false, roles: ['admin'] },
  { to: '/applications', label: 'Solicitudes', icon: Settings, end: false, roles: ['admin'] },
  { to: '/fx/companies', label: 'Empresas FX', icon: Landmark, end: false },
  { to: '/fx/transactions', label: 'Transacciones FX', icon: ArrowLeftRight, end: false },
  { to: '/payment-instructions', label: 'Payment Instructions', icon: CreditCard, end: false },
];

export function CreditScoringLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

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
          {NAV_ITEMS
            .filter(({ roles }) => !roles || roles.includes(user?.role ?? 'broker'))
            .map(({ to, label, icon: Icon, end }) => (
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

          {/* Tramitar Credito button — admin only */}
          {user?.role === 'admin' && (
            <NavLink
              to="/applications/new"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors mt-4 border border-white/20"
            >
              <FilePlus size={18} />
              Tramitar Credito
            </NavLink>
          )}
        </nav>

        {/* Footer — user info + logout */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-medium text-white">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-white/50 truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left text-xs text-white/50 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background p-6">
        <Outlet />
      </main>
    </div>
  );
}
