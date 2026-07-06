import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login({ setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!email || !password) {
      setFeedback({ type: 'error', message: 'Por favor, preencha o e-mail e a senha!' });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao logar: E-mail ou senha incorretos.' });
    } else {
      setView('home');
    }
  };

  return (
    <section className="view-section active">
      <div className="auth-container">
        <h2 className="auth-title">Bem-vindo de volta!</h2>

        {feedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '18px',
              background: feedback.type === 'error' ? '#fff3f3' : '#f1f7ea',
              color: feedback.type === 'error' ? '#d96b6b' : '#6a8c3a',
              border: `1px solid ${feedback.type === 'error' ? '#fcdede' : '#dcedc8'}`,
              fontWeight: '500',
              fontSize: '0.95rem',
              textAlign: 'center'
            }}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-submit">Entrar</button>
          <p style={{marginTop: '1rem', textAlign: 'center'}}>
            Não tem conta? <span onClick={() => setView('register')} style={{color:'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Cadastre-se</span>
          </p>
        </form>
      </div>
    </section>
  );
}