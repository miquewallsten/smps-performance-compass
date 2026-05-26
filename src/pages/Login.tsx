import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, getSecurityQuestion: getSecQ, resetPassword: resetPw } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'answer' | 'reset'>('email');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    try {
      const q = await getSecQ(forgotEmail);
      setSecurityQuestion(q);
      setForgotStep('answer');
    } catch (err: any) {
      setForgotError(err.message || 'No se encontró una cuenta con ese correo.');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    try {
      await resetPw(forgotEmail, securityAnswer, newPassword);
      setForgotSuccess('Contraseña restablecida exitosamente. Puede iniciar sesión.');
      setForgotStep('email');
      setShowForgot(false);
    } catch (err: any) {
      setForgotError(err.message || 'Respuesta incorrecta. Contacte al administrador.');
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 smps-gradient-header opacity-90" />
        <div className="relative z-10 w-full max-w-md px-6 smps-fade-up">
          <div className="bg-card rounded-xl shadow-2xl p-6">
            <h1 className="font-display text-xl font-bold text-foreground text-center mb-5">Recuperar Contraseña</h1>
            {forgotSuccess && <div className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2 mb-3">{forgotSuccess}</div>}
            {forgotError && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3">{forgotError}</div>}
            {forgotStep === 'email' && (
              <form onSubmit={handleGetQuestion} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Correo electrónico</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow duration-150" />
                </div>
                <button type="submit" className="w-full py-2 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-all duration-150 active:scale-[0.98]">Continuar</button>
                <button type="button" onClick={() => { setShowForgot(false); setForgotStep('email'); setForgotError(''); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Volver al inicio de sesión</button>
              </form>
            )}
            {forgotStep === 'answer' && (
              <form onSubmit={handleReset} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{securityQuestion}</label>
                  <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow duration-150" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nueva contraseña</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow duration-150" />
                </div>
                <button type="submit" className="w-full py-2 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-all duration-150 active:scale-[0.98]">Restablecer contraseña</button>
                <button type="button" onClick={() => { setForgotStep('email'); setForgotError(''); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Volver</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-40 transition-all duration-150 active:scale-[0.98]">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <button onClick={() => { setShowForgot(true); setForgotStep('email'); setForgotError(''); setForgotSuccess(''); }}
            className="w-full mt-3 py-2 text-sm text-accent hover:opacity-80 transition-opacity">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
