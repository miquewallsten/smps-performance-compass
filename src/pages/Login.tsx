import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-90" />
      <div className="relative z-10 w-full max-w-md px-6 smps-fade-up">
        <div className="bg-card rounded-xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary mb-3">
              <span className="text-primary-foreground font-display text-lg font-bold leading-none">SM<br/>PS</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">SMPS Performance</h1>
            <p className="text-muted-foreground text-xs mt-1">Sistema de Evaluación de Desempeño</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow duration-150" placeholder="usuario@smps.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow duration-150" placeholder="••••••••" />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-150 active:scale-[0.98]">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <button onClick={() => navigate('/forgot-password')} className="w-full mt-3 py-2 text-sm text-accent hover:opacity-80 transition-opacity">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
