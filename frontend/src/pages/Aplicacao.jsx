import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const ORDEM_TAMANHOS = ['PP','EXG','P','M','G','GG','XGG','G1','G2','G3','G4','G5','02','04','06','08','10','12','14','16'];
const TIPOS_APLICACAO = ['Bordado','Silk Screen','DTF','Sublimação','Estamparia','Patch/Aplique'];
const FASES_APLIC     = ['Aplicação','Acabamento','Revisão','Expedição'];
const thS = { padding:'8px 12px', fontWeight:700, color:'#374151', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'.72rem', textTransform:'uppercase' };

function ModalOverlay({ onClose, children }) {
  const op = useOverlayClose(onClose);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} {...op}>
      {children}
    </div>
  );
}

function getCoresFromRefs(refs) {
  const seen = new Set();
  const out  = [];
  for (const ref of refs) {
    for (const cor of (ref.cores || [])) {
      if (!seen.has(cor)) { seen.add(cor); out.push(cor); }
    }
  }
  return out;
}

function deriveTamanhos(refs) {
  const keys = new Set(refs.flatMap(r => Object.values(r.grade_json || {}).flatMap(Object.keys)));
  return ORDEM_TAMANHOS.filter(t => keys.has(t));
}

function buildGradeSugestao(refs) {
  const grade = {};
  for (const ref of refs) {
    for (const [cor, tams] of Object.entries(ref.grade_json || {})) {
      if (!grade[cor]) grade[cor] = {};
      for (const [tam, qty] of Object.entries(tams)) {
        const n = Number(qty) || 0;
        if (n > 0) grade[cor][tam] = (grade[cor][tam] || 0) + n;
      }
    }
  }
  return grade;
}

function GradeInput({ cores, tamanhos, grade, onChange, loading }) {
  if (loading)          return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>Carregando grade da OP...</p>;
  if (!cores.length)    return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>Selecione uma OP na etapa anterior.</p>;
  if (!tamanhos.length) return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>OP sem grade de tamanhos definida.</p>;
  return (
    <div style={{ overflowX:'auto' }}>
      <p style={{ margin:'0 0 8px', fontSize:'.75rem', color:'#6b7280' }}>Sugestão baseada na grade planejada. Ajuste conforme o real a enviar.</p>
      <table style={{ borderCollapse:'collapse', fontSize:'.82rem' }}>
        <thead><tr style={{ background:'#f8fafc' }}>
          <th style={{ ...thS, textAlign:'left' }}>Cor</th>
          {tamanhos.map(t => <th key={t} style={thS}>{t}</th>)}
          <th style={thS}>Total</th>
        </tr></thead>
        <tbody>{cores.map(cor => {
          const rowTotal = tamanhos.reduce((s, t) => s + (Number(grade[cor]?.[t])||0), 0);
          return (
            <tr key={cor}>
              <td style={{ padding:'7px 12px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827', whiteSpace:'nowrap' }}>{cor}</td>
              {tamanhos.map(t => (
                <td key={t} style={{ border:'1px solid #e5e7eb', padding:'4px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={grade[cor]?.[t]||''} onChange={e => onChange(cor, t, e.target.value)}
                    style={{ width:48, textAlign:'center', padding:'4px', borderRadius:5, border:'1px solid #d1d5db', fontSize:'.82rem', outline:'none' }} />
                </td>
              ))}
              <td style={{ padding:'7px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#ec4899' }}>{rowTotal}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

const today = new Date().toISOString().split('T')[0];
const FORM0  = { fornecedor:null, op:null, data_envio:today, data_retorno:'', grade:{}, obs:'' };

export default function Aplicacao() {
  const { setAction, clearAction } = useTopbar();
  const queryClient = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(FORM0);
  const [envioSel, setEnvioSel] = useState(null);
  const [retorno, setRetorno]   = useState({});
  const [filtroTipo, setFiltroTipo] = useState('');
  const [saving, setSaving]     = useState(false);
  const gradeSourceRef          = useRef(null);

  const { data: fornecedores = [] } = useApiQuery(['forn-aplicacao'], () => api.get('/fornecedores?setor=Aplica%C3%A7%C3%A3o'));
  const { data: ordens = [] }       = useApiQuery(['ordens-aplicacao'], () => api.get('/ordens'));
  const { data: enviosAPI = [] }    = useApiQuery(['envios-aplicacao'], () => api.get('/coletas?tipo=envio_aplicacao'));
  const { data: opRefs = [], isFetching: loadingRefs } = useApiQuery(
    ['op-refs-aplicacao', form.op?.id],
    () => api.get(`/ordens/${form.op.id}/referencias`),
    { enabled: !!form.op?.id, staleTime: 60000 }
  );

  useEffect(() => {
    if (opRefs.length > 0 && form.op?.id && form.op.id !== gradeSourceRef.current) {
      gradeSourceRef.current = form.op.id;
      setForm(f => ({ ...f, grade: buildGradeSugestao(opRefs) }));
    }
  }, [opRefs, form.op?.id]);

  const opsDisp = ordens.filter(o => FASES_APLIC.includes(o.fase_atual));
  const opCores = getCoresFromRefs(opRefs);
  const opTams  = deriveTamanhos(opRefs);

  const envios = enviosAPI.map(e => {
    const grade = e.quantidade_json || {};
    const total = Object.values(grade).reduce((s, tams) => s + Object.values(tams).reduce((a, b) => a + (Number(b)||0), 0), 0);
    return {
      id: e.id,
      fornecedor_nome: e.destino || '—',
      op_numero: e.op_numero || '—',
      op_id: e.op_id,
      data_envio: e.data ? e.data.slice(0, 10) : '',
      data_retorno: e.data_retorno_previsto || '',
      grade,
      total,
      status: e.status || 'enviado',
      obs: e.observacao,
      divergencias: e.divergencias_json || [],
    };
  });

  const taxaAprov = (() => {
    const retornados = envios.filter(e => e.status === 'retornado');
    if (!retornados.length) return null;
    const totalEnv = retornados.reduce((s, e) => s + e.total, 0);
    const totalDiv = retornados.reduce((s, e) => s + (e.divergencias?.length || 0), 0);
    if (!totalEnv) return null;
    return Math.max(0, Math.round(((totalEnv - totalDiv) / totalEnv) * 100));
  })();

  useEffect(() => {
    setAction({ label:'Novo Envio', onClick:() => { setForm(FORM0); setStep(0); gradeSourceRef.current = null; setModal('envio'); } });
    return () => clearAction();
  }, []);

  const setGrade = (cor, tam, val) => setForm(f => ({ ...f, grade:{ ...f.grade, [cor]:{ ...(f.grade[cor]||{}), [tam]:val } } }));
  const totalG   = (g) => Object.values(g).reduce((s, tams) => s + Object.values(tams).reduce((a, b) => a + (Number(b)||0), 0), 0);
  const isAtr    = (e) => e.data_retorno && new Date(e.data_retorno+'T23:59') < new Date() && e.status==='enviado';

  const stInfo = (e) => {
    if (isAtr(e)) return { bg:'#fef2f2', text:'#dc2626', label:'Atrasado' };
    return {
      enviado:   { bg:'#fdf2f8', text:'#ec4899', label:'Em produção' },
      retornado: { bg:'#f0fdf4', text:'#16a34a', label:'Retornado' },
    }[e.status] || { bg:'#f3f4f6', text:'#374151', label:e.status };
  };

  const confirmarEnvio = async () => {
    if (!form.fornecedor || !form.op) { alert('Selecione o fornecedor e a OP'); return; }
    if (totalG(form.grade) === 0) { alert('Grade vazia — preencha as quantidades no passo 2.'); return; }
    setSaving(true);
    try {
      await api.post('/coletas', {
        op_id: form.op.id,
        tipo: 'envio_aplicacao',
        origem: 'Empresa',
        destino: form.fornecedor.nome || '',
        quantidade_json: form.grade,
        observacao: form.obs || null,
        status: 'enviado',
        data_retorno_previsto: form.data_retorno || null,
      });
      queryClient.invalidateQueries({ queryKey: ['envios-aplicacao'] });
      setModal(null);
    } catch {
      alert('Erro ao salvar envio. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const calcDiv = () => {
    if (!envioSel) return [];
    const tams = (() => {
      const keys = new Set(Object.values(envioSel.grade||{}).flatMap(Object.keys));
      return ORDEM_TAMANHOS.filter(t => keys.has(t));
    })();
    return Object.keys(envioSel.grade||{}).flatMap(cor =>
      tams.map(t => { const e=Number(envioSel.grade[cor]?.[t])||0, r=Number(retorno[cor]?.[t])||0; return e!==r ? {cor,tam:t,env:e,ret:r,diff:r-e} : null; }).filter(Boolean)
    );
  };

  const confirmarRetorno = async () => {
    const divs = calcDiv();
    try {
      await api.put(`/coletas/${envioSel.id}`, { status:'retornado', divergencias_json: divs });
      queryClient.invalidateQueries({ queryKey: ['envios-aplicacao'] });
      setModal(null); setEnvioSel(null); setRetorno({});
    } catch {
      alert('Erro ao confirmar retorno.');
    }
  };

  const divs      = calcDiv();
  const allCores  = envioSel ? Object.keys(envioSel.grade||{}) : [];
  const envioTams = (() => {
    const keys = new Set(Object.values(envioSel?.grade||{}).flatMap(Object.keys));
    return ORDEM_TAMANHOS.filter(t => keys.has(t));
  })();

  const opsCard = opsDisp.filter(o => {
    if (!filtroTipo) return true;
    const tipos = o.aplicacao_json?.tipos || [];
    return tipos.includes(filtroTipo);
  });

  const TD = { padding:'10px 14px', fontSize:'.85rem', color:'#374151', verticalAlign:'middle' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Em produção',    val:envios.filter(e=>e.status==='enviado'&&!isAtr(e)).length, cor:'#ec4899', icon:'🎨' },
          { label:'Atrasados',      val:envios.filter(e=>isAtr(e)).length,                        cor:'#dc2626', icon:'⚠' },
          { label:'Retornados',     val:envios.filter(e=>e.status==='retornado').length,           cor:'#16a34a', icon:'✓' },
          { label:'Taxa aprovação', val:taxaAprov !== null ? `${taxaAprov}%` : '—',                cor:'#7c3aed', icon:'📊' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'1.2rem' }}>{k.icon}</span>
              <span style={{ fontSize:'1.6rem', fontWeight:800, color:k.cor }}>{k.val}</span>
            </div>
            <p style={{ margin:0, fontSize:'.72rem', color:'#6b7280' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* OPs aguardando aplicação */}
      <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <p style={{ margin:0, fontSize:'.9rem', fontWeight:700, color:'#111827' }}>
            OPs em Aplicação
            <span style={{ marginLeft:8, fontWeight:400, fontSize:'.75rem', color:'#6b7280' }}>{opsCard.length} ordens</span>
          </p>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.8rem', color:'#374151', background:'#fff', outline:'none' }}>
              <option value="">Todos os tipos</option>
              {TIPOS_APLICACAO.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {opsCard.length === 0 ? (
          <p style={{ textAlign:'center', color:'#9ca3af', padding:'2rem', fontSize:'.85rem' }}>Nenhuma OP na fase de Aplicação.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {opsCard.map(op => {
              const aplic = op.aplicacao_json || {};
              const envAtivos = envios.filter(e=>e.op_id===op.id&&e.status==='enviado');
              return (
                <div key={op.id} style={{ padding:'14px 16px', borderRadius:10, border:'1px solid #f9a8d4', background:'#fdf2f8' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:'.7rem', fontWeight:700, color:'#ec4899', fontFamily:'monospace' }}>{op.numero}</span>
                    {envAtivos.length > 0 && (
                      <span style={{ padding:'2px 8px', borderRadius:999, background:'#ec4899', color:'#fff', fontSize:'.65rem', fontWeight:700 }}>{envAtivos.length} enviado(s)</span>
                    )}
                  </div>
                  <p style={{ margin:'0 0 4px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>{op.cliente_nome||'—'}</p>
                  {aplic.tipos?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                      {aplic.tipos.map(t=>(
                        <span key={t} style={{ padding:'2px 7px', borderRadius:999, background:'#fce7f3', border:'1px solid #f9a8d4', color:'#be185d', fontSize:'.68rem', fontWeight:600 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {aplic.fornecedor_id && fornecedores.find(f=>String(f.id)===String(aplic.fornecedor_id)) && (
                    <p style={{ margin:'0 0 4px', fontSize:'.72rem', color:'#6b7280' }}>
                      Fornec.: <b>{fornecedores.find(f=>String(f.id)===String(aplic.fornecedor_id))?.nome}</b>
                    </p>
                  )}
                  {op.data_entrega && (
                    <p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>
                      Entrega: {new Date(op.data_entrega+'T12:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fornecedores de aplicação */}
      {fornecedores.length > 0 && (
        <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
          <p style={{ margin:'0 0 12px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Fornecedores de Aplicação</p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {fornecedores.map(f => {
              const ativos = envios.filter(e=>e.fornecedor_nome===f.nome&&e.status==='enviado').length;
              return (
                <div key={f.id} style={{ padding:'10px 16px', borderRadius:10, border:`1px solid ${ativos?'#f9a8d4':'#e5e7eb'}`, background:ativos?'#fdf2f8':'#f9fafb', display:'flex', alignItems:'center', gap:10, minWidth:200 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#ec4899,#db2777)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.8rem', fontWeight:700, flexShrink:0 }}>
                    {f.nome.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'.82rem', fontWeight:700, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.nome}</p>
                    <p style={{ margin:0, fontSize:'.68rem', color:'#6b7280' }}>{ativos ? `${ativos} OP(s) em produção` : 'Disponível'}</p>
                  </div>
                  {ativos>0 && <span style={{ padding:'2px 7px', borderRadius:999, background:'#ec4899', color:'#fff', fontSize:'.65rem', fontWeight:700, marginLeft:'auto', flexShrink:0 }}>{ativos}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de envios */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.07)', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'#111827' }}>Envios para Aplicação
            <span style={{ marginLeft:8, fontSize:'.75rem', fontWeight:400, color:'#6b7280' }}>{envios.length} registros</span>
          </span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
              {['Fornecedor','OP','Peças','Enviado em','Retorno previsto','Status','Ações'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {envios.length===0
                ? <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>Nenhum envio. Clique em "Novo Envio" para começar.</td></tr>
                : envios.map(e => {
                  const st=stInfo(e); const atr=isAtr(e);
                  return (
                    <tr key={e.id} style={{ borderBottom:'1px solid #f1f5f9', background:atr?'#fff5f5':'transparent' }}
                      onMouseEnter={ev=>ev.currentTarget.style.background=atr?'#fee2e2':'#f9fafb'}
                      onMouseLeave={ev=>ev.currentTarget.style.background=atr?'#fff5f5':'transparent'}>
                      <td style={{ ...TD, fontWeight:700, color:'#111827' }}>{e.fornecedor_nome}</td>
                      <td style={{ ...TD, fontFamily:'monospace', fontSize:'.8rem', color:'#6b7280' }}>{e.op_numero}</td>
                      <td style={TD}>{e.total}</td>
                      <td style={{ ...TD, fontSize:'.78rem', color:'#9ca3af' }}>{e.data_envio ? new Date(e.data_envio+'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td style={{ ...TD, fontSize:'.78rem', fontWeight:atr?700:400, color:atr?'#dc2626':'#9ca3af' }}>
                        {e.data_retorno ? new Date(e.data_retorno+'T12:00').toLocaleDateString('pt-BR') : '—'}{atr&&' ⚠'}
                      </td>
                      <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:st.bg, color:st.text }}>{st.label}</span></td>
                      <td style={TD}>
                        {e.status==='enviado' && (
                          <button onClick={()=>{ setEnvioSel(e); setRetorno({}); setModal('retorno'); }}
                            style={{ padding:'5px 12px', borderRadius:6, background:'#fdf2f8', color:'#ec4899', border:'1px solid #f9a8d4', fontSize:'.75rem', fontWeight:600, cursor:'pointer' }}>↩ Retorno</button>
                        )}
                        {e.status==='retornado' && (
                          <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>
                            ✓ Concluído{e.divergencias?.length>0&&<span style={{ marginLeft:5, padding:'2px 6px', borderRadius:999, background:'#fef2f2', color:'#dc2626', fontSize:'.68rem', fontWeight:700 }}>{e.divergencias.length} div.</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo envio */}
      {modal==='envio' && (
        <ModalOverlay onClose={()=>setModal(null)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:700, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>Novo Envio para Aplicação</h3>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>
            <div style={{ display:'flex', padding:'0 22px', borderBottom:'1px solid #f1f5f9' }}>
              {['Fornecedor & OP','Grade de peças','Confirmação'].map((a,i) => (
                <button key={i} onClick={()=>setStep(i)}
                  style={{ padding:'10px 14px', border:'none', background:'none', fontSize:'.82rem', fontWeight:step===i?700:400, color:step===i?'#ec4899':'#6b7280', borderBottom:`2px solid ${step===i?'#ec4899':'transparent'}`, cursor:'pointer', marginBottom:-1 }}>
                  {i+1}. {a}
                </button>
              ))}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>

              {/* Passo 1 */}
              {step===0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Fornecedor de Aplicação *</label>
                    <select value={form.fornecedor?.id||''} onChange={e=>setForm(f=>({...f,fornecedor:fornecedores.find(x=>String(x.id)===e.target.value)||null}))}
                      style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                      <option value="">Selecione o fornecedor...</option>
                      {fornecedores.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                    {fornecedores.length===0&&<p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>Nenhum fornecedor cadastrado. Acesse Fornecedores → setor Aplicação.</p>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Ordem de Produção *</label>
                    <select value={form.op?.id||''} onChange={e=>{
                      const op = opsDisp.find(x=>String(x.id)===e.target.value)||null;
                      gradeSourceRef.current = null;
                      setForm(f=>({...f, op, grade:{}}));
                    }} style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                      <option value="">Selecione a OP...</option>
                      {opsDisp.map(o=><option key={o.id} value={o.id}>{o.numero} — {o.cliente_nome}</option>)}
                    </select>
                    {opsDisp.length===0&&<p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>Nenhuma OP na fase de Aplicação.</p>}
                    {form.op && (
                      <div style={{ padding:'8px 12px', borderRadius:8, background:'#fdf2f8', border:'1px solid #f9a8d4', fontSize:'.78rem', color:'#374151', display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                        <div><span style={{ color:'#6b7280' }}>OP: </span><b>{form.op.numero}</b></div>
                        <div><span style={{ color:'#6b7280' }}>Cliente: </span><b>{form.op.cliente_nome}</b></div>
                        <div><span style={{ color:'#6b7280' }}>Fase: </span>{form.op.fase_atual}</div>
                        {form.op.aplicacao_json?.tipos?.length>0 && (
                          <div><span style={{ color:'#6b7280' }}>Tipos: </span>{form.op.aplicacao_json.tipos.join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[{ label:'Data de envio', key:'data_envio' },{ label:'Retorno previsto', key:'data_retorno' }].map(f=>(
                      <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>{f.label}</label>
                        <input type="date" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                          style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', boxSizing:'border-box' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Observações</label>
                    <textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={2}
                      style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical' }} />
                  </div>
                </div>
              )}

              {/* Passo 2 */}
              {step===1 && (
                <GradeInput cores={opCores} tamanhos={opTams} grade={form.grade} onChange={setGrade} loading={loadingRefs} />
              )}

              {/* Passo 3 */}
              {step===2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'#fdf2f8', border:'1px solid #f9a8d4' }}>
                    <p style={{ margin:'0 0 10px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Resumo do envio</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'.8rem', color:'#374151' }}>
                      <div><span style={{ color:'#6b7280' }}>Fornecedor: </span><b>{form.fornecedor?.nome||'—'}</b></div>
                      <div><span style={{ color:'#6b7280' }}>OP: </span><b>{form.op?.numero||'—'}</b></div>
                      <div><span style={{ color:'#6b7280' }}>Cliente: </span>{form.op?.cliente_nome||'—'}</div>
                      <div><span style={{ color:'#6b7280' }}>Total peças: </span><b style={{ color:'#ec4899' }}>{totalG(form.grade)}</b></div>
                      <div><span style={{ color:'#6b7280' }}>Envio: </span>{form.data_envio ? new Date(form.data_envio+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
                      <div><span style={{ color:'#6b7280' }}>Retorno previsto: </span>{form.data_retorno ? new Date(form.data_retorno+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
                    </div>
                    {form.op?.aplicacao_json?.tipos?.length>0 && (
                      <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
                        {form.op.aplicacao_json.tipos.map(t=>(
                          <span key={t} style={{ padding:'2px 8px', borderRadius:999, background:'#fce7f3', border:'1px solid #f9a8d4', color:'#be185d', fontSize:'.72rem', fontWeight:600 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {opCores.length > 0 && totalG(form.grade) > 0 && (
                    <div>
                      <p style={{ margin:'0 0 8px', fontSize:'.78rem', fontWeight:700, color:'#374151' }}>Total por cor:</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {opCores.map(cor => {
                          const tot = opTams.reduce((s, t) => s + (Number(form.grade[cor]?.[t])||0), 0);
                          return tot > 0 ? (
                            <div key={cor} style={{ padding:'6px 14px', borderRadius:8, background:'#fdf2f8', border:'1px solid #f9a8d4', fontSize:'.8rem' }}>
                              <b>{cor}:</b> {tot} pcs
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {totalG(form.grade)===0 && (
                    <div style={{ padding:'10px 14px', borderRadius:8, background:'#fef3c7', border:'1px solid #fcd34d', fontSize:'.8rem', color:'#92400e' }}>
                      ⚠️ Grade vazia — volte e preencha as quantidades.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
              <div>{step>0&&<button onClick={()=>setStep(s=>s-1)} style={{ padding:'7px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:'.85rem', cursor:'pointer' }}>← Anterior</button>}</div>
              {step<2
                ? <button onClick={()=>setStep(s=>s+1)} style={{ padding:'7px 22px', borderRadius:8, background:'#ec4899', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>Próximo →</button>
                : <button onClick={confirmarEnvio} disabled={saving} style={{ padding:'7px 22px', borderRadius:8, background:saving?'#9ca3af':'#ec4899', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
                    {saving ? 'Salvando...' : '✓ Confirmar Envio'}
                  </button>}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal retorno */}
      {modal==='retorno' && envioSel && (
        <ModalOverlay onClose={()=>setModal(null)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ margin:'0 0 2px', fontSize:'1rem', fontWeight:700 }}>Conferência de Retorno — {envioSel.fornecedor_nome}</h3>
                <p style={{ margin:0, fontSize:'.75rem', color:'#6b7280' }}>OP {envioSel.op_numero}</p>
              </div>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ margin:0, fontSize:'.85rem', color:'#6b7280' }}>Compare enviado × retornado. Preencha as quantidades recebidas.</p>
              {envioTams.length > 0 && (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ borderCollapse:'collapse', fontSize:'.82rem', width:'100%' }}>
                    <thead><tr style={{ background:'#f8fafc' }}>
                      <th style={{ ...thS, textAlign:'left' }}>Cor / Situação</th>
                      {envioTams.map(t=><th key={t} style={thS}>{t}</th>)}
                      <th style={thS}>Total</th>
                    </tr></thead>
                    <tbody>
                      {allCores.flatMap(cor => [
                        <tr key={`e-${cor}`} style={{ background:'#f8fafc' }}>
                          <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', fontSize:'.72rem', color:'#6b7280', fontStyle:'italic' }}>{cor} (enviado)</td>
                          {envioTams.map(t=><td key={t} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', color:'#6b7280' }}>{envioSel.grade[cor]?.[t]||0}</td>)}
                          <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:600, color:'#6b7280' }}>{envioTams.reduce((s,t)=>s+(Number(envioSel.grade[cor]?.[t])||0),0)}</td>
                        </tr>,
                        <tr key={`r-${cor}`}>
                          <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827' }}>{cor} (retornado)</td>
                          {envioTams.map(t=>(
                            <td key={t} style={{ border:'1px solid #e5e7eb', padding:'3px 5px', textAlign:'center' }}>
                              <input type="number" min="0" value={retorno[cor]?.[t]||''}
                                onChange={e=>setRetorno(r=>({...r,[cor]:{...(r[cor]||{}),[t]:e.target.value}}))}
                                style={{ width:46, textAlign:'center', padding:'3px', borderRadius:5, border:'1px solid #d1d5db', fontSize:'.82rem', outline:'none' }} />
                            </td>
                          ))}
                          <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#ec4899' }}>{envioTams.reduce((s,t)=>s+(Number(retorno[cor]?.[t])||0),0)}</td>
                        </tr>,
                      ])}
                    </tbody>
                  </table>
                </div>
              )}
              {divs.length>0 && (
                <div style={{ padding:'12px 14px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca' }}>
                  <p style={{ margin:'0 0 8px', fontSize:'.8rem', fontWeight:700, color:'#dc2626' }}>⚠ {divs.length} divergência(s):</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {divs.map((d,i)=><span key={i} style={{ padding:'3px 8px', borderRadius:999, background:'#fef2f2', border:'1px solid #fecaca', fontSize:'.75rem', color:'#dc2626' }}>{d.cor}/{d.tam}: env.{d.env} ret.{d.ret} ({d.diff>=0?'+':''}{d.diff})</span>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={()=>setModal(null)} style={{ padding:'7px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:'.85rem', cursor:'pointer' }}>Cancelar</button>
              <button onClick={confirmarRetorno} style={{ padding:'7px 22px', borderRadius:8, background:'#ec4899', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>✓ Confirmar Retorno</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
