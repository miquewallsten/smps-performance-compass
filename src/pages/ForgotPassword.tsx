import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/request-password-reset', { email });
      setSuccess(true);
    } catch (err: any) {
      // Even on error, show the same success message (prevents email enumeration)
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 smps-gradient-header opacity-90" />
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-card rounded-xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Correo Enviado</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Si existe una cuenta con el correo <strong>{email}</strong>, recibirá un enlace para restablecer su contraseña.
            </p>
            <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
              Volver a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-90" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary mb-4">
              <span className="text-primary-foreground font-display text-xl font-bold">SM<br/>PS</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Recuperar Contraseña</h1>
            <p className="text-muted-foreground text-sm mt-1">Ingrese su correo electrónico para recibir un enlace de restablecimiento.</p>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="usuario@smps.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
            </button>
          </form>
          <button onClick={() => navigate('/login')} className="w-full mt-3 py-2 text-sm text-accent hover:opacity-80 transition-opacity">
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
