import { useState, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const TAMANHOS = ['PP','P','M','G','GG','XGG'];
const STEPS = ['Selecionar OP','Grade de Corte','Corte Real','Rendimento'];

const QR = ({ data, size = 80 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`}
    width={size} height={size} alt="QR" style={{ borderRadius: 4, border: '1px solid #e5e7eb', display: 'block' }} />
);

const Inp = ({ label, ...p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {label && <label style={{ fontSize: '.75rem', fontWeight: 600, color: '#374151' }}>{label}</label>}
    <input style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} {...p} />
  </div>
);

function GradeTable({ cores, grade, onChange }) {
  if (!cores.length) return <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Nenhuma cor na OP.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}>
          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'left', border: '1px solid #e5e7eb', fontSize: '.72rem', textTransform: 'uppercase' }}>Cor</th>
          {TAMANHOS.map(t => <th key={t} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '.72rem', textTransform: 'uppercase' }}>{t}</th>)}
          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', border: '1px solid #e5e7eb', fontSize: '.72rem' }}>Total</th>
        </tr></thead>
        <tbody>
          {cores.map(cor => {
            const rowTotal = TAMANHOS.reduce((s, t) => s + (Number(grade[cor]?.[t]) || 0), 0);
            return (
              <tr key={cor}>
                <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{cor}</td>
                {TAMANHOS.map(t => (
                  <td key={t} style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'center' }}>
                    <input type="number" min="0" value={grade[cor]?.[t] || ''}
                      onChange={e => onChange(cor, t, e.target.value)}
                      style={{ width: 52, textAlign: 'center', padding: '4px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '.82rem', outline: 'none' }} />
                  </td>
                ))}
                <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{rowTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #f1f5f9' }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: i < step ? '#16a34a' : i === step ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#e5e7eb', color: i <= step ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700 }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '.62rem', fontWeight: i === step ? 700 : 400, color: i === step ? '#16a34a' : '#9ca3af', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#16a34a' : '#e5e7eb', margin: '0 4px', marginBottom: 16 }} />}
        </div>
      ))}
    </div>
  );
}

const FORM0 = { op: null, fornecedor: '', grade: {}, kg_entrada: {}, pecas_cortadas: {} };

export default function Corte() {
  const { setAction, clearAction } = useTopbar();
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(FORM0);
  const [abaLabel, setAbaLabel] = useState(null);

  const { data: ordens = [], isLoading } = useApiQuery(['ordens-corte'], () => api.get('/ordens'));
  const { data: entradas = [] } = useApiQuery(['entradas-corte'], () => api.get('/entradas-malha'));

  useEffect(() => {
    setAction({ label: 'Iniciar Corte', onClick: () => { setForm(FORM0); setStep(0); setModal(true); } });
    return () => clearAction();
  }, []);

  const opsCandidatas = ordens.filter(o => ['Cadastrada','Corte'].includes(o.fase_atual));
  const cores = form.op ? Object.keys(form.op.grade || {}) : [];

  const setGrade = (cor, tam, val) => setForm(f => ({ ...f, grade: { ...f.grade, [cor]: { ...(f.grade[cor] || {}), [tam]: val } } }));
  const setKg    = (cor, val)      => setForm(f => ({ ...f, kg_entrada:    { ...f.kg_entrada,    [cor]: val } }));
  const setPecas = (cor, val)      => setForm(f => ({ ...f, pecas_cortadas:{ ...f.pecas_cortadas,[cor]: val } }));

  const planCor  = (cor) => TAMANHOS.reduce((s, t) => s + (Number((Object.keys(form.grade).length ? form.grade : form.op?.grade || {})[cor]?.[t]) || 0), 0);
  const totalCorte = Object.values(form.pecas_cortadas).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalPlan  = cores.reduce((s, c) => s + planCor(c), 0);

  const kgDisp = (() => {
    const m = {};
    entradas.forEach(e => (e.itens || []).forEach(it => { const k = it.cor || 'Sem cor'; m[k] = (m[k] || 0) + (Number(it.kg_malha) || 0); }));
    return m;
  })();

  const rendimento = cores.map(cor => {
    const consumido = Number(form.kg_entrada[cor]) || 0;
    const cortadas  = Number(form.pecas_cortadas[cor]) || 0;
    const planejadas = planCor(cor);
    const sobra = (kgDisp[cor] || 0) - consumido;
    const rend  = consumido > 0 ? ((cortadas / consumido) * 100).toFixed(1) : '—';
    return { cor, consumido, sobra, cortadas, planejadas, rend };
  });

  const TD = { padding: '10px 14px', fontSize: '.85rem', color: '#374151', verticalAlign: 'middle' };
  const gradeAtual = Object.keys(form.grade).length ? form.grade : (form.op?.grade || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Aguardando corte', val: opsCandidatas.length, cor: '#0891b2', icon: '✂' },
          { label: 'Em corte', val: ordens.filter(o => o.fase_atual === 'Corte').length, cor: '#d97706', icon: '⚙' },
          { label: 'Passaram pelo corte', val: ordens.filter(o => !['Cadastrada','Corte'].includes(o.fase_atual)).length, cor: '#16a34a', icon: '✓' },
          { label: 'Entradas de malha', val: entradas.length, cor: '#7c3aed', icon: '📦' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '1.2rem' }}>{k.icon}</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: k.cor }}>{k.val}</span>
            </div>
            <p style={{ margin: 0, fontSize: '.72rem', color: '#6b7280' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela de OPs */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827' }}>OPs para Corte
            <span style={{ marginLeft: 8, fontSize: '.75rem', fontWeight: 400, color: '#6b7280' }}>{opsCandidatas.length} pendentes</span>
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['OP','Cliente','Descrição','Cores','Peças','Fase','Ações'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Carregando...</td></tr>
                : opsCandidatas.length === 0
                ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma OP aguardando corte.</td></tr>
                : opsCandidatas.map(op => {
                  const cs = Object.keys(op.grade || {});
                  const total = cs.reduce((s, c) => s + Object.values(op.grade[c] || {}).reduce((a, b) => a + (Number(b) || 0), 0), 0);
                  return (
                    <tr key={op.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...TD, fontWeight: 700, fontFamily: 'monospace', fontSize: '.82rem' }}>#{op.numero_op}</td>
                      <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{op.cliente_nome || '—'}</td>
                      <td style={{ ...TD, color: '#6b7280' }}>{op.descricao || '—'}</td>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {cs.slice(0, 3).map(c => <span key={c} style={{ padding: '2px 7px', borderRadius: 999, background: '#f3f4f6', color: '#374151', fontSize: '.7rem', fontWeight: 600 }}>{c}</span>)}
                          {cs.length > 3 && <span style={{ fontSize: '.7rem', color: '#6b7280' }}>+{cs.length - 3}</span>}
                        </div>
                      </td>
                      <td style={TD}>{total}</td>
                      <td style={TD}><span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '.72rem', fontWeight: 600, background: op.fase_atual === 'Corte' ? '#fef3c7' : '#dbeafe', color: op.fase_atual === 'Corte' ? '#d97706' : '#2563eb' }}>{op.fase_atual}</span></td>
                      <td style={{ ...TD, display: 'flex', gap: 6 }}>
                        <button onClick={() => { setForm({ ...FORM0, op }); setStep(0); setModal(true); }}
                          style={{ padding: '5px 12px', borderRadius: 6, background: '#cffafe', color: '#0891b2', border: '1px solid #a5f3fc', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>✂ Cortar</button>
                        <button onClick={() => setAbaLabel(op)}
                          style={{ padding: '5px 12px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>🏷 Etiquetas</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gerador de Etiquetas */}
      {abaLabel && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827' }}>🏷 Etiquetas — OP #{abaLabel.numero_op}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 7, background: '#16a34a', color: '#fff', border: 'none', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}>🖨 Imprimir</button>
              <button onClick={() => setAbaLabel(null)} style={{ padding: '6px 14px', borderRadius: 7, background: '#f3f4f6', color: '#374151', border: 'none', fontSize: '.8rem', cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {Object.keys(abaLabel.grade || {}).map(cor => {
              const total = Object.values(abaLabel.grade[cor] || {}).reduce((s, v) => s + (Number(v) || 0), 0);
              const qrData = `OP:${abaLabel.numero_op}|COR:${cor}|PCS:${total}|CLI:${abaLabel.cliente_nome || ''}`;
              return (
                <div key={cor} style={{ border: '2px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', background: '#fafafa' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '.62rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>ConfecçãoERP — Corte</p>
                    <p style={{ margin: '2px 0', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{cor}</p>
                    <p style={{ margin: 0, fontSize: '.72rem', color: '#6b7280' }}>OP #{abaLabel.numero_op} · {total} pcs</p>
                  </div>
                  <QR data={qrData} size={80} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, width: '100%' }}>
                    {TAMANHOS.map(t => { const q = abaLabel.grade[cor]?.[t] || 0; return q > 0 ? (
                      <div key={t} style={{ textAlign: 'center', padding: '3px 4px', borderRadius: 4, background: '#f3f4f6' }}>
                        <p style={{ margin: 0, fontSize: '.6rem', color: '#9ca3af' }}>{t}</p>
                        <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 700, color: '#374151' }}>{q}</p>
                      </div>
                    ) : null; })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal wizard */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Lançamento de Corte</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <Stepper step={step} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#6b7280' }}>Selecione a OP e informe o fornecedor de corte.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 600, color: '#374151' }}>Ordem de Produção *</label>
                    <select value={form.op?.id || ''} onChange={e => { const op = opsCandidatas.find(o => String(o.id) === e.target.value); setForm(f => ({ ...f, op: op || null, grade: {} })); }}
                      style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '.875rem', outline: 'none', background: '#fff' }}>
                      <option value="">Selecione uma OP...</option>
                      {opsCandidatas.map(o => <option key={o.id} value={o.id}>#{o.numero_op} — {o.cliente_nome} — {o.descricao || 'sem descrição'}</option>)}
                    </select>
                  </div>
                  <Inp label="Fornecedor de corte" placeholder="Nome do fornecedor / setor de corte" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
                  {form.op && (
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: 0, fontSize: '.82rem', fontWeight: 700, color: '#111827' }}>OP #{form.op.numero_op} — {form.op.cliente_nome}</p>
                      <p style={{ margin: '3px 0 0', fontSize: '.75rem', color: '#6b7280' }}>Cores: {Object.keys(form.op.grade || {}).join(', ') || 'Sem grade'} · Fase: {form.op.fase_atual}</p>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#6b7280' }}>Defina a quantidade a cortar por cor e tamanho.</p>
                  <GradeTable cores={cores} grade={gradeAtual} onChange={setGrade} />
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#6b7280' }}>Informe o kg de malha consumido e as peças efetivamente cortadas por cor.</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '.82rem', width: '100%' }}>
                      <thead><tr style={{ background: '#f8fafc' }}>
                        {['Cor','Kg disponível','Kg consumido','Pcs planejadas','Pcs cortadas'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'left', border: '1px solid #e5e7eb', fontSize: '.7rem', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {cores.map(cor => (
                          <tr key={cor}>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827' }}>{cor}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>{kgDisp[cor] ? `${kgDisp[cor]} kg` : '—'}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '4px 8px' }}>
                              <input type="number" min="0" step="0.1" value={form.kg_entrada[cor] || ''} onChange={e => setKg(cor, e.target.value)} placeholder="0.0"
                                style={{ width: 80, padding: '5px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '.82rem', outline: 'none' }} />
                            </td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'center' }}>{planCor(cor)}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '4px 8px' }}>
                              <input type="number" min="0" value={form.pecas_cortadas[cor] || ''} onChange={e => setPecas(cor, e.target.value)} placeholder="0"
                                style={{ width: 80, padding: '5px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '.82rem', outline: 'none' }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Peças cortadas</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{totalCorte}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>de {totalPlan} planejadas</p>
                    </div>
                    <div style={{ background: totalCorte >= totalPlan ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '14px', border: `1px solid ${totalCorte >= totalPlan ? '#bbf7d0' : '#fecaca'}` }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Diferença</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: totalCorte >= totalPlan ? '#16a34a' : '#dc2626' }}>{totalCorte - totalPlan >= 0 ? '+' : ''}{totalCorte - totalPlan}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>peças</p>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 10, padding: '14px', border: '1px solid #fcd34d' }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Aproveitamento</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{totalPlan > 0 ? ((totalCorte / totalPlan) * 100).toFixed(1) : '—'}%</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>rendimento geral</p>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '.82rem', width: '100%' }}>
                      <thead><tr style={{ background: '#f8fafc' }}>
                        {['Cor','Kg consumido','Sobra kg','Pcs planejadas','Pcs cortadas','Rendimento'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '.7rem', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {rendimento.map(r => (
                          <tr key={r.cor}>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{r.cor}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#374151' }}>{r.consumido || '—'} kg</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}><span style={{ color: r.sobra >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{r.sobra.toFixed(1)} kg</span></td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280' }}>{r.planejadas}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 700, color: r.cortadas >= r.planejadas ? '#16a34a' : '#dc2626' }}>{r.cortadas}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}><span style={{ padding: '3px 8px', borderRadius: 999, background: '#fef3c7', color: '#d97706', fontSize: '.75rem', fontWeight: 700 }}>{r.rend}%</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: '.85rem', cursor: 'pointer' }}>← Anterior</button>}
              </div>
              {step < 3
                ? <button onClick={() => { if (!form.op && step === 0) { alert('Selecione uma OP'); return; } setStep(s => s + 1); }}
                    style={{ padding: '7px 22px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}>Próximo →</button>
                : <button onClick={() => setModal(false)}
                    style={{ padding: '7px 22px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}>✓ Finalizar Corte</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
