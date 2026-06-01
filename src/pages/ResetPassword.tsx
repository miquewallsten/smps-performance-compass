import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [completed, setCompleted] = useState(false);

  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) {
      setError('Token de restablecimiento no proporcionado.');
      setVerifying(false);
      return;
    }
    api.get<{ email?: string; name?: string; error?: string }>(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setValidToken(true);
        setUserEmail(data.email || '');
        setUserName(data.name || '');
      })
      .catch((err) => {
        setError(err.message || 'Token de restablecimiento inválido o expirado.');
        setValidToken(false);
      })
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('La contraseña debe contener al menos una letra mayúscula');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('La contraseña debe contener al menos una letra minúscula');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('La contraseña debe contener al menos un número');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/complete-password-reset', { token, newPassword, confirmPassword });
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 smps-gradient-header opacity-90" />
        <div className="relative z-10 text-white text-lg">Verificando enlace...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 smps-gradient-header opacity-90" />
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-card rounded-xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Contraseña Restablecida</h1>
            <p className="text-muted-foreground text-sm mb-6">Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesión con su nueva contraseña.</p>
            <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 smps-gradient-header opacity-90" />
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-card rounded-xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-destructive/10 mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Enlace Expirado</h1>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/forgot-password')} className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
              Solicitar Nuevo Enlace
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
            <h1 className="font-display text-2xl font-bold text-foreground">Nueva Contraseña</h1>
            {userName && <p className="text-muted-foreground text-sm mt-1">Hola, {userName}</p>}
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Repita la contraseña" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
