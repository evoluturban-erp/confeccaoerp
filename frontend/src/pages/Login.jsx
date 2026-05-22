import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHome } from '../config/permissions';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const u = await login(form.usuario, form.senha);
      navigate(getHome(u?.perfil), { replace: true });
    } catch (err) {
      // backend retorna { error: "..." } — verificar ambos os campos
      const msg = err.response?.data?.error
        || err.response?.data?.message
        || (err.response ? `Erro ${err.response.status}` : 'Servidor indisponível — verifique se o backend está rodando.');
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '0.75rem 1rem',
    border: `1.5px solid ${focused === field ? '#16a34a' : '#e5e7eb'}`,
    borderRadius: '8px',
    fontSize: '0.95rem',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fafafa',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focused === field ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #031a0d 0%, #062414 25%, #0b2e1b 55%, #0f3522 80%, #143d27 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* blobs decorativos */}
      <div style={{
        position: 'absolute', top: '-150px', right: '-100px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', left: '-80px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '15%',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '2.75rem 2.5rem',
        width: '100%',
        maxWidth: '420px',
        margin: '1rem',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            fontSize: '30px', marginBottom: '1rem',
            boxShadow: '0 6px 20px rgba(22,163,74,0.35)',
          }}>
            🧵
          </div>
          <h1 style={{
            margin: '0 0 0.3rem',
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#0a2016',
            letterSpacing: '-0.5px',
          }}>
            ConfecçãoERP
          </h1>
          <p style={{
            margin: 0, fontSize: '0.75rem',
            color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Sistema de Gestão para Confecção
          </p>
        </div>

        {/* formulário */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1.125rem' }}>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: '700',
              color: '#4b5563', marginBottom: '0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Usuário
            </label>
            <input
              type="text"
              autoComplete="username"
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              onFocus={() => setFocused('usuario')}
              onBlur={() => setFocused('')}
              placeholder="Seu usuário ou e-mail"
              required
              style={inputStyle('usuario')}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: '700',
              color: '#4b5563', marginBottom: '0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Senha
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              onFocus={() => setFocused('senha')}
              onBlur={() => setFocused('')}
              placeholder="••••••••"
              required
              style={inputStyle('senha')}
            />
          </div>

          {erro && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', padding: '0.625rem 1rem', borderRadius: '8px',
              fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center',
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%', padding: '0.8rem',
              background: carregando
                ? '#86efac'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '0.95rem', fontWeight: '700', cursor: carregando ? 'not-allowed' : 'pointer',
              letterSpacing: '0.3px',
              boxShadow: carregando ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
              transition: 'opacity 0.2s',
            }}
          >
            {carregando ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: '0.72rem',
          color: '#d1d5db', marginTop: '2rem', marginBottom: 0,
        }}>
          ConfecçãoERP © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
