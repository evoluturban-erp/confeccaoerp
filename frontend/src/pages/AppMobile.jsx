import { useState, useEffect } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children, title, color = '#16a34a', icon }) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#1a1a1a', borderRadius: 40,
      padding: '12px 8px',
      boxShadow: '0 20px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.1)',
      border: '2px solid #2a2a2a',
    }}>
      {/* notch */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <div style={{ width: 80, height: 22, background: '#000', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a1a1a', border: '1.5px solid #333' }} />
          <div style={{ width: 40, height: 5, borderRadius: 3, background: '#1a1a1a', border: '1.5px solid #333' }} />
        </div>
      </div>
      {/* screen */}
      <div style={{ background: '#f1f5f9', borderRadius: 26, overflow: 'hidden', minHeight: 520 }}>
        {/* status bar */}
        <div style={{ background: color, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>{icon}</span>
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#fff' }}>{title}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['▂','▃','▅'].map((b, i) => <span key={i} style={{ fontSize: '.55rem', color: 'rgba(255,255,255,.8)' }}>{b}</span>)}
            <span style={{ fontSize: '.55rem', color: 'rgba(255,255,255,.8)', marginLeft: 2 }}>📶</span>
            <span style={{ fontSize: '.55rem', color: 'rgba(255,255,255,.8)' }}>🔋</span>
          </div>
        </div>
        {children}
      </div>
      {/* home bar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div style={{ width: 80, height: 4, background: '#333', borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ─── Transportador App ────────────────────────────────────────────────────────

function AppTransportador({ coletas }) {
  const hoje = coletas.filter(c => {
    const d = new Date(c.created_at);
    return d.toDateString() === new Date().toDateString();
  });
  const pendentes  = coletas.filter(c => c.status === 'pendente');
  const concluidas = coletas.filter(c => c.status === 'concluído');

  return (
    <PhoneFrame title="Transportador" color="#0891b2" icon="🚚">
      <div style={{ padding: '12px 12px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Hoje', val: hoje.length, cor: '#0891b2' },
            { label: 'Pendentes', val: pendentes.length, cor: '#d97706' },
            { label: 'Concluídas', val: concluidas.length, cor: '#16a34a' },
            { label: 'Total', val: coletas.length, cor: '#7c3aed' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: k.cor }}>{k.val}</p>
              <p style={{ margin: 0, fontSize: '.62rem', color: '#6b7280' }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* lista coletas */}
        <p style={{ margin: '0 0 6px', fontSize: '.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px' }}>Minhas coletas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {coletas.slice(0, 6).map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 700, color: '#111827' }}>{c.fornecedor_nome || c.origem || `Coleta #${i + 1}`}</p>
                <p style={{ margin: 0, fontSize: '.62rem', color: '#9ca3af' }}>{c.tipo || 'Coleta'} · {new Date(c.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}</p>
              </div>
              <span style={{
                fontSize: '.6rem', padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                background: c.status === 'concluído' ? '#f0fdf4' : c.status === 'pendente' ? '#fef3c7' : '#f3f4f6',
                color: c.status === 'concluído' ? '#16a34a' : c.status === 'pendente' ? '#d97706' : '#374151',
              }}>
                {c.status || 'pendente'}
              </span>
            </div>
          ))}
          {coletas.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.72rem', padding: '20px 0' }}>Nenhuma coleta</p>
          )}
        </div>

        {/* ação */}
        <button style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: '#fff', border: 'none', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>
          + Registrar coleta
        </button>
      </div>
    </PhoneFrame>
  );
}

// ─── Gerente App ──────────────────────────────────────────────────────────────

function AppGerente({ coletas }) {
  const stats = [
    { label: 'OPs abertas', val: 12, cor: '#7c3aed', icon: '📋' },
    { label: 'Em produção', val: 8,  cor: '#0891b2', icon: '⚙' },
    { label: 'Concluídas',  val: 4,  cor: '#16a34a', icon: '✓' },
    { label: 'Atrasadas',   val: 2,  cor: '#dc2626', icon: '⚠' },
  ];

  const movs = coletas.slice(0, 5);

  return (
    <PhoneFrame title="Gerente" color="#7c3aed" icon="👔">
      <div style={{ padding: '12px 12px' }}>
        {/* stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: s.cor, lineHeight: 1 }}>{s.val}</p>
                <p style={{ margin: 0, fontSize: '.58rem', color: '#6b7280', lineHeight: 1.2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* gráfico de barras simples */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '.68rem', fontWeight: 700, color: '#374151' }}>Produção por fase</p>
          {[
            { label: 'Corte', val: 30, cor: '#0891b2' },
            { label: 'Costura', val: 55, cor: '#7c3aed' },
            { label: 'Acabamento', val: 70, cor: '#d97706' },
            { label: 'Revisão', val: 45, cor: '#db2777' },
          ].map(b => (
            <div key={b.label} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: '.6rem', color: '#6b7280' }}>{b.label}</span>
                <span style={{ fontSize: '.6rem', color: '#374151', fontWeight: 600 }}>{b.val}%</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 999, height: 5 }}>
                <div style={{ height: '100%', width: `${b.val}%`, background: b.cor, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* movimentações */}
        <p style={{ margin: '0 0 6px', fontSize: '.68rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px' }}>Movimentações recentes</p>
        {movs.length === 0
          ? <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.7rem', padding: '10px 0' }}>Sem movimentações</p>
          : movs.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', flexShrink: 0 }}>🚛</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '.68rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.fornecedor_nome || m.origem || `Registro #${i + 1}`}</p>
                <p style={{ margin: 0, fontSize: '.6rem', color: '#9ca3af' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))
        }
      </div>
    </PhoneFrame>
  );
}

// ─── Facção App ───────────────────────────────────────────────────────────────

function AppFaccao() {
  const ops = [
    { num: '2024-001', cliente: 'Loja ABC', pcs: 150, fase: 'Costura', pct: 65 },
    { num: '2024-003', cliente: 'Moda Sol', pcs: 80,  fase: 'Costura', pct: 30 },
    { num: '2024-005', cliente: 'Fashion X', pcs: 200, fase: 'Acabamento', pct: 10 },
  ];

  return (
    <PhoneFrame title="Facção" color="#16a34a" icon="🧵">
      <div style={{ padding: '12px 12px' }}>
        {/* minha produção */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'OPs ativas', val: ops.length, cor: '#16a34a' },
            { label: 'Peças tot.', val: ops.reduce((s, o) => s + o.pcs, 0), cor: '#0891b2' },
            { label: 'Revisões', val: 0, cor: '#d97706' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '7px 8px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: k.cor, lineHeight: 1 }}>{k.val}</p>
              <p style={{ margin: 0, fontSize: '.58rem', color: '#6b7280', lineHeight: 1.3 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* OPs da facção */}
        <p style={{ margin: '0 0 8px', fontSize: '.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px' }}>Minhas OPs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ops.map(op => (
            <div key={op.num} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '.65rem', fontFamily: 'monospace', color: '#6b7280' }}>#{op.num}</span>
                <span style={{ fontSize: '.6rem', padding: '2px 6px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>{op.fase}</span>
              </div>
              <p style={{ margin: '0 0 2px', fontSize: '.75rem', fontWeight: 700, color: '#111827' }}>{op.cliente}</p>
              <p style={{ margin: '0 0 6px', fontSize: '.65rem', color: '#6b7280' }}>{op.pcs} peças</p>
              <div style={{ background: '#f1f5f9', borderRadius: 999, height: 5 }}>
                <div style={{ height: '100%', width: `${op.pct}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius: 999 }} />
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '.6rem', color: '#9ca3af', textAlign: 'right' }}>{op.pct}% concluído</p>
            </div>
          ))}
        </div>

        {/* reportar progresso */}
        <button style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>
          📸 Reportar progresso
        </button>
      </div>
    </PhoneFrame>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AppMobile() {
  const [abaAtiva, setAbaAtiva] = useState(0);

  const { data: coletas = [], isLoading } = useApiQuery(['coletas-mobile'], () => api.get('/coletas'));

  const ABAS = ['Transportador', 'Gerente', 'Facção'];
  const CORES = ['#0891b2', '#7c3aed', '#16a34a'];
  const ICONS = ['🚚', '👔', '🧵'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>📱 App Mobile — Prévia</h2>
        <p style={{ margin: 0, fontSize: '.82rem', color: '#6b7280' }}>
          Visualize a interface do app para cada perfil de usuário. O aplicativo complementa o ERP com acesso offline e funcionalidades de campo.
        </p>
      </div>

      {/* KPIs gerais de coletas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Coletas hoje', val: coletas.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, cor: '#0891b2', icon: '🚚' },
          { label: 'Pendentes', val: coletas.filter(c => c.status === 'pendente').length, cor: '#d97706', icon: '⏳' },
          { label: 'Concluídas', val: coletas.filter(c => c.status === 'concluído').length, cor: '#16a34a', icon: '✓' },
          { label: 'Total registros', val: coletas.length, cor: '#7c3aed', icon: '📊' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.1rem' }}>{k.icon}</span>
              <span style={{ fontSize: '.72rem', color: '#6b7280', fontWeight: 600 }}>{k.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: k.cor, lineHeight: 1 }}>
              {isLoading ? '…' : k.val}
            </p>
          </div>
        ))}
      </div>

      {/* seletor de perfil */}
      <div style={{ display: 'flex', gap: 8 }}>
        {ABAS.map((a, i) => (
          <button
            key={a}
            onClick={() => setAbaAtiva(i)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '.82rem', fontWeight: abaAtiva === i ? 700 : 400,
              background: abaAtiva === i ? CORES[i] : '#fff',
              color: abaAtiva === i ? '#fff' : '#6b7280',
              boxShadow: abaAtiva === i ? `0 2px 8px ${CORES[i]}40` : '0 1px 4px rgba(0,0,0,.07)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {ICONS[i]} {a}
          </button>
        ))}
      </div>

      {/* frames dos apps */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', overflowX: 'auto', padding: '8px 0 16px' }}>
        {abaAtiva === 0 && <AppTransportador coletas={coletas} />}
        {abaAtiva === 1 && <AppGerente coletas={coletas} />}
        {abaAtiva === 2 && <AppFaccao />}

        {/* info card ao lado */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', minWidth: 260, alignSelf: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: CORES[abaAtiva] + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 12 }}>
            {ICONS[abaAtiva]}
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 700, color: '#111827' }}>Perfil: {ABAS[abaAtiva]}</h3>
          <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: '#6b7280', lineHeight: 1.5 }}>
            {abaAtiva === 0
              ? 'Acesso a coletas, entregas, rotas e registro de OCorrências. Funciona offline com sincronização automática.'
              : abaAtiva === 1
              ? 'Visão gerencial de produção, KPIs em tempo real, aprovações e relatórios resumidos.'
              : 'Visualização das OPs atribuídas, reporte de progresso por fase e comunicação com o escritório.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(abaAtiva === 0
              ? ['Registrar coleta/entrega', 'Ver rota no mapa', 'Assinar digitalmente', 'Modo offline']
              : abaAtiva === 1
              ? ['Dashboard em tempo real', 'Aprovar OPs', 'Alertas de atraso', 'Relatórios resumidos']
              : ['Ver OPs atribuídas', 'Reportar progresso', 'Enviar fotos', 'Registro de defeitos']
            ).map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: CORES[abaAtiva] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', color: CORES[abaAtiva], fontWeight: 700, flexShrink: 0 }}>✓</div>
                <span style={{ fontSize: '.78rem', color: '#374151' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* histórico de movimentações */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827' }}>
            Histórico de Movimentações Mobile
            <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '.75rem', color: '#6b7280' }}>{coletas.length} registros</span>
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Tipo', 'Origem/Destino', 'Status', 'Transportador', 'Data'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Carregando...</td></tr>
                : coletas.length === 0
                ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma movimentação registrada pelo app.</td></tr>
                : coletas.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: '.82rem' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '.72rem', fontWeight: 600, background: '#cffafe', color: '#0891b2' }}>
                        {c.tipo || 'Coleta'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '.82rem', color: '#374151' }}>{c.fornecedor_nome || c.origem || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 999, fontSize: '.72rem', fontWeight: 600,
                        background: c.status === 'concluído' ? '#f0fdf4' : '#fef3c7',
                        color: c.status === 'concluído' ? '#16a34a' : '#d97706',
                      }}>
                        {c.status || 'pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '.82rem', color: '#6b7280' }}>{c.transportador_nome || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '.78rem', color: '#9ca3af' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
