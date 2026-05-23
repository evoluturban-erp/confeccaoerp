import { useState, useEffect, useRef } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const COLUNAS = [
  { fase: 'Corte',      label: 'Corte',      icon: '✂',  cor: '#0891b2', bg: '#cffafe' },
  { fase: 'Costura',    label: 'Costura',     icon: '🧵', cor: '#7c3aed', bg: '#ede9fe' },
  { fase: 'Aplicação',  label: 'Aplicação',   icon: '🎨', cor: '#ec4899', bg: '#fdf2f8' },
  { fase: 'Acabamento', label: 'Acabamento',  icon: '⚙',  cor: '#d97706', bg: '#fef3c7' },
  { fase: 'Revisão',    label: 'Qualidade',   icon: '✓',  cor: '#16a34a', bg: '#f0fdf4' },
  { fase: 'Expedição',  label: 'Expedição',   icon: '🚚', cor: '#ea580c', bg: '#ffedd5' },
];

function totalPecas(op) {
  if (!op.grade) return op.quantidade || 0;
  return Object.values(op.grade).reduce((s, t) =>
    s + Object.values(t).reduce((a, b) => a + (Number(b) || 0), 0), 0);
}

function progresso(op) {
  const FASES = ['Cadastrada','Corte','Costura','Aplicação','Acabamento','Revisão','Expedição','Concluída'];
  const idx = FASES.indexOf(op.fase_atual);
  return idx < 0 ? 0 : Math.round((idx / (FASES.length - 1)) * 100);
}

function dias(op) {
  const d = Math.floor((Date.now() - new Date(op.data_inicio || op.created_at)) / 86400000);
  return d;
}

function KanbanCard({ op }) {
  const pct = progresso(op);
  const d   = dias(op);
  const pcs = totalPecas(op);
  const cor = d > 7 ? '#dc2626' : d > 3 ? '#d97706' : '#16a34a';
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,.08)', border: '1px solid #f1f5f9',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', fontFamily: 'monospace' }}>
          #{op.numero}
        </span>
        <span style={{ fontSize: '.68rem', padding: '2px 7px', borderRadius: 999, background: cor + '15', color: cor, fontWeight: 700 }}>
          {d === 0 ? 'hoje' : `${d}d`}
        </span>
      </div>
      <p style={{ margin: '0 0 3px', fontSize: '.82rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
        {op.cliente_nome || '—'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: '.75rem', color: '#6b7280' }}>
        {op.descricao || 'Sem descrição'}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: '.68rem', padding: '1px 6px', borderRadius: 999, background: '#f3f4f6', color: '#374151', fontWeight: 600 }}>
          {pcs} pcs
        </span>
        {op.faccao_nome && (
          <span style={{ fontSize: '.68rem', padding: '1px 6px', borderRadius: 999, background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>
            {op.faccao_nome}
          </span>
        )}
        {op.data_entrega && (
          <span style={{ fontSize: '.68rem', padding: '1px 6px', borderRadius: 999, background: '#fef3c7', color: '#d97706', fontWeight: 600 }}>
            ent. {new Date(op.data_entrega).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}
          </span>
        )}
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: 999, height: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius: 999, transition: 'width .3s' }} />
      </div>
      <p style={{ margin: '3px 0 0', fontSize: '.65rem', color: '#9ca3af', textAlign: 'right' }}>{pct}%</p>
    </div>
  );
}

function TVOverlay({ ordens, onClose }) {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#030f06', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header TV */}
      <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(34,197,94,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🧵</span>
          <div>
            <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: '#22c55e' }}>ConfecçãoERP</p>
            <p style={{ margin: 0, fontSize: '.65rem', color: 'rgba(255,255,255,.35)' }}>Kanban de Produção</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>
            {hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p style={{ margin: 0, fontSize: '.7rem', color: 'rgba(255,255,255,.4)', textTransform: 'capitalize' }}>
            {hora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', fontSize: '.8rem', cursor: 'pointer' }}>
          ✕ Fechar
        </button>
      </div>

      {/* colunas */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${COLUNAS.length},1fr)`, gap: 0, overflow: 'hidden' }}>
        {COLUNAS.map((col, ci) => {
          const cards = ordens.filter(o => o.fase_atual === col.fase);
          return (
            <div key={col.fase} style={{
              borderRight: ci < COLUNAS.length - 1 ? '1px solid rgba(34,197,94,.1)' : 'none',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>{col.icon}</span>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: col.cor, textTransform: 'uppercase', letterSpacing: '.5px' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '.72rem', padding: '2px 8px', borderRadius: 999, background: col.cor + '22', color: col.cor, fontWeight: 700 }}>{cards.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(34,197,94,.2) transparent' }}>
                {cards.map(op => (
                  <TVCard key={op.id} op={op} col={col} />
                ))}
                {cards.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.15)', fontSize: '.75rem', marginTop: 24 }}>Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TVCard({ op, col }) {
  const pcs = totalPecas(op);
  const d   = dias(op);
  const pct = progresso(op);
  const cor = d > 7 ? '#ef4444' : d > 3 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{
      background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
      borderLeft: `3px solid ${col.cor}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }}>#{op.numero}</span>
        <span style={{ fontSize: '.65rem', color: cor, fontWeight: 700 }}>{d === 0 ? 'hoje' : `${d}d`}</span>
      </div>
      <p style={{ margin: '0 0 2px', fontSize: '.8rem', fontWeight: 700, color: '#fff' }}>{op.cliente_nome || '—'}</p>
      <p style={{ margin: '0 0 6px', fontSize: '.68rem', color: 'rgba(255,255,255,.4)' }}>{pcs} peças{op.faccao_nome ? ` · ${op.faccao_nome}` : ''}</p>
      <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 999, height: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col.cor, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function Kanban() {
  const { setAction, clearAction } = useTopbar();
  const [tvMode, setTvMode] = useState(false);
  const [filtroFaccao, setFiltroFaccao] = useState('');

  const { data: ordens = [], isLoading } = useApiQuery(['ordens-kanban'], () => api.get('/ordens'), {
    refetchInterval: 30000,
  });

  useEffect(() => {
    setAction({ label: '📺 Kanban na TV', onClick: () => setTvMode(true) });
    return () => clearAction();
  }, []);

  useEffect(() => {
    if (tvMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [tvMode]);

  const faccoes = [...new Set(ordens.map(o => o.faccao_nome).filter(Boolean))];
  const filtradas = filtroFaccao ? ordens.filter(o => o.faccao_nome === filtroFaccao) : ordens;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* toolbar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#111827' }}>
          Kanban de Produção
          <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '.75rem', color: '#6b7280' }}>{filtradas.length} OPs ativas</span>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {faccoes.length > 0 && (
            <select
              value={filtroFaccao}
              onChange={e => setFiltroFaccao(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '.8rem', color: '#374151', background: '#fff', outline: 'none' }}
            >
              <option value="">Todas as facções</option>
              {faccoes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
          <button
            onClick={() => setTvMode(true)}
            style={{ padding: '7px 16px', borderRadius: 8, background: '#030f06', color: '#22c55e', border: '1px solid rgba(34,197,94,.3)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📺 Modo TV
          </button>
        </div>
      </div>

      {/* board */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Carregando Kanban...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUNAS.length},1fr)`, gap: 10, alignItems: 'start' }}>
          {COLUNAS.map(col => {
            const cards = filtradas.filter(o => o.fase_atual === col.fase);
            return (
              <div key={col.fase} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* header coluna */}
                <div style={{
                  background: col.bg, borderRadius: '10px 10px 0 0',
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: `2px solid ${col.cor}30`,
                }}>
                  <span style={{ fontSize: '.9rem' }}>{col.icon}</span>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: col.cor, textTransform: 'uppercase', letterSpacing: '.4px' }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '.72rem', padding: '2px 8px', borderRadius: 999, background: col.cor + '20', color: col.cor, fontWeight: 700 }}>{cards.length}</span>
                </div>
                {/* cards */}
                <div style={{
                  background: '#f8fafc', borderRadius: '0 0 10px 10px', padding: '10px 8px',
                  minHeight: 120, border: '1px solid #e5e7eb', borderTop: 'none',
                }}>
                  {cards.map(op => <KanbanCard key={op.id} op={op} />)}
                  {cards.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: '.75rem', marginTop: 20 }}>Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* legenda */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Prazo</span>
        {[{ cor: '#16a34a', label: '≤ 3 dias' }, { cor: '#d97706', label: '4–7 dias' }, { cor: '#dc2626', label: '> 7 dias' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: l.cor + '20', border: `2px solid ${l.cor}` }} />
            <span style={{ fontSize: '.72rem', color: '#6b7280' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {tvMode && <TVOverlay ordens={ordens} onClose={() => setTvMode(false)} />}
    </div>
  );
}
