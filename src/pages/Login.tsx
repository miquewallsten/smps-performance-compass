import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      setError('Credenciales incorrectas. Intente nuevamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-95" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card rounded-xl shadow-2xl p-8 animate-fade-in">
          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary mb-4">
              <span className="text-primary-foreground font-display text-xl font-bold">SM<br/>PS</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">SMPS Performance</h1>
            <p className="text-muted-foreground text-sm mt-1">Sistema de Evaluación de Desempeño</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@smps.com"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-accent bg-accent/10 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground font-medium mb-2">Usuarios de prueba:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Admin:</strong> cmendoza@smps.com / 1234</p>
              <p><strong>Asociado:</strong> rfigueroa@smps.com / 1234</p>
              <p><strong>Pasante:</strong> lhernandez@smps.com / 1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
