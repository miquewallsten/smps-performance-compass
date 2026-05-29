import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SetupPage() {
  const { initializeSystem } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await initializeSystem({ name, email, password, securityQuestion, securityAnswer });
    } catch (err: any) {
      setError(err.message || 'Error al inicializar el sistema');
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
            <h1 className="font-display text-2xl font-bold text-foreground">Configuración Inicial</h1>
            <p className="text-muted-foreground text-sm mt-1">Cree la cuenta de Super Administrador</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Pregunta de seguridad</label>
              <select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">Seleccione una pregunta</option>
                <option value="¿Cuál es el nombre de su primera mascota?">¿Cuál es el nombre de su primera mascota?</option>
                <option value="¿En qué ciudad nació?">¿En qué ciudad nació?</option>
                <option value="¿Cuál es el nombre de su escuela primaria?">¿Cuál es el nombre de su escuela primaria?</option>
                <option value="¿Cuál es su comida favorita?">¿Cuál es su comida favorita?</option>
                <option value="¿Cuál es el apellido de soltera de su madre?">¿Cuál es el apellido de soltera de su madre?</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Respuesta de seguridad</label>
              <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Configurando...' : 'Crear Super Administrador'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
