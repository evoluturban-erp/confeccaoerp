import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';

// ─── paleta ──────────────────────────────────────────────────────────────────
const B = {
  bg:     '#0c1628',
  bgMid:  '#0f1e38',
  blue:   '#2563eb',
  blueL:  '#60a5fa',
  text:   '#ffffff',
  muted:  'rgba(255,255,255,0.55)',
  card:   'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.12)',
  green:  '#16a34a',
};

// ─── Modal Confirmar Recebimento ──────────────────────────────────────────────
function ModalConfirmar({ lote, onConfirmar, onClose }) {
  const [obs, setObs]     = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await onConfirmar(lote, obs); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: B.bgMid, borderRadius: '20px 20px 0 0', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: B.text, fontSize: '1rem', fontWeight: 700 }}>Confirmar Recebimento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ background: B.card, borderRadius: 10, padding: '14px', border: `1px solid ${B.border}` }}>
          <p style={{ margin: 0, fontSize: '.78rem', color: B.muted }}>OP / Lote</p>
          <p style={{ margin: '3px 0 0', fontSize: '1rem', fontWeight: 700, color: B.text }}>{lote.numero || lote.id}</p>
          <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: B.muted }}>{lote.cliente_nome || ''} · {lote.descricao || ''}</p>
        </div>

        <div>
          <label style={{ fontSize: '.75rem', fontWeight: 700, color: B.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Observação (opcional)</label>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Alguma observação sobre o lote recebido?"
            rows={3}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${B.border}`, background: B.card, color: B.text, fontSize: '.9rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={submit} disabled={saving}
          style={{ padding: 16, background: saving ? '#374151' : B.green, color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Registrando...' : '✓ Confirmar recebimento'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal Devolução ──────────────────────────────────────────────────────────
function ModalDevolucao({ lote, onDevolver, onClose }) {
  const [form, setForm] = useState({ pecas: '', obs: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await onDevolver(lote, form); } finally { setSaving(false); }
  };

  const inp = { padding: '12px', borderRadius: 10, border: `1px solid ${B.border}`, background: B.card, color: B.text, fontSize: '.95rem', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: B.bgMid, borderRadius: '20px 20px 0 0', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: B.text, fontSize: '1rem', fontWeight: 700 }}>📤 Lançar Devolução</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ background: B.card, borderRadius: 10, padding: '14px', border: `1px solid ${B.border}` }}>
          <p style={{ margin: 0, fontSize: '.78rem', color: B.muted }}>Devolvendo lote</p>
          <p style={{ margin: '3px 0 0', fontSize: '1rem', fontWeight: 700, color: B.text }}>{lote.numero || lote.id}</p>
        </div>

        <div>
          <label style={{ fontSize: '.75rem', fontWeight: 700, color: B.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Peças devolvidas</label>
          <input type="number" min="0" value={form.pecas} onChange={e => setForm(f => ({ ...f, pecas: e.target.value }))}
            placeholder="Quantidade de peças" style={inp} />
        </div>

        <div>
          <label style={{ fontSize: '.75rem', fontWeight: 700, color: B.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Observação</label>
          <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
            placeholder="Ex: 2 peças com defeito separadas, etc." rows={3}
            style={{ ...inp, resize: 'none' }} />
        </div>

        <button onClick={submit} disabled={saving}
          style={{ padding: 16, background: saving ? '#374151' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Enviando...' : '📤 Confirmar devolução'}
        </button>
      </div>
    </div>
  );
}

// ─── Card de Lote ─────────────────────────────────────────────────────────────
function LoteCard({ lote, onConfirmar, onDevolver }) {
  const [expanded, setExpanded] = useState(false);

  const diasRestantes = (() => {
    if (!lote.data_entrega) return null;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const d = new Date(lote.data_entrega + 'T00:00');
    return Math.round((d - hoje) / 86400000);
  })();

  const urgencia = diasRestantes !== null && diasRestantes <= 2;

  return (
    <div style={{ background: B.card, borderRadius: 14, border: `1px solid ${urgencia ? 'rgba(239,68,68,.4)' : B.border}`, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(v => !v)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: urgencia ? 'rgba(239,68,68,.2)' : 'rgba(37,99,235,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          🧵
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: B.text }}>OP #{lote.numero || lote.id}</p>
            {urgencia && <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,.2)', color: '#f87171', fontSize: '.65rem', fontWeight: 700 }}>URGENTE</span>}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '.75rem', color: B.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lote.cliente_nome || 'sem cliente'}{lote.observacoes ? ` · ${lote.observacoes.slice(0, 30)}` : ''}
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          {diasRestantes !== null && (
            <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 700, color: urgencia ? '#f87171' : B.muted, textAlign: 'right' }}>
              {diasRestantes >= 0 ? `${diasRestantes}d` : `${Math.abs(diasRestantes)}d atraso`}
            </p>
          )}
          <p style={{ margin: '2px 0 0', fontSize: '1rem', textAlign: 'right' }}>{expanded ? '▲' : '▼'}</p>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${B.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lote.data_entrega && (
            <p style={{ margin: 0, fontSize: '.8rem', color: B.muted }}>
              Prazo: <strong style={{ color: urgencia ? '#f87171' : B.text }}>{new Date(lote.data_entrega + 'T00:00').toLocaleDateString('pt-BR')}</strong>
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={e => { e.stopPropagation(); onConfirmar(lote); }}
              style={{ padding: '13px', background: B.green, color: '#fff', border: 'none', borderRadius: 10, fontSize: '.88rem', fontWeight: 700, cursor: 'pointer' }}>
              ✓ Confirmar<br />recebimento
            </button>
            <button onClick={e => { e.stopPropagation(); onDevolver(lote); }}
              style={{ padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: '.88rem', fontWeight: 700, cursor: 'pointer' }}>
              📤 Lançar<br />devolução
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tela Início Faccao ───────────────────────────────────────────────────────
function TelaInicioFaccao({ user, lotes, onConfirmar, onDevolver }) {
  const urgentes  = lotes.filter(l => { if (!l.data_entrega) return false; const d = Math.round((new Date(l.data_entrega + 'T00:00') - new Date()) / 86400000); return d <= 2; });
  const normais   = lotes.filter(l => { if (!l.data_entrega) return true; const d = Math.round((new Date(l.data_entrega + 'T00:00') - new Date()) / 86400000); return d > 2; });
  const ordenados = [...urgentes, ...normais];

  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: '.8rem', color: B.muted }}>Facção</p>
        <h2 style={{ margin: '2px 0 0', color: B.text, fontSize: '1.3rem', fontWeight: 800 }}>{user?.nome?.split(' ')[0] || 'Facção'}</h2>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Em costura',  val: lotes.length,    icon: '🧵', cor: B.blueL },
          { label: 'Urgentes',    val: urgentes.length, icon: '⚠️', cor: '#f59e0b' },
          { label: 'Prazo médio', val: lotes.length > 0 ? `${Math.round(lotes.filter(l=>l.data_entrega).reduce((s,l)=>{const d=Math.round((new Date(l.data_entrega+'T00:00')-new Date())/86400000);return s+d;},0)/Math.max(1,lotes.filter(l=>l.data_entrega).length))}d` : '—', icon: '📅', cor: '#a78bfa' },
        ].map(k => (
          <div key={k.label} style={{ background: B.card, borderRadius: 12, padding: '12px 10px', border: `1px solid ${B.border}` }}>
            <p style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1 }}>{k.icon}</p>
            <p style={{ margin: '6px 0 2px', fontSize: '1.4rem', fontWeight: 800, color: k.cor }}>{k.val}</p>
            <p style={{ margin: 0, fontSize: '.65rem', color: B.muted }}>{k.label}</p>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: '.8rem', fontWeight: 700, color: B.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Lotes em produção ({lotes.length})
      </p>

      {lotes.length === 0
        ? <div style={{ background: B.card, borderRadius: 12, padding: '30px', textAlign: 'center', border: `1px solid ${B.border}` }}>
            <span style={{ fontSize: '2.5rem' }}>✓</span>
            <p style={{ margin: '8px 0 0', color: B.muted }}>Nenhum lote aguardando</p>
          </div>
        : ordenados.map(lote => (
          <LoteCard key={lote.id} lote={lote} onConfirmar={onConfirmar} onDevolver={onDevolver} />
        ))
      }
    </div>
  );
}

// ─── Tela Histórico Faccao ────────────────────────────────────────────────────
function TelaHistoricoFaccao({ historico }) {
  if (historico.length === 0) {
    return (
      <div style={{ padding: '30px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}>📋</span>
        <p style={{ color: B.muted, marginTop: 8 }}>Nenhuma ação registrada ainda.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '16px' }}>
      <p style={{ margin: '0 0 12px', fontSize: '.8rem', fontWeight: 700, color: B.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Histórico ({historico.length})
      </p>
      {historico.map((h, i) => (
        <div key={i} style={{ background: B.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${B.border}`, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>{h.tipo === 'Recebimento' ? '✓' : '📤'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: B.text }}>{h.descricao}</p>
              <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: B.muted }}>{h.data}</p>
            </div>
          </div>
          {h.obs && <p style={{ margin: '8px 0 0', fontSize: '.75rem', color: B.muted, borderTop: `1px solid ${B.border}`, paddingTop: 8, fontStyle: 'italic' }}>{h.obs}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Tela Perfil Faccao ───────────────────────────────────────────────────────
function TelaPerfil({ user, onLogout }) {
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: B.card, borderRadius: 16, padding: '24px', border: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
          {(user?.nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: B.text }}>{user?.nome || 'Facção'}</p>
          <p style={{ margin: '3px 0 0', fontSize: '.8rem', color: '#60a5fa', fontWeight: 600 }}>{user?.perfil || 'Faccao'}</p>
        </div>
      </div>

      <div style={{ background: B.card, borderRadius: 12, border: `1px solid ${B.border}`, overflow: 'hidden' }}>
        {[{ label: 'Login', value: user?.login }, { label: 'Perfil', value: user?.perfil }, { label: 'Status', value: user?.status || 'ativo' }]
          .map((item, i, arr) => (
            <div key={item.label} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${B.border}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: B.muted, fontSize: '.85rem' }}>{item.label}</span>
              <span style={{ color: B.text, fontSize: '.85rem', fontWeight: 600 }}>{item.value || '—'}</span>
            </div>
          ))}
      </div>

      <button onClick={onLogout}
        style={{ padding: '16px', background: 'rgba(220,38,38,.15)', color: '#f87171', border: '1px solid rgba(220,38,38,.25)', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
        Sair da conta
      </button>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function MobileFaccao() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]             = useState('lotes');
  const [confirmarLote, setConfirmarLote] = useState(null);
  const [devolverLote, setDevolverLote]   = useState(null);
  const [historico, setHistorico]         = useState([]);

  const { data: ordens = [] } = useApiQuery(
    ['ordens-faccao-mobile'],
    () => api.get('/ordens'),
    { refetchInterval: 60000 }
  );

  const lotes = ordens.filter(o => o.fase_atual === 'Costura');

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleConfirmar = async (lote, obs) => {
    try {
      await api.post('/coletas', {
        tipo: 'Recebimento',
        origem: 'Corte',
        destino: user?.nome || 'Facção',
        lote_codigo: `OP-${lote.numero || lote.id}`,
        observacao: obs || `Recebimento confirmado — OP ${lote.numero || lote.id}`,
      });
      setHistorico(h => [{ tipo: 'Recebimento', descricao: `OP #${lote.numero || lote.id} — ${lote.cliente_nome || ''}`, obs, data: new Date().toLocaleString('pt-BR') }, ...h]);
    } catch {
      alert('Erro ao registrar recebimento. Tente novamente.');
    } finally {
      setConfirmarLote(null);
    }
  };

  const handleDevolver = async (lote, { pecas, obs }) => {
    try {
      await api.post('/coletas', {
        tipo: 'Devolução',
        origem: user?.nome || 'Facção',
        destino: 'Qualidade',
        lote_codigo: `OP-${lote.numero || lote.id}`,
        observacao: `${pecas ? `${pecas} peças. ` : ''}${obs || ''}`.trim() || `Devolução — OP ${lote.numero || lote.id}`,
      });
      await api.post(`/ordens/${lote.id}/avancar-fase`).catch(() => {});
      setHistorico(h => [{ tipo: 'Devolução', descricao: `OP #${lote.numero || lote.id}${pecas ? ` · ${pecas} pcs` : ''}`, obs, data: new Date().toLocaleString('pt-BR') }, ...h]);
    } catch {
      alert('Erro ao registrar devolução. Tente novamente.');
    } finally {
      setDevolverLote(null);
    }
  };

  const navItems = [
    { id: 'inicio',    icon: '🏠', label: 'Início' },
    { id: 'lotes',     icon: '🧵', label: 'Lotes' },
    { id: 'devolver',  icon: '📤', label: 'Devolver' },
    { id: 'historico', icon: '📋', label: 'Histórico' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: B.bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background: B.bgMid, padding: '14px 16px 12px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🧵</div>
          <div>
            <p style={{ margin: 0, fontSize: '.65rem', color: B.muted, lineHeight: 1 }}>ConfecçãoERP</p>
            <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: B.text, lineHeight: 1.2 }}>{user?.nome?.split(' ')[0] || 'Facção'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ padding: '7px 14px', background: 'rgba(255,255,255,.08)', border: `1px solid ${B.border}`, borderRadius: 8, color: B.muted, fontSize: '.78rem', cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {(tab === 'inicio' || tab === 'lotes') && (
          <TelaInicioFaccao user={user} lotes={lotes} onConfirmar={setConfirmarLote} onDevolver={setDevolverLote} />
        )}
        {tab === 'devolver' && lotes.length > 0 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: '0 0 4px', fontSize: '.8rem', fontWeight: 700, color: B.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Selecione o lote para devolver
            </p>
            {lotes.map(lote => (
              <div key={lote.id} style={{ background: B.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: B.text }}>OP #{lote.numero || lote.id}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '.75rem', color: B.muted }}>{lote.cliente_nome || ''}</p>
                </div>
                <button onClick={() => setDevolverLote(lote)}
                  style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: '.85rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  📤 Devolver
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'devolver' && lotes.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>✓</span>
            <p style={{ color: B.muted, marginTop: 8 }}>Nenhum lote em produção.</p>
          </div>
        )}
        {tab === 'historico' && <TelaHistoricoFaccao historico={historico} />}
        {tab === 'perfil'    && <TelaPerfil user={user} onLogout={handleLogout} />}
      </div>

      {/* Navegação inferior */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: B.bgMid, borderTop: `1px solid ${B.border}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(item => (
          <button key={item.id}
            onClick={() => setTab(item.id)}
            style={{ flex: 1, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: '.62rem', fontWeight: tab === item.id ? 700 : 400, color: tab === item.id ? B.blueL : B.muted }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {confirmarLote && (
        <ModalConfirmar lote={confirmarLote} onConfirmar={handleConfirmar} onClose={() => setConfirmarLote(null)} />
      )}
      {devolverLote && (
        <ModalDevolucao lote={devolverLote} onDevolver={handleDevolver} onClose={() => setDevolverLote(null)} />
      )}
    </div>
  );
}
