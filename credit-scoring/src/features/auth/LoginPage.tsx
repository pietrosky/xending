/**
 * LoginPage — Email + password login against local_users table.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type LocalUser } from '@/lib/authStore';
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

    // Call PostgREST RPC login endpoint
    try {
      const response = await fetch(
        `${import.meta.env.VITE_POSTGREST_URL ?? 'http://localhost:55421'}/rpc/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
          },
          body: JSON.stringify({ email_input: trimmedEmail, password_input: password }),
        },
      );

      setLoading(false);

      if (!response.ok) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      const result = await response.json();
      const localUser: LocalUser = {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.full_name,
        role: result.user.role,
        token: result.token,
      };
      login(localUser);
      navigate('/', { replace: true });
    } catch {
      setLoading(false);
      setError('Error de conexión. Verifica que el servidor esté corriendo.');
    }
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
