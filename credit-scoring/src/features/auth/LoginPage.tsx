/**
 * LoginPage — Email + password login against local_users table.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type LocalUser } from '@/lib/authStore';
import { postgrest } from '@/lib/postgrest';
import logoSrc from '@/assets/logoxending.png';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Ingresa correo y contraseña');
      return;
    }

    setLoading(true);

    const { data, error: fetchErr } = await postgrest
      .from('local_users')
      .select('id, email, full_name, password')
      .eq('email', trimmedEmail)
      .single();

    setLoading(false);

    if (fetchErr || !data) {
      setError('Correo o contraseña incorrectos');
      return;
    }

    const row = data as { id: string; email: string; full_name: string; password: string };

    if (row.password !== password) {
      setError('Correo o contraseña incorrectos');
      return;
    }

    const role = row.email.includes('admin') ? 'admin' : 'broker';
    const localUser: LocalUser = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role,
    };
    login(localUser);
    navigate('/', { replace: true });
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logoSrc} alt="Xending Capital" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">Iniciar Sesión</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        {error && (
          <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="usuario@xending.local"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
