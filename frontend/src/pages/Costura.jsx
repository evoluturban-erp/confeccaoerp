import { useState, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const TAMANHOS = ['PP','P','M','G','GG','XGG'];
const thS = { padding:'8px 12px', fontWeight:700, color:'#374151', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'.72rem', textTransform:'uppercase' };

function ModalOverlay({ onClose, children }) {
  const op = useOverlayClose(onClose);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} {...op}>
      {children}
    </div>
  );
}

function GradeInput({ cores, grade, onChange }) {
  if (!cores.length) return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>Selecione uma OP na etapa anterior.</p>;
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', fontSize:'.82rem' }}>
        <thead><tr style={{ background:'#f8fafc' }}>
          <th style={{ ...thS, textAlign:'left' }}>Cor</th>
          {TAMANHOS.map(t => <th key={t} style={thS}>{t}</th>)}
          <th style={thS}>Total</th>
        </tr></thead>
        <tbody>{cores.map(cor => {
          const rowTotal = TAMANHOS.reduce((s, t) => s + (Number(grade[cor]?.[t])||0), 0);
          return (
            <tr key={cor}>
              <td style={{ padding:'7px 12px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827', whiteSpace:'nowrap' }}>{cor}</td>
              {TAMANHOS.map(t => (
                <td key={t} style={{ border:'1px solid #e5e7eb', padding:'4px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={grade[cor]?.[t]||''} onChange={e => onChange(cor, t, e.target.value)}
                    style={{ width:48, textAlign:'center', padding:'4px', borderRadius:5, border:'1px solid #d1d5db', fontSize:'.82rem', outline:'none' }} />
                </td>
              ))}
              <td style={{ padding:'7px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#16a34a' }}>{rowTotal}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

const FORM0 = { faccao:null, op:null, data_envio:new Date().toISOString().split('T')[0], data_retorno:'', grade:{}, obs:'' };

export default function Costura() {
  const { setAction, clearAction } = useTopbar();
  const [modal, setModal]       = useState(null);
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(FORM0);
  const [envios, setEnvios]     = useState([]);
  const [envioSel, setEnvioSel] = useState(null);
  const [retorno, setRetorno]   = useState({});

  const { data: fornecedores=[] } = useApiQuery(['forn-costura'], () => api.get('/fornecedores'));
  const { data: ordens=[] }       = useApiQuery(['ordens-costura'], () => api.get('/ordens'));

  const faccoes = fornecedores;
  const opsDisp = ordens.filter(o => ['Cadastrada','Corte','Costura'].includes(o.fase_atual));
  const cores   = form.op ? Object.keys(form.op.grade||{}) : [];

  useEffect(() => {
    setAction({ label:'Novo Envio', onClick:() => { setForm(FORM0); setStep(0); setModal('envio'); } });
    return () => clearAction();
  }, []);

  const setGrade = (cor, tam, val) => setForm(f => ({ ...f, grade:{ ...f.grade, [cor]:{ ...(f.grade[cor]||{}), [tam]:val } } }));
  const totalG   = (g) => Object.values(g).reduce((s,t) => s + Object.values(t).reduce((a,b) => a+(Number(b)||0), 0), 0);
  const isAtr    = (e) => e.data_retorno && new Date(e.data_retorno+'T23:59') < new Date() && e.status==='enviado';

  const stInfo = (e) => {
    if (isAtr(e)) return { bg:'#fef2f2', text:'#dc2626', label:'Atrasado' };
    return { enviado:{ bg:'#fef3c7', text:'#d97706', label:'Em produção' }, retornado:{ bg:'#f0fdf4', text:'#16a34a', label:'Retornado' } }[e.status] || { bg:'#f3f4f6', text:'#374151', label:e.status };
  };

  const confirmarEnvio = () => {
    if (!form.faccao||!form.op) { alert('Selecione facção e OP'); return; }
    setEnvios(p => [...p, { id:Date.now(), faccao_nome:form.faccao.nome||form.faccao.razao_social, op_numero:form.op.numero_op, data_envio:form.data_envio, data_retorno:form.data_retorno, grade:form.grade, total:totalG(form.grade), status:'enviado', obs:form.obs }]);
    setModal(null);
  };

  const calcDiv = () => {
    if (!envioSel) return [];
    return Object.keys(envioSel.grade||{}).flatMap(cor =>
      TAMANHOS.map(t => { const e=Number(envioSel.grade[cor]?.[t])||0, r=Number(retorno[cor]?.[t])||0; return e!==r ? {cor,tam:t,env:e,ret:r,diff:r-e} : null; }).filter(Boolean)
    );
  };

  const confirmarRetorno = () => {
    setEnvios(p => p.map(e => e.id===envioSel.id ? { ...e, status:'retornado', retorno, divergencias:calcDiv() } : e));
    setModal(null); setEnvioSel(null); setRetorno({});
  };

  const divs     = calcDiv();
  const allCores = envioSel ? Object.keys(envioSel.grade||{}) : [];
  const TD = { padding:'10px 14px', fontSize:'.85rem', color:'#374151', verticalAlign:'middle' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Em produção', val:envios.filter(e=>e.status==='enviado'&&!isAtr(e)).length, cor:'#d97706', icon:'🚀' },
          { label:'Atrasados',   val:envios.filter(e=>isAtr(e)).length, cor:'#dc2626', icon:'⚠' },
          { label:'Retornados',  val:envios.filter(e=>e.status==='retornado').length, cor:'#16a34a', icon:'✓' },
          { label:'Total envios',val:envios.length, cor:'#7c3aed', icon:'📦' },
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

      {/* Facções */}
      {faccoes.length > 0 && (
        <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
          <p style={{ margin:'0 0 12px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Facções cadastradas</p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {faccoes.map(f => {
              const nome = f.nome||f.razao_social||'?';
              const ativos = envios.filter(e=>e.faccao_nome===nome&&e.status==='enviado').length;
              return (
                <div key={f.id} style={{ padding:'10px 16px', borderRadius:10, border:`1px solid ${ativos?'#fcd34d':'#e5e7eb'}`, background:ativos?'#fef3c7':'#f9fafb', display:'flex', alignItems:'center', gap:10, minWidth:180 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.8rem', fontWeight:700, flexShrink:0 }}>
                    {nome.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:'.82rem', fontWeight:700, color:'#111827' }}>{nome}</p>
                    <p style={{ margin:0, fontSize:'.68rem', color:'#6b7280' }}>{ativos ? `${ativos} OP(s) em produção` : 'Disponível'}</p>
                  </div>
                  {ativos>0 && <span style={{ padding:'2px 7px', borderRadius:999, background:'#d97706', color:'#fff', fontSize:'.65rem', fontWeight:700, marginLeft:'auto', flexShrink:0 }}>{ativos}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.07)', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'#111827' }}>Envios para Facção
            <span style={{ marginLeft:8, fontSize:'.75rem', fontWeight:400, color:'#6b7280' }}>{envios.length} registros</span>
          </span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
              {['Facção','OP','Peças','Enviado em','Retorno previsto','Status','Ações'].map(h => (
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
                      <td style={{ ...TD, fontWeight:700, color:'#111827' }}>{e.faccao_nome}</td>
                      <td style={{ ...TD, fontFamily:'monospace', fontSize:'.8rem', color:'#6b7280' }}>#{e.op_numero||'—'}</td>
                      <td style={TD}>{e.total}</td>
                      <td style={{ ...TD, fontSize:'.78rem', color:'#9ca3af' }}>{e.data_envio ? new Date(e.data_envio+'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td style={{ ...TD, fontSize:'.78rem', fontWeight:atr?700:400, color:atr?'#dc2626':'#9ca3af' }}>
                        {e.data_retorno ? new Date(e.data_retorno+'T12:00').toLocaleDateString('pt-BR') : '—'}{atr&&' ⚠'}
                      </td>
                      <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:st.bg, color:st.text }}>{st.label}</span></td>
                      <td style={TD}>
                        {e.status==='enviado' && (
                          <button onClick={() => { setEnvioSel(e); setRetorno({}); setModal('retorno'); }}
                            style={{ padding:'5px 12px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', fontSize:'.75rem', fontWeight:600, cursor:'pointer' }}>↩ Retorno</button>
                        )}
                        {e.status==='retornado' && (
                          <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>
                            ✓ Concluído{e.divergencias?.length>0 && <span style={{ marginLeft:5, padding:'2px 6px', borderRadius:999, background:'#fef2f2', color:'#dc2626', fontSize:'.68rem', fontWeight:700 }}>{e.divergencias.length} div.</span>}
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
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>Novo Envio para Facção</h3>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>
            <div style={{ display:'flex', padding:'0 22px', borderBottom:'1px solid #f1f5f9' }}>
              {['Facção & OP','Grade de peças','Confirmação'].map((a,i) => (
                <button key={i} onClick={()=>setStep(i)} style={{ padding:'10px 14px', border:'none', background:'none', fontSize:'.82rem', fontWeight:step===i?700:400, color:step===i?'#16a34a':'#6b7280', borderBottom:`2px solid ${step===i?'#16a34a':'transparent'}`, cursor:'pointer', marginBottom:-1 }}>
                  {i+1}. {a}
                </button>
              ))}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
              {step===0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { label:'Facção *', sel:faccoes, val:form.faccao?.id||'', set:(f,v)=>({...f,faccao:faccoes.find(x=>String(x.id)===v)||null}), opt:f=>f.nome||f.razao_social },
                    { label:'Ordem de Produção *', sel:opsDisp, val:form.op?.id||'', set:(f,v)=>({...f,op:opsDisp.find(x=>String(x.id)===v)||null,grade:{}}), opt:o=>`#${o.numero_op} — ${o.cliente_nome}` },
                  ].map(({ label, sel, val, set, opt }) => (
                    <div key={label} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>{label}</label>
                      <select value={val} onChange={e=>setForm(f=>set(f,e.target.value))} style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                        <option value="">Selecione...</option>
                        {sel.map(x=><option key={x.id} value={x.id}>{opt(x)}</option>)}
                      </select>
                    </div>
                  ))}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[{ label:'Data de envio', key:'data_envio' },{ label:'Retorno previsto', key:'data_retorno' }].map(f => (
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
              {step===1 && <GradeInput cores={cores} grade={form.grade} onChange={setGrade} />}
              {step===2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                    <p style={{ margin:'0 0 8px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Resumo do envio</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:'.8rem', color:'#374151' }}>
                      <div><span style={{ color:'#6b7280' }}>Facção: </span>{form.faccao?.nome||form.faccao?.razao_social||'—'}</div>
                      <div><span style={{ color:'#6b7280' }}>OP: </span>#{form.op?.numero_op||'—'}</div>
                      <div><span style={{ color:'#6b7280' }}>Total peças: </span><b>{totalG(form.grade)}</b></div>
                      <div><span style={{ color:'#6b7280' }}>Retorno: </span>{form.data_retorno ? new Date(form.data_retorno+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
                    </div>
                  </div>
                  {totalG(form.grade)===0 && <div style={{ padding:'10px 14px', borderRadius:8, background:'#fef3c7', border:'1px solid #fcd34d', fontSize:'.8rem', color:'#92400e' }}>⚠️ Grade vazia — volte e preencha as quantidades.</div>}
                </div>
              )}
            </div>
            <div style={{ padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
              <div>{step>0&&<button onClick={()=>setStep(s=>s-1)} style={{ padding:'7px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:'.85rem', cursor:'pointer' }}>← Anterior</button>}</div>
              {step<2 ? <button onClick={()=>setStep(s=>s+1)} style={{ padding:'7px 22px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>Próximo →</button>
                      : <button onClick={confirmarEnvio} style={{ padding:'7px 22px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>✓ Confirmar Envio</button>}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal retorno */}
      {modal==='retorno' && envioSel && (
        <ModalOverlay onClose={()=>setModal(null)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>Conferência de Retorno — {envioSel.faccao_nome}</h3>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ margin:0, fontSize:'.85rem', color:'#6b7280' }}>Compare enviado × retornado. Preencha as quantidades recebidas.</p>
              <div style={{ overflowX:'auto' }}>
                <table style={{ borderCollapse:'collapse', fontSize:'.82rem', width:'100%' }}>
                  <thead><tr style={{ background:'#f8fafc' }}>
                    <th style={{ ...thS, textAlign:'left' }}>Cor / Situação</th>
                    {TAMANHOS.map(t=><th key={t} style={thS}>{t}</th>)}
                    <th style={thS}>Total</th>
                  </tr></thead>
                  <tbody>
                    {allCores.flatMap(cor => [
                      <tr key={`e-${cor}`} style={{ background:'#f8fafc' }}>
                        <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', fontSize:'.72rem', color:'#6b7280', fontStyle:'italic' }}>{cor} (enviado)</td>
                        {TAMANHOS.map(t=><td key={t} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', color:'#6b7280' }}>{envioSel.grade[cor]?.[t]||0}</td>)}
                        <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:600, color:'#6b7280' }}>{TAMANHOS.reduce((s,t)=>s+(Number(envioSel.grade[cor]?.[t])||0),0)}</td>
                      </tr>,
                      <tr key={`r-${cor}`}>
                        <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827' }}>{cor} (retornado)</td>
                        {TAMANHOS.map(t => (
                          <td key={t} style={{ border:'1px solid #e5e7eb', padding:'3px 5px', textAlign:'center' }}>
                            <input type="number" min="0" value={retorno[cor]?.[t]||''}
                              onChange={e=>setRetorno(r=>({...r,[cor]:{...(r[cor]||{}),[t]:e.target.value}}))}
                              style={{ width:46, textAlign:'center', padding:'3px', borderRadius:5, border:'1px solid #d1d5db', fontSize:'.82rem', outline:'none' }} />
                          </td>
                        ))}
                        <td style={{ padding:'6px 12px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#16a34a' }}>{TAMANHOS.reduce((s,t)=>s+(Number(retorno[cor]?.[t])||0),0)}</td>
                      </tr>
                    ])}
                  </tbody>
                </table>
              </div>
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
              <button onClick={confirmarRetorno} style={{ padding:'7px 22px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>✓ Confirmar Retorno</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
