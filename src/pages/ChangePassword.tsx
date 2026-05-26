import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('¿Cuál es su correo electrónico?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!securityAnswer.trim()) {
      setError('Debe configurar una pregunta de seguridad');
      return;
    }

    setLoading(true);
    try {
      await changePassword('', newPassword, securityQuestion, securityAnswer);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-95" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card rounded-xl shadow-2xl p-8 smps-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary mb-4">
              <span className="text-primary-foreground font-display text-xl font-bold">SM<br/>PS</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Cambio de Contraseña</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bienvenido, {user?.name}. Por seguridad, debe cambiar su contraseña antes de continuar.
            </p>
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Repita la contraseña" />
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm font-medium text-foreground mb-3">Configurar pregunta de seguridad</p>
              <p className="text-xs text-muted-foreground mb-3">Esta pregunta le permitirá recuperar su contraseña si la olvida.</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{securityQuestion}</label>
                <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Su respuesta" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-[opacity,transform] duration-150 ease-out active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Guardando...' : 'Cambiar Contraseña y Continuar'}
            </button>
          </form>

          <button onClick={() => { logout(); window.location.href = '/login'; }}
            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
