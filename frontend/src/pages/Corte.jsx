import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const ORDEM_TAMANHOS = ['PP','EXG','P','M','G','GG','XGG','G1','G2','G3','G4','G5','02','04','06','08','10','12','14','16'];
const STEPS = ['Selecionar OP','Grade de Corte','Corte Real','Rendimento'];

function ModalOverlay({ onClose, children }) {
  const op = useOverlayClose(onClose);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} {...op}>
      {children}
    </div>
  );
}

const QR = ({ data, size = 80 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`}
    width={size} height={size} alt="QR" style={{ borderRadius: 4, border: '1px solid #e5e7eb', display: 'block' }} />
);

function GradeTable({ cores, grade, tamanhos, onChange }) {
  if (!cores.length) return <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Nenhuma cor cadastrada na OP.</p>;
  if (!tamanhos.length) return <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Nenhum tamanho definido na grade.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}>
          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'left', border: '1px solid #e5e7eb', fontSize: '.72rem', textTransform: 'uppercase' }}>Cor</th>
          {tamanhos.map(t => <th key={t} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '.72rem', textTransform: 'uppercase' }}>{t}</th>)}
          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', border: '1px solid #e5e7eb', fontSize: '.72rem' }}>Total</th>
        </tr></thead>
        <tbody>
          {cores.map(cor => {
            const rowTotal = tamanhos.reduce((s, t) => s + (Number(grade[cor]?.[t]) || 0), 0);
            return (
              <tr key={cor}>
                <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{cor}</td>
                {tamanhos.map(t => (
                  <td key={t} style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'center' }}>
                    <input type="number" min="0" value={grade[cor]?.[t] ?? ''}
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

function mergeGradeFromRefs(refs) {
  const merged = {};
  (refs || []).forEach(ref => {
    let g = ref.grade_json;
    if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = {}; } }
    g = g || {};
    Object.keys(g).forEach(cor => {
      if (!merged[cor]) merged[cor] = {};
      Object.keys(g[cor] || {}).forEach(t => {
        const v = Number(g[cor][t]) || 0;
        merged[cor][t] = (Number(merged[cor][t]) || 0) + v;
      });
    });
  });
  return merged;
}

function deriveTamanhos(grade) {
  const keys = new Set(Object.values(grade).flatMap(g => Object.keys(g)));
  return ORDEM_TAMANHOS.filter(t => keys.has(t));
}

export default function Corte() {
  const { setAction, clearAction } = useTopbar();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(FORM0);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [abaLabel, setAbaLabel] = useState(null);
  const [fornecedorManual, setFornecedorManual] = useState(false);

  const { data: ordens = [], isLoading } = useApiQuery(['ordens-corte'], () => api.get('/ordens'));
  const { data: fornecedores = [] } = useApiQuery(['fornecedores'], () => api.get('/fornecedores'));

  useEffect(() => {
    setAction({ label: 'Iniciar Corte', onClick: () => { setForm(FORM0); setStep(0); setModal(true); setFornecedorManual(false); } });
    return () => clearAction();
  }, []);

  // KPI table: OPs aguardando ou em corte
  const opsCandidatas = ordens.filter(o => ['Cadastrada','Corte'].includes(o.fase_atual));
  // Modal select: todas as OPs ativas (não concluídas nem canceladas)
  const opsAtivas = ordens.filter(o => !['Concluída','Cancelada'].includes(o.fase_atual));
  const fornecedoresCorte = fornecedores.filter(f => f.setor === 'Corte');

  const selecionarOP = async (op) => {
    if (!op) { setForm(f => ({ ...f, op: null, grade: {} })); return; }
    setLoadingRefs(true);
    try {
      const { data: refs } = await api.get(`/ordens/${op.id}/referencias`);
      const grade = mergeGradeFromRefs(refs);
      setForm(f => ({ ...f, op, grade }));
    } catch {
      setForm(f => ({ ...f, op, grade: {} }));
    } finally {
      setLoadingRefs(false);
    }
  };

  const abrirCorte = async (op) => {
    setForm(FORM0);
    setStep(0);
    setModal(true);
    setFornecedorManual(false);
    setLoadingRefs(true);
    try {
      const { data: refs } = await api.get(`/ordens/${op.id}/referencias`);
      const grade = mergeGradeFromRefs(refs);
      setForm({ ...FORM0, op, grade });
    } catch {
      setForm({ ...FORM0, op });
    } finally {
      setLoadingRefs(false);
    }
  };

  const cores    = Object.keys(form.grade);
  const tamanhos = deriveTamanhos(form.grade);

  const setGrade = (cor, tam, val) => setForm(f => ({ ...f, grade: { ...f.grade, [cor]: { ...(f.grade[cor] || {}), [tam]: val } } }));
  const setKg    = (cor, val)      => setForm(f => ({ ...f, kg_entrada:     { ...f.kg_entrada,     [cor]: val } }));
  const setPecas = (cor, val)      => setForm(f => ({ ...f, pecas_cortadas: { ...f.pecas_cortadas, [cor]: val } }));

  const planCor    = (cor) => tamanhos.reduce((s, t) => s + (Number(form.grade[cor]?.[t]) || 0), 0);
  const totalCorte = Object.values(form.pecas_cortadas).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalPlan  = cores.reduce((s, c) => s + planCor(c), 0);
  const aprovGeral = totalPlan > 0 ? ((totalCorte / totalPlan) * 100).toFixed(1) : '—';

  const rendimento = cores.map(cor => {
    const consumido  = Number(form.kg_entrada[cor]) || 0;
    const cortadas   = Number(form.pecas_cortadas[cor]) || 0;
    const planejadas = planCor(cor);
    const diff       = cortadas - planejadas;
    const rend       = planejadas > 0 ? ((cortadas / planejadas) * 100).toFixed(1) : '—';
    return { cor, consumido, cortadas, planejadas, diff, rend };
  });

  const handleFinalizar = async () => {
    if (!form.op) return;
    setSaving(true);
    try {
      await api.post(`/ordens/${form.op.id}/avancar-fase`);
      queryClient.invalidateQueries({ queryKey: ['ordens-corte'] });
      setModal(false);
    } catch {
      alert('Erro ao finalizar corte. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const TD = { padding: '10px 14px', fontSize: '.85rem', color: '#374151', verticalAlign: 'middle' };

  const opLabel = (o) => {
    const refs = (o.referencias || []).map(r => r.nome).filter(Boolean);
    const refsStr = refs.length ? ` — ${refs.join(', ')}` : '';
    return `${o.numero} — ${o.cliente_nome || 'sem cliente'}${refsStr}`;
  };

  const inputStyle = { padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '.875rem', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Aguardando corte', val: ordens.filter(o => o.fase_atual === 'Cadastrada').length, cor: '#0891b2', icon: '✂' },
          { label: 'Em corte',         val: ordens.filter(o => o.fase_atual === 'Corte').length,      cor: '#d97706', icon: '⚙' },
          { label: 'Fases posteriores',val: ordens.filter(o => !['Cadastrada','Corte'].includes(o.fase_atual)).length, cor: '#16a34a', icon: '✓' },
          { label: 'Total de OPs',     val: ordens.length, cor: '#7c3aed', icon: '📋' },
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
          <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827' }}>
            OPs para Corte
            <span style={{ marginLeft: 8, fontSize: '.75rem', fontWeight: 400, color: '#6b7280' }}>{opsCandidatas.length} pendentes</span>
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['OP','Cliente','Referências','Fase','Ações'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Carregando...</td></tr>
                : opsCandidatas.length === 0
                ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma OP aguardando corte.</td></tr>
                : opsCandidatas.map(op => (
                  <tr key={op.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...TD, fontWeight: 700, fontFamily: 'monospace', fontSize: '.82rem' }}>{op.numero}</td>
                    <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{op.cliente_nome || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280', fontSize: '.78rem' }}>
                      {(op.referencias || []).map(r => r.nome).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={TD}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '.72rem', fontWeight: 600, background: op.fase_atual === 'Corte' ? '#fef3c7' : '#dbeafe', color: op.fase_atual === 'Corte' ? '#d97706' : '#2563eb' }}>
                        {op.fase_atual}
                      </span>
                    </td>
                    <td style={{ ...TD, display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirCorte(op)}
                        style={{ padding: '5px 12px', borderRadius: 6, background: '#cffafe', color: '#0891b2', border: '1px solid #a5f3fc', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>✂ Cortar</button>
                      <button onClick={() => setAbaLabel(op)}
                        style={{ padding: '5px 12px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>🏷 Etiquetas</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gerador de Etiquetas */}
      {abaLabel && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#111827' }}>🏷 Etiquetas — OP {abaLabel.numero}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 7, background: '#16a34a', color: '#fff', border: 'none', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}>🖨 Imprimir</button>
              <button onClick={() => setAbaLabel(null)} style={{ padding: '6px 14px', borderRadius: 7, background: '#f3f4f6', color: '#374151', border: 'none', fontSize: '.8rem', cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
          <EtiquetasOP op={abaLabel} />
        </div>
      )}

      {/* Modal wizard */}
      {modal && (
        <ModalOverlay onClose={() => setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 740, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Lançamento de Corte</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <Stepper step={step} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

              {/* ── Passo 1: Selecionar OP e Fornecedor ────────────────── */}
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* OP */}
                  <div>
                    <label style={labelStyle}>Ordem de Produção *</label>
                    <select
                      value={form.op?.id || ''}
                      onChange={e => {
                        const op = opsAtivas.find(o => String(o.id) === e.target.value) || null;
                        selecionarOP(op);
                      }}
                      style={inputStyle}>
                      <option value="">Selecione uma OP...</option>
                      {opsAtivas.map(o => (
                        <option key={o.id} value={o.id}>{opLabel(o)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fornecedor de Corte */}
                  <div>
                    <label style={labelStyle}>Fornecedor de Corte *</label>
                    {fornecedoresCorte.length > 0 && !fornecedorManual ? (
                      <select
                        value={form.fornecedor}
                        onChange={e => {
                          if (e.target.value === '__manual__') {
                            setFornecedorManual(true);
                            setForm(f => ({ ...f, fornecedor: '' }));
                          } else {
                            setForm(f => ({ ...f, fornecedor: e.target.value }));
                          }
                        }}
                        style={inputStyle}>
                        <option value="">Selecione o fornecedor...</option>
                        {fornecedoresCorte.map(f => (
                          <option key={f.id} value={f.nome || f.razao_social}>{f.nome || f.razao_social}</option>
                        ))}
                        <option value="__manual__">+ Digitar manualmente</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Nome do fornecedor / setor de corte"
                          value={form.fornecedor}
                          onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
                          style={{ ...inputStyle, flex: 1, width: 'auto' }}
                        />
                        {fornecedoresCorte.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setFornecedorManual(false); setForm(f => ({ ...f, fornecedor: '' })); }}
                            style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #d1d5db', background: '#f9fafb', color: '#6b7280', fontSize: '.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            ← Lista
                          </button>
                        )}
                      </div>
                    )}
                    {fornecedoresCorte.length === 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: '.72rem', color: '#9ca3af' }}>
                        Nenhum fornecedor do setor Corte cadastrado. Cadastre em Fornecedores ou digite o nome.
                      </p>
                    )}
                  </div>

                  {/* Resumo da OP selecionada */}
                  {loadingRefs && (
                    <p style={{ margin: 0, fontSize: '.8rem', color: '#6b7280' }}>Carregando grade da OP...</p>
                  )}
                  {form.op && !loadingRefs && (
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: '#111827' }}>
                        {form.op.numero} — {form.op.cliente_nome || 'sem cliente'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: '#6b7280' }}>
                        <b>Fase:</b> {form.op.fase_atual} &nbsp;·&nbsp;
                        <b>Cores:</b> {cores.join(', ') || 'Nenhuma'}
                        {tamanhos.length > 0 && <> &nbsp;·&nbsp; <b>Tamanhos:</b> {tamanhos.join(', ')}</>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Passo 2: Grade de Corte ──────────────────────────── */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#6b7280' }}>
                    Grade carregada automaticamente da OP. Ajuste as quantidades se necessário.
                  </p>
                  {form.op && (
                    <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 600, color: '#374151' }}>
                      {form.op.numero} — {form.op.cliente_nome}
                      {form.fornecedor && <span style={{ fontWeight: 400, color: '#6b7280' }}> · Fornecedor: {form.fornecedor}</span>}
                    </p>
                  )}
                  {loadingRefs
                    ? <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Carregando grade...</p>
                    : <GradeTable cores={cores} grade={form.grade} tamanhos={tamanhos} onChange={setGrade} />
                  }
                </div>
              )}

              {/* ── Passo 3: Corte Real ───────────────────────────────── */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#6b7280' }}>
                    Informe o kg de malha consumido e as peças efetivamente cortadas por cor.
                  </p>
                  {cores.length === 0
                    ? <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Nenhuma cor cadastrada na OP.</p>
                    : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: '.82rem', width: '100%' }}>
                        <thead><tr style={{ background: '#f8fafc' }}>
                          {['Cor','Pcs planejadas','Kg consumido','Pcs cortadas'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: h === 'Cor' ? 'left' : 'center', border: '1px solid #e5e7eb', fontSize: '.7rem', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {cores.map(cor => (
                            <tr key={cor}>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827' }}>{cor}</td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'center' }}>{planCor(cor)}</td>
                              <td style={{ border: '1px solid #e5e7eb', padding: '6px 8px', textAlign: 'center' }}>
                                <input type="number" min="0" step="0.1" value={form.kg_entrada[cor] || ''} onChange={e => setKg(cor, e.target.value)} placeholder="0.0"
                                  style={{ width: 80, padding: '5px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '.82rem', outline: 'none', textAlign: 'center' }} />
                              </td>
                              <td style={{ border: '1px solid #e5e7eb', padding: '6px 8px', textAlign: 'center' }}>
                                <input type="number" min="0" value={form.pecas_cortadas[cor] || ''} onChange={e => setPecas(cor, e.target.value)} placeholder="0"
                                  style={{ width: 80, padding: '5px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '.82rem', outline: 'none', textAlign: 'center' }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Passo 4: Rendimento ───────────────────────────────── */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Cards de resumo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Peças cortadas</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{totalCorte}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>de {totalPlan} planejadas</p>
                    </div>
                    <div style={{ background: totalCorte >= totalPlan ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '14px', border: `1px solid ${totalCorte >= totalPlan ? '#bbf7d0' : '#fecaca'}` }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Diferença</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: totalCorte >= totalPlan ? '#16a34a' : '#dc2626' }}>
                        {totalCorte - totalPlan >= 0 ? '+' : ''}{totalCorte - totalPlan}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>peças</p>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 10, padding: '14px', border: '1px solid #fcd34d' }}>
                      <p style={{ margin: 0, fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Aproveitamento</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{aprovGeral}%</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#6b7280' }}>rendimento geral</p>
                    </div>
                  </div>

                  {/* Detalhe por cor */}
                  {cores.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: '.82rem', width: '100%' }}>
                        <thead><tr style={{ background: '#f8fafc' }}>
                          {['Cor','Kg consumido','Pcs planejadas','Pcs cortadas','Diferença','% Rendimento'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '.7rem', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {rendimento.map(r => (
                            <tr key={r.cor}>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{r.cor}</td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#374151' }}>{r.consumido > 0 ? `${r.consumido} kg` : '—'}</td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280' }}>{r.planejadas}</td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 700, color: r.cortadas >= r.planejadas ? '#16a34a' : '#dc2626' }}>{r.cortadas}</td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                <span style={{ fontWeight: 700, color: r.diff >= 0 ? '#16a34a' : '#dc2626' }}>
                                  {r.diff >= 0 ? '+' : ''}{r.diff}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 999, background: '#fef3c7', color: '#d97706', fontSize: '.75rem', fontWeight: 700 }}>
                                  {r.rend}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: '.8rem', color: '#6b7280' }}>
                    Ao finalizar, a OP avançará para a próxima fase automaticamente.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé de navegação */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: '.85rem', cursor: 'pointer' }}>
                    ← Anterior
                  </button>
                )}
              </div>
              {step < 3
                ? <button
                    onClick={() => {
                      if (step === 0 && !form.op)         { alert('Selecione uma OP'); return; }
                      if (step === 0 && !form.fornecedor) { alert('Informe o fornecedor de corte'); return; }
                      setStep(s => s + 1);
                    }}
                    disabled={loadingRefs}
                    style={{ padding: '7px 22px', borderRadius: 8, background: loadingRefs ? '#d1d5db' : '#16a34a', color: '#fff', border: 'none', fontSize: '.85rem', fontWeight: 600, cursor: loadingRefs ? 'not-allowed' : 'pointer' }}>
                    {loadingRefs ? 'Aguarde...' : 'Próximo →'}
                  </button>
                : <button
                    onClick={handleFinalizar}
                    disabled={saving}
                    style={{ padding: '7px 22px', borderRadius: 8, background: saving ? '#d1d5db' : '#16a34a', color: '#fff', border: 'none', fontSize: '.85rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Salvando...' : '✓ Finalizar Corte'}
                  </button>
              }
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function EtiquetasOP({ op }) {
  const [refs, setRefs] = useState([]);

  useEffect(() => {
    api.get(`/ordens/${op.id}/referencias`).then(r => {
      setRefs(r.data || []);
    }).catch(() => setRefs([]));
  }, [op.id]);

  if (!refs.length) return <p style={{ padding: 18, color: '#9ca3af', fontSize: '.82rem' }}>Carregando etiquetas...</p>;

  return (
    <div style={{ padding: '18px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {refs.flatMap(ref => {
        let g = ref.grade_json;
        if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = {}; } }
        g = g || {};
        const tamanhos = deriveTamanhos(g);
        return Object.keys(g).map(cor => {
          const total = tamanhos.reduce((s, t) => s + (Number(g[cor]?.[t]) || 0), 0);
          const qrData = `OP:${op.numero}|REF:${ref.nome}|COR:${cor}|PCS:${total}|CLI:${op.cliente_nome || ''}`;
          return (
            <div key={`${ref.id}-${cor}`} style={{ border: '2px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', background: '#fafafa' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '.62rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px' }}>ConfecçãoERP — Corte</p>
                <p style={{ margin: '2px 0', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{cor}</p>
                <p style={{ margin: 0, fontSize: '.72rem', color: '#6b7280' }}>{op.numero} · {ref.nome} · {total} pcs</p>
                <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#374151', fontWeight: 600 }}>{op.cliente_nome || ''}</p>
              </div>
              <QR data={qrData} size={80} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, width: '100%' }}>
                {tamanhos.map(t => { const q = Number(g[cor]?.[t]) || 0; return q > 0 ? (
                  <div key={t} style={{ textAlign: 'center', padding: '3px 4px', borderRadius: 4, background: '#f3f4f6' }}>
                    <p style={{ margin: 0, fontSize: '.6rem', color: '#9ca3af' }}>{t}</p>
                    <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 700, color: '#374151' }}>{q}</p>
                  </div>
                ) : null; })}
              </div>
            </div>
          );
        });
      })}
    </div>
  );
}
