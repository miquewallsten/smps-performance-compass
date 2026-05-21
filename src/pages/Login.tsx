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

  // Forgot password state
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





  // Auth methods for password recovery
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
        <div className="absolute inset-0 smps-gradient-header opacity-95" />
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-card rounded-xl shadow-2xl p-8 animate-fade-in">
            <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">Recuperar Contraseña</h1>
            {forgotSuccess && <div className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2.5 mb-4">{forgotSuccess}</div>}
            {forgotError && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">{forgotError}</div>}
            {forgotStep === 'email' && (
              <form onSubmit={handleGetQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90">Continuar</button>
                <button type="button" onClick={() => { setShowForgot(false); setForgotStep('email'); setForgotError(''); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Volver al inicio de sesión</button>
              </form>
            )}
            {forgotStep === 'answer' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{securityQuestion}</label>
                  <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90">Restablecer contraseña</button>
                <button type="button" onClick={() => { setForgotStep('email'); setForgotError(''); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Volver</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 smps-gradient-header opacity-95" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card rounded-xl shadow-2xl p-8 animate-fade-in">
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="usuario@smps.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="••••••••" />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <button onClick={() => { setShowForgot(true); setForgotStep('email'); setForgotError(''); setForgotSuccess(''); }}
            className="w-full mt-4 py-2 text-sm text-accent hover:opacity-80">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
