import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { isDbConfigured, signInWithPassword, supabase } from '../services/dbService';
import { Lock, LogIn, Loader2 } from 'lucide-react';

/**
 * Si la base de datos está configurada, exige iniciar sesión antes de mostrar la app.
 * Sin configuración, la app funciona como antes (solo en este navegador).
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isDbConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isDbConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  // key: al cambiar de cuenta se reinicia la app y la sincronización
  return <React.Fragment key={session.user.id}>{children}</React.Fragment>;
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <img src="/logo.svg" alt="" className="w-10 h-10" />
          <div>
            <h1 className="text-base font-bold text-slate-900">ChequesPro</h1>
            <p className="text-xs text-slate-500">Inicia sesión para ver los datos compartidos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              required
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>Entrar</span>
          </button>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Las cuentas se crean desde el panel de Supabase.
          </p>
        </form>
      </div>
    </div>
  );
};
