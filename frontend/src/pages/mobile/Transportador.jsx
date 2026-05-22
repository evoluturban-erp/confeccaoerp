import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';

// ─── paleta ──────────────────────────────────────────────────────────────────
const G = {
  bg:     '#071e0f',
  bgMid:  '#0b2e1b',
  green:  '#16a34a',
  greenL: '#22c55e',
  text:   '#ffffff',
  muted:  'rgba(255,255,255,0.55)',
  card:   'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.12)',
};

// ─── QR Scanner ──────────────────────────────────────────────────────────────
function QRScanner({ onResult, onClose }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const [msg, setMsg] = useState('Aponte para o QR Code');
  const [erro, setErro] = useState('');

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const hasBD = 'BarcodeDetector' in window;
        if (!hasBD) { setErro('BarcodeDetector não suportado neste navegador. Use o modo manual.'); return; }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        const loop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
          try {
            const found = await detector.detect(videoRef.current);
            if (found.length) { stop(); onResult(found[0].rawValue); return; }
          } catch { /* ignore */ }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => setErro('Câmera não disponível. Use o modo manual.'));

    return stop;
  }, [onResult, stop]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: G.bg }}>
        <button onClick={() => { stop(); onClose(); }} style={{ background: 'none', border: 'none', color: G.text, fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px 4px 0' }}>←</button>
        <span style={{ color: G.text, fontWeight: 700, fontSize: '1rem', marginLeft: 8 }}>Escanear QR Code</span>
      </div>

      <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden' }}>
        {erro
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, gap: 16 }}>
              <span style={{ fontSize: '3rem' }}>📷</span>
              <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '.9rem' }}>{erro}</p>
            </div>
          )
          : (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* mira */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 220, height: 220, border: '3px solid #22c55e', borderRadius: 16, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
              </div>
              <p style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: '#22c55e', fontSize: '.85rem', fontWeight: 600 }}>{msg}</p>
            </>
          )
        }
      </div>

      <div style={{ padding: '16px', background: G.bg }}>
        <button onClick={() => { stop(); onClose(); }} style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.08)', color: G.text, border: `1px solid ${G.border}`, borderRadius: 12, fontSize: '.95rem', fontWeight: 600, cursor: 'pointer' }}>
          ✏️ Digitar código manualmente
        </button>
      </div>
    </div>
  );
}

// ─── Modal Nova Coleta ────────────────────────────────────────────────────────
function ModalColeta({ inicial, onSalvar, onClose }) {
  const [form, setForm] = useState({
    tipo: 'Coleta',
    lote_codigo: inicial?.lote_codigo || '',
    origem: inicial?.origem || '',
    destino: inicial?.destino || '',
    observacao: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.origem || !form.destino) { alert('Origem e destino são obrigatórios'); return; }
    setSaving(true);
    try {
      await onSalvar({ tipo: form.tipo, origem: form.origem, destino: form.destino, lote_codigo: form.lote_codigo, observacao: form.observacao });
    } finally {
      setSaving(false);
    }
  };

  const inp = { padding: '13px 14px', borderRadius: 10, border: `1px solid ${G.border}`, background: G.card, color: G.text, fontSize: '.95rem', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '.75rem', fontWeight: 700, color: G.muted, marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 9000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: G.bgMid, borderRadius: '20px 20px 0 0', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, color: G.text, fontSize: '1.1rem', fontWeight: 700 }}>Nova Coleta</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: G.muted, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Tipo', field: 'tipo', options: ['Coleta','Entrega','Devolução','Transferência'] },
          ].map(({ label, field, options }) => (
            <div key={field} style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>{label}</label>
              <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{ ...inp, background: G.card }}>
                {options.map(o => <option key={o} value={o} style={{ background: '#0b2e1b' }}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {[
          { label: 'Código do lote', field: 'lote_codigo', placeholder: 'Ex: OP-001-COR' },
          { label: 'Origem *',       field: 'origem',      placeholder: 'De onde sai' },
          { label: 'Destino *',      field: 'destino',     placeholder: 'Para onde vai' },
          { label: 'Observação',     field: 'observacao',  placeholder: 'Opcional' },
        ].map(({ label, field, placeholder }) => (
          <div key={field}>
            <label style={lbl}>{label}</label>
            <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder} style={inp} />
          </div>
        ))}

        <button onClick={submit} disabled={saving}
          style={{ padding: 16, background: saving ? '#374151' : G.green, color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4 }}>
          {saving ? 'Salvando...' : '✓ Registrar Coleta'}
        </button>
      </div>
    </div>
  );
}

// ─── Tela Início ─────────────────────────────────────────────────────────────
function TelaInicio({ user, coletas, onScan, onManual, onNovaColeta }) {
  const hoje = coletas.filter(c => new Date(c.data || c.created_at).toDateString() === new Date().toDateString());
  const minhas = hoje.filter(c => c.usuario_id === user?.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 0' }}>
      {/* saudação */}
      <div>
        <p style={{ margin: 0, fontSize: '.8rem', color: G.muted }}>Bom dia,</p>
        <h2 style={{ margin: '2px 0 0', color: G.text, fontSize: '1.3rem', fontWeight: 800 }}>{user?.nome?.split(' ')[0] || 'Transportador'}</h2>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Hoje',      val: minhas.length,      icon: '🚚', cor: G.greenL },
          { label: 'Pendentes', val: coletas.filter(c => !c.concluida).length, icon: '⏳', cor: '#f59e0b' },
          { label: 'Total',     val: coletas.length,     icon: '📦', cor: '#60a5fa' },
        ].map(k => (
          <div key={k.label} style={{ background: G.card, borderRadius: 12, padding: '12px 10px', border: `1px solid ${G.border}` }}>
            <p style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1 }}>{k.icon}</p>
            <p style={{ margin: '6px 0 2px', fontSize: '1.5rem', fontWeight: 800, color: k.cor }}>{k.val}</p>
            <p style={{ margin: 0, fontSize: '.65rem', color: G.muted }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* botões de ação */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onScan}
          style={{ padding: '18px 20px', background: G.green, color: '#fff', border: 'none', borderRadius: 14, fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 20px rgba(22,163,74,.4)' }}>
          <span style={{ fontSize: '1.4rem' }}>📷</span> Escanear QR Code
        </button>
        <button onClick={onManual}
          style={{ padding: '16px 20px', background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 14, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>✏️</span> Digitar código manualmente
        </button>
        <button onClick={onNovaColeta}
          style={{ padding: '16px 20px', background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 14, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>＋</span> Registrar coleta manualmente
        </button>
      </div>

      {/* tarefas do dia */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: '.8rem', fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Tarefas do dia ({minhas.length})
        </p>
        {minhas.length === 0
          ? <div style={{ background: G.card, borderRadius: 12, padding: '20px', textAlign: 'center', border: `1px solid ${G.border}` }}>
              <p style={{ margin: 0, color: G.muted, fontSize: '.9rem' }}>Nenhuma tarefa registrada hoje</p>
            </div>
          : minhas.slice(0, 5).map((c, i) => (
            <div key={c.id || i} style={{ background: G.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${G.border}`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🚚</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.origem || '?'} → {c.destino || '?'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: G.muted }}>
                  {c.tipo || 'Coleta'}{c.lote_codigo ? ` · ${c.lote_codigo}` : ''}
                </p>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '.68rem', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', flexShrink: 0 }}>✓</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Tela Histórico ───────────────────────────────────────────────────────────
function TelaHistorico({ coletas, user }) {
  const minhas = coletas.filter(c => c.usuario_id === user?.id);

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ margin: '0 0 12px', fontSize: '.8rem', fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Histórico ({minhas.length})
      </p>
      {minhas.length === 0
        ? <div style={{ background: G.card, borderRadius: 12, padding: '30px', textAlign: 'center' }}>
            <p style={{ color: G.muted, margin: 0 }}>Nenhuma coleta registrada</p>
          </div>
        : minhas.map((c, i) => (
          <div key={c.id || i} style={{ background: G.card, borderRadius: 12, padding: '14px 16px', border: `1px solid ${G.border}`, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: G.text }}>{c.origem || '?'} → {c.destino || '?'}</p>
                <p style={{ margin: '3px 0 0', fontSize: '.72rem', color: G.muted }}>
                  {c.tipo || 'Coleta'}{c.lote_codigo ? ` · ${c.lote_codigo}` : ''}{c.op_numero ? ` · OP ${c.op_numero}` : ''}
                </p>
                {c.observacao && <p style={{ margin: '3px 0 0', fontSize: '.72rem', color: G.muted, fontStyle: 'italic' }}>{c.observacao}</p>}
              </div>
              <p style={{ margin: 0, fontSize: '.68rem', color: G.muted, flexShrink: 0 }}>
                {new Date(c.data || c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── Tela Perfil ──────────────────────────────────────────────────────────────
function TelaPerfil({ user, onLogout }) {
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: G.card, borderRadius: 16, padding: '24px', border: `1px solid ${G.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
          {(user?.nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: G.text }}>{user?.nome || 'Transportador'}</p>
          <p style={{ margin: '3px 0 0', fontSize: '.8rem', color: '#22c55e', fontWeight: 600 }}>{user?.perfil || 'Transportador'}</p>
        </div>
      </div>

      <div style={{ background: G.card, borderRadius: 12, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
        {[
          { label: 'Login',  value: user?.login || '—' },
          { label: 'Perfil', value: user?.perfil || '—' },
          { label: 'Status', value: user?.status || 'ativo' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${G.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: G.muted, fontSize: '.85rem' }}>{item.label}</span>
            <span style={{ color: G.text, fontSize: '.85rem', fontWeight: 600 }}>{item.value}</span>
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
export default function MobileTransportador() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]             = useState('inicio');
  const [scanner, setScanner]     = useState(false);
  const [manualModal, setManual]  = useState(false);
  const [codigoManual, setCodigo] = useState('');
  const [coletaForm, setColetaForm] = useState(null); // form pré-preenchido

  const { data: coletas = [], refetch } = useApiQuery(
    ['coletas-transp-mobile'],
    () => api.get('/coletas'),
    { refetchInterval: 30000 }
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCode = (code) => {
    const parts = {};
    code.split('|').forEach(p => {
      const [k, ...rest] = p.split(':');
      if (k) parts[k.trim()] = rest.join(':').trim();
    });
    setColetaForm({
      lote_codigo: parts.COLETA || parts.COD || code,
      origem: parts.ORI || parts.ORIGEM || '',
      destino: parts.DST || parts.DESTINO || '',
    });
  };

  const salvarColeta = async (dados) => {
    await api.post('/coletas', dados);
    await refetch();
    setColetaForm(null);
    setTab('historico');
  };

  const navItems = [
    { id: 'inicio',    icon: '🏠', label: 'Início' },
    { id: 'scan',      icon: '📷', label: 'Scan' },
    { id: 'historico', icon: '📋', label: 'Histórico' },
    { id: 'perfil',    icon: '👤', label: 'Perfil' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: G.bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background: G.bgMid, padding: '14px 16px 12px', borderBottom: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🚚</div>
          <div>
            <p style={{ margin: 0, fontSize: '.65rem', color: G.muted, lineHeight: 1 }}>ConfecçãoERP</p>
            <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: G.text, lineHeight: 1.2 }}>{user?.nome?.split(' ')[0] || 'Transportador'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ padding: '7px 14px', background: 'rgba(255,255,255,.08)', border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted, fontSize: '.78rem', cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {tab === 'inicio' && (
          <TelaInicio
            user={user}
            coletas={coletas}
            onScan={() => setScanner(true)}
            onManual={() => setManual(true)}
            onNovaColeta={() => setColetaForm({})}
          />
        )}
        {tab === 'scan' && (
          <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '4rem' }}>📷</span>
            <p style={{ margin: 0, color: G.text, fontWeight: 700, fontSize: '1.1rem' }}>Escanear ou digitar código</p>
            <p style={{ margin: 0, color: G.muted, textAlign: 'center', fontSize: '.85rem' }}>Use a câmera para ler um QR Code ou digite o código manualmente.</p>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button onClick={() => setScanner(true)}
                style={{ padding: '18px', background: G.green, color: '#fff', border: 'none', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(22,163,74,.4)' }}>
                📷 Abrir câmera
              </button>
              <button onClick={() => setManual(true)}
                style={{ padding: '16px', background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 14, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Digitar código
              </button>
            </div>
          </div>
        )}
        {tab === 'historico' && <TelaHistorico coletas={coletas} user={user} />}
        {tab === 'perfil'    && <TelaPerfil user={user} onLogout={handleLogout} />}
      </div>

      {/* Navegação inferior */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: G.bgMid, borderTop: `1px solid ${G.border}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(item => {
          const active = (item.id === 'scan' && scanner) || (!scanner && tab === item.id);
          return (
            <button key={item.id}
              onClick={() => { setScanner(false); setManual(false); setTab(item.id); if (item.id === 'scan') setScanner(true); }}
              style={{ flex: 1, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'opacity .15s' }}>
              <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '.62rem', fontWeight: tab === item.id ? 700 : 400, color: tab === item.id ? G.greenL : G.muted }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* QR Scanner overlay */}
      {scanner && (
        <QRScanner
          onResult={code => { setScanner(false); handleCode(code); }}
          onClose={() => setScanner(false)}
        />
      )}

      {/* Modal código manual */}
      {manualModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: G.bgMid, borderRadius: '20px 20px 0 0', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, color: G.text, fontSize: '1rem', fontWeight: 700 }}>Digitar código</h3>
              <button onClick={() => { setManual(false); setCodigo(''); }} style={{ background: 'none', border: 'none', color: G.muted, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <input
              autoFocus
              value={codigoManual}
              onChange={e => setCodigo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && codigoManual) { handleCode(codigoManual); setManual(false); setCodigo(''); } }}
              placeholder="Ex: OP-001-BRANCO ou código do lote"
              style={{ padding: '14px', borderRadius: 10, border: `1px solid ${G.border}`, background: G.card, color: G.text, fontSize: '1rem', outline: 'none' }}
            />
            <button
              onClick={() => { if (codigoManual) { handleCode(codigoManual); setManual(false); setCodigo(''); } }}
              disabled={!codigoManual}
              style={{ padding: '16px', background: codigoManual ? G.green : '#374151', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: codigoManual ? 'pointer' : 'not-allowed' }}>
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Modal coleta */}
      {coletaForm !== null && (
        <ModalColeta
          inicial={coletaForm}
          onSalvar={salvarColeta}
          onClose={() => setColetaForm(null)}
        />
      )}
    </div>
  );
}
