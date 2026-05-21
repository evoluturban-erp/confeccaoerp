import { useState, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const QR = ({ data, size=100 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`}
    width={size} height={size} alt="QR PIX" style={{ borderRadius:4, border:'1px solid #e5e7eb', display:'block' }} />
);

const fmt = (v) => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const FORMAS_PGT = ['PIX','Boleto','Dinheiro','Cartão de Crédito','Cartão de Débito','Transferência'];

const ITEM0 = { descricao:'', quantidade:1, valor_unit:'' };
const FORM0 = { cliente:'', numero:'', data_emissao:new Date().toISOString().split('T')[0], data_vencimento:'', obs:'', itens:[{...ITEM0}], forma_pgto:'PIX', chave_pix:'', banco:'' };

/* ─── Recibo viewer ─────────────────────────────────────────── */
function ReciboViewer({ doc, onClose }) {
  if (!doc) return null;
  const itens    = doc.itens || [{ descricao: doc.descricao||'Serviços prestados', quantidade:1, valor_unit:doc.valor||0 }];
  const subtotal = itens.reduce((s,it)=>s+(Number(it.quantidade||1)*Number(it.valor_unit||0)),0);
  const desconto = Number(doc.desconto||0);
  const total    = subtotal - desconto;
  const qrPix    = doc.chave_pix ? `00020126${doc.chave_pix}` : `PIX:${fmt(total)}`;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:620, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'#111827' }}>Visualizar Recibo</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>window.print()} style={{ padding:'6px 14px', borderRadius:7, background:'#16a34a', color:'#fff', border:'none', fontSize:'.8rem', fontWeight:600, cursor:'pointer' }}>🖨 Imprimir</button>
            <button onClick={onClose} style={{ padding:'6px 14px', borderRadius:7, background:'#f3f4f6', color:'#374151', border:'none', fontSize:'.8rem', cursor:'pointer' }}>Fechar</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Recibo */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', fontFamily:'serif' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#071e0f,#0f3a1a)', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'#fff' }}>🧵 ConfecçãoERP</p>
                <p style={{ margin:0, fontSize:'.7rem', color:'rgba(255,255,255,.5)' }}>Gestão Têxtil Integrada</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ margin:0, fontSize:'.75rem', color:'rgba(255,255,255,.7)' }}>RECIBO</p>
                <p style={{ margin:0, fontSize:'1.1rem', fontWeight:800, color:'#22c55e' }}>#{doc.numero||doc.id}</p>
              </div>
            </div>
            {/* Dados */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid #f1f5f9', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:'.82rem' }}>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:'.65rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px' }}>Cliente / Pagador</p>
                <p style={{ margin:0, fontWeight:700, color:'#111827' }}>{doc.cliente||doc.descricao||'—'}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ margin:'0 0 2px', fontSize:'.65rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px' }}>Emissão / Vencimento</p>
                <p style={{ margin:0, color:'#374151' }}>
                  {doc.data_emissao ? new Date(doc.data_emissao+'T12:00').toLocaleDateString('pt-BR') : new Date(doc.created_at||Date.now()).toLocaleDateString('pt-BR')}
                  {doc.data_vencimento && <> / <span style={{ color: new Date(doc.data_vencimento+'T23:59')<new Date()&&doc.status!=='pago'?'#dc2626':'#374151', fontWeight:700 }}>{new Date(doc.data_vencimento+'T12:00').toLocaleDateString('pt-BR')}</span></>}
                </p>
              </div>
            </div>
            {/* Itens */}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.82rem' }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                <th style={{ padding:'8px 14px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase' }}>Descrição</th>
                <th style={{ padding:'8px 10px', textAlign:'center', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase' }}>Qtd</th>
                <th style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase' }}>Unit.</th>
                <th style={{ padding:'8px 14px', textAlign:'right', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase' }}>Total</th>
              </tr></thead>
              <tbody>
                {itens.map((it,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 14px', color:'#374151' }}>{it.descricao||'—'}</td>
                    <td style={{ padding:'9px 10px', textAlign:'center', color:'#6b7280' }}>{it.quantidade||1}</td>
                    <td style={{ padding:'9px 10px', textAlign:'right', color:'#6b7280' }}>{fmt(it.valor_unit)}</td>
                    <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:600, color:'#374151' }}>{fmt(Number(it.quantidade||1)*Number(it.valor_unit||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totais */}
            <div style={{ padding:'14px 22px', borderTop:'2px solid #e5e7eb', display:'flex', justifyContent:'flex-end' }}>
              <div style={{ minWidth:200 }}>
                {[[  'Subtotal', fmt(subtotal)], desconto>0 && ['Desconto', `-${fmt(desconto)}`]].filter(Boolean).map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'.8rem', color:'#6b7280', marginBottom:4 }}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0', marginTop:6 }}>
                  <span style={{ fontSize:'.9rem', fontWeight:700, color:'#16a34a' }}>TOTAL</span>
                  <span style={{ fontSize:'1rem', fontWeight:800, color:'#16a34a' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
            {/* PIX / Pagamento */}
            {(doc.forma_pgto||doc.chave_pix) && (
              <div style={{ padding:'14px 22px', borderTop:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:16 }}>
                {doc.chave_pix && <QR data={qrPix} size={90} />}
                <div>
                  <p style={{ margin:'0 0 4px', fontSize:'.7rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px' }}>Forma de pagamento</p>
                  <p style={{ margin:0, fontSize:'.85rem', fontWeight:700, color:'#374151' }}>{doc.forma_pgto||'PIX'}</p>
                  {doc.chave_pix && <p style={{ margin:'3px 0 0', fontSize:'.78rem', color:'#6b7280' }}>Chave PIX: {doc.chave_pix}</p>}
                  {doc.banco && <p style={{ margin:'2px 0 0', fontSize:'.75rem', color:'#6b7280' }}>Banco: {doc.banco}</p>}
                </div>
              </div>
            )}
            {/* Assinaturas */}
            <div style={{ padding:'20px 22px', borderTop:'1px solid #f1f5f9', display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
              {['Pagador','Empresa'].map(r=>(
                <div key={r} style={{ textAlign:'center' }}>
                  <div style={{ borderTop:'1px solid #9ca3af', paddingTop:4 }}>
                    <p style={{ margin:0, fontSize:'.68rem', color:'#9ca3af' }}>{r}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Novo Recibo ──────────────────────────────────────── */
function ModalNovoRecibo({ onClose, onSave }) {
  const [aba, setAba]   = useState(0);
  const [form, setForm] = useState(FORM0);

  const setItem  = (i, key, val) => setForm(f => { const itens=[...f.itens]; itens[i]={...itens[i],[key]:val}; return {...f,itens}; });
  const addItem  = ()            => setForm(f => ({...f,itens:[...f.itens,{...ITEM0}]}));
  const remItem  = (i)           => setForm(f => ({...f,itens:f.itens.filter((_,j)=>j!==i)}));

  const subtotal = form.itens.reduce((s,it)=>s+(Number(it.quantidade||1)*Number(it.valor_unit||0)),0);
  const desconto = Number(form.desconto||0);
  const total    = subtotal - desconto;

  const salvar = () => {
    if (!form.cliente) { alert('Informe o cliente'); return; }
    onSave({ ...form, valor:total, subtotal, status:'pendente', created_at:new Date().toISOString() });
    onClose();
  };

  const Inp = ({ label, ...p }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      {label&&<label style={{ fontSize:'.75rem', fontWeight:600, color:'#374151' }}>{label}</label>}
      <input style={{ padding:'7px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', width:'100%', boxSizing:'border-box' }} {...p} />
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:640, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>Novo Recibo</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
        </div>
        <div style={{ display:'flex', padding:'0 22px', borderBottom:'1px solid #f1f5f9' }}>
          {['Dados gerais','Itens','Pagamento'].map((a,i) => (
            <button key={i} onClick={()=>setAba(i)} style={{ padding:'10px 14px', border:'none', background:'none', fontSize:'.82rem', fontWeight:aba===i?700:400, color:aba===i?'#16a34a':'#6b7280', borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`, cursor:'pointer', marginBottom:-1 }}>
              {i+1}. {a}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
          {aba===0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <Inp label="Cliente / Pagador *" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))} placeholder="Nome do cliente ou empresa" />
              <Inp label="Número do documento" value={form.numero} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} placeholder="Ex: 001" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Inp label="Data de emissão" type="date" value={form.data_emissao} onChange={e=>setForm(f=>({...f,data_emissao:e.target.value}))} />
                <Inp label="Data de vencimento" type="date" value={form.data_vencimento} onChange={e=>setForm(f=>({...f,data_vencimento:e.target.value}))} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <label style={{ fontSize:'.75rem', fontWeight:600, color:'#374151' }}>Observações</label>
                <textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={2}
                  style={{ padding:'7px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical' }} />
              </div>
            </div>
          )}
          {aba===1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {form.itens.map((it,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 70px 100px auto', gap:8, alignItems:'end' }}>
                  <Inp label={i===0?'Descrição':''} value={it.descricao} onChange={e=>setItem(i,'descricao',e.target.value)} placeholder="Descrição do item" />
                  <Inp label={i===0?'Qtd':''} type="number" min="1" value={it.quantidade} onChange={e=>setItem(i,'quantidade',e.target.value)} />
                  <Inp label={i===0?'Valor unit. (R$)':''} type="number" min="0" step="0.01" value={it.valor_unit} onChange={e=>setItem(i,'valor_unit',e.target.value)} placeholder="0,00" />
                  <button onClick={()=>remItem(i)} disabled={form.itens.length===1}
                    style={{ padding:'7px 10px', borderRadius:7, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', fontSize:'.75rem', cursor:'pointer', marginTop:i===0?18:0 }}>✕</button>
                </div>
              ))}
              <button onClick={addItem} style={{ padding:'7px 14px', borderRadius:7, background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', fontSize:'.8rem', fontWeight:600, cursor:'pointer', alignSelf:'flex-start' }}>+ Adicionar item</button>
              <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:12, marginTop:4 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Inp label="Desconto (R$)" type="number" min="0" step="0.01" value={form.desconto||''} onChange={e=>setForm(f=>({...f,desconto:e.target.value}))} placeholder="0,00" />
                  <div style={{ padding:'10px 14px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <p style={{ margin:0, fontSize:'.7rem', color:'#6b7280' }}>Total do recibo</p>
                    <p style={{ margin:0, fontSize:'1.1rem', fontWeight:800, color:'#16a34a' }}>{fmt(total)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {aba===2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:'.75rem', fontWeight:600, color:'#374151' }}>Forma de pagamento</label>
                <select value={form.forma_pgto} onChange={e=>setForm(f=>({...f,forma_pgto:e.target.value}))}
                  style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                  {FORMAS_PGT.map(fp=><option key={fp} value={fp}>{fp}</option>)}
                </select>
              </div>
              {form.forma_pgto==='PIX' && (
                <>
                  <Inp label="Chave PIX" value={form.chave_pix||''} onChange={e=>setForm(f=>({...f,chave_pix:e.target.value}))} placeholder="CPF, CNPJ, telefone ou e-mail" />
                  <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
                    <QR data={`PIX:${form.chave_pix||'chave'}:${fmt(total)}`} size={100} />
                  </div>
                </>
              )}
              <Inp label="Banco / Instituição" value={form.banco||''} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} placeholder="Ex: Nubank, Bradesco..." />
              <div style={{ padding:'12px 14px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                <p style={{ margin:0, fontSize:'.82rem', color:'#374151' }}><b>Total: </b><span style={{ color:'#16a34a', fontWeight:700 }}>{fmt(total)}</span> via <b>{form.forma_pgto}</b></p>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
          <div>{aba>0&&<button onClick={()=>setAba(a=>a-1)} style={{ padding:'7px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:'.85rem', cursor:'pointer' }}>← Anterior</button>}</div>
          {aba<2 ? <button onClick={()=>setAba(a=>a+1)} style={{ padding:'7px 22px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>Próximo →</button>
                 : <button onClick={salvar} style={{ padding:'7px 22px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:'pointer' }}>✓ Criar Recibo</button>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function Faturamento() {
  const { setAction, clearAction } = useTopbar();
  const [aba, setAba]         = useState(0);
  const [filtroStatus, setFs] = useState('');
  const [filtroForma, setFf]  = useState('');
  const [viewer, setViewer]   = useState(null);
  const [novoModal, setNovo]  = useState(false);
  const [extras, setExtras]   = useState([]);

  const { data: receber=[], isLoading, refetch } = useApiQuery(['receber-fat'], () => api.get('/financeiro/receber'));

  const todos    = [...receber, ...extras];
  const kpis     = { total:todos.length, valor:todos.reduce((s,d)=>s+(Number(d.valor)||0),0), pago:todos.filter(d=>d.status==='pago').reduce((s,d)=>s+(Number(d.valor)||0),0), pendente:todos.filter(d=>d.status!=='pago').length };
  const isVenc   = (d) => d.data_vencimento && new Date(d.data_vencimento+'T23:59')<new Date() && d.status!=='pago';

  useEffect(() => {
    setAction({ label:'Novo Recibo', onClick:()=>setNovo(true) });
    return () => clearAction();
  }, []);

  const marcarPago = async (doc) => {
    if (doc.id && !extras.some(e=>e.id===doc.id)) {
      try { await api.patch(`/financeiro/receber/${doc.id}/baixar`, { data_pagamento:new Date().toISOString().split('T')[0] }); refetch(); }
      catch {}
    }
    setExtras(p => p.map(e => e.id===doc.id ? {...e,status:'pago'} : e));
  };

  const filtrados = todos.filter(d => {
    const ms = !filtroStatus || d.status===filtroStatus;
    const mf = !filtroForma  || d.forma_pgto===filtroForma;
    return ms && mf;
  });
  const pendentesVenc = todos.filter(d => d.status!=='pago');

  const TD = { padding:'10px 14px', fontSize:'.85rem', color:'#374151', verticalAlign:'middle' };

  const DocRow = ({ d }) => {
    const venc = isVenc(d);
    const stStyle = { pago:{bg:'#f0fdf4',text:'#16a34a'}, pendente:{bg:'#fef3c7',text:'#d97706'}, vencido:{bg:'#fef2f2',text:'#dc2626'} };
    const st = venc ? stStyle.vencido : stStyle[d.status] || { bg:'#f3f4f6', text:'#374151' };
    return (
      <tr style={{ borderBottom:'1px solid #f1f5f9', background:venc?'#fff5f5':'transparent' }}
        onMouseEnter={e=>e.currentTarget.style.background=venc?'#fee2e2':'#f9fafb'}
        onMouseLeave={e=>e.currentTarget.style.background=venc?'#fff5f5':'transparent'}>
        <td style={{ ...TD, fontFamily:'monospace', fontSize:'.8rem', color:'#6b7280' }}>#{d.numero||d.id}</td>
        <td style={{ ...TD, fontWeight:600, color:'#111827' }}>{d.cliente||d.descricao||'—'}</td>
        <td style={TD}>{fmt(d.valor)}</td>
        <td style={{ ...TD, fontSize:'.78rem', color:'#9ca3af' }}>{d.data_emissao ? new Date(d.data_emissao+'T12:00').toLocaleDateString('pt-BR') : d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}</td>
        <td style={{ ...TD, fontWeight:venc?700:400, color:venc?'#dc2626':'#9ca3af', fontSize:'.78rem' }}>
          {d.data_vencimento ? new Date(d.data_vencimento+'T12:00').toLocaleDateString('pt-BR') : '—'}{venc&&' ⚠'}
        </td>
        <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:st.bg, color:st.text }}>{venc?'Vencido':d.status||'pendente'}</span></td>
        <td style={{ ...TD, fontSize:'.78rem', color:'#6b7280' }}>{d.forma_pgto||'—'}</td>
        <td style={{ ...TD, display:'flex', gap:6 }}>
          <button onClick={()=>setViewer(d)} style={{ padding:'4px 10px', borderRadius:6, background:'#dbeafe', color:'#2563eb', border:'1px solid #93c5fd', fontSize:'.72rem', fontWeight:600, cursor:'pointer' }}>👁 Ver</button>
          {d.status!=='pago' && <button onClick={()=>marcarPago(d)} style={{ padding:'4px 10px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', fontSize:'.72rem', fontWeight:600, cursor:'pointer' }}>✓ Pago</button>}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Total documentos', val:kpis.total, cor:'#7c3aed', icon:'📄', isMoney:false },
          { label:'Faturado', val:fmt(kpis.valor), cor:'#0891b2', icon:'💰', isMoney:true },
          { label:'Recebido', val:fmt(kpis.pago), cor:'#16a34a', icon:'✓', isMoney:true },
          { label:'Pendentes', val:kpis.pendente, cor:'#d97706', icon:'⏳', isMoney:false },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'1.1rem' }}>{k.icon}</span>
              <span style={{ fontSize:k.isMoney?'1rem':'1.6rem', fontWeight:800, color:k.cor }}>{k.val}</span>
            </div>
            <p style={{ margin:0, fontSize:'.72rem', color:'#6b7280' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.07)', overflow:'hidden' }}>
        <div style={{ display:'flex', padding:'0 18px', borderBottom:'1px solid #f1f5f9', alignItems:'center', flexWrap:'wrap', gap:0 }}>
          {['Todos os documentos','Pendentes / Vencidos','Visualizar recibo'].map((a,i) => (
            <button key={i} onClick={()=>setAba(i)} style={{ padding:'12px 16px', border:'none', background:'none', fontSize:'.82rem', fontWeight:aba===i?700:400, color:aba===i?'#16a34a':'#6b7280', borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`, cursor:'pointer', marginBottom:-1, whiteSpace:'nowrap' }}>
              {a}
              {i===1&&pendentesVenc.filter(d=>isVenc(d)).length>0&&<span style={{ marginLeft:6, padding:'1px 6px', borderRadius:999, background:'#fef2f2', color:'#dc2626', fontSize:'.68rem', fontWeight:700 }}>{pendentesVenc.filter(d=>isVenc(d)).length}</span>}
            </button>
          ))}
          {aba===0 && (
            <div style={{ marginLeft:'auto', display:'flex', gap:8, padding:'8px 0' }}>
              <select value={filtroStatus} onChange={e=>setFs(e.target.value)} style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #d1d5db', fontSize:'.78rem', outline:'none', background:'#fff' }}>
                <option value="">Todos status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
              <select value={filtroForma} onChange={e=>setFf(e.target.value)} style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #d1d5db', fontSize:'.78rem', outline:'none', background:'#fff' }}>
                <option value="">Todas formas</option>
                {FORMAS_PGT.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Aba 0: Todos */}
        {aba===0 && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
                {['Nº','Cliente','Valor','Emissão','Vencimento','Status','Forma pgto','Ações'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={8} style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>Carregando...</td></tr>
                  : filtrados.length===0 ? <tr><td colSpan={8} style={{ padding:'2.5rem', textAlign:'center', color:'#9ca3af' }}>Nenhum documento encontrado.</td></tr>
                  : filtrados.map((d,i)=><DocRow key={d.id||i} d={d} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Aba 1: Pendentes */}
        {aba===1 && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
                {['Nº','Cliente','Valor','Vencimento','Status','Ações'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pendentesVenc.length===0
                  ? <tr><td colSpan={6} style={{ padding:'2.5rem', textAlign:'center', color:'#9ca3af' }}>Nenhum documento pendente.</td></tr>
                  : pendentesVenc.map((d,i) => {
                    const venc = isVenc(d);
                    return (
                      <tr key={d.id||i} style={{ borderBottom:'1px solid #f1f5f9', background:venc?'#fff5f5':'transparent' }}
                        onMouseEnter={e=>e.currentTarget.style.background=venc?'#fee2e2':'#f9fafb'}
                        onMouseLeave={e=>e.currentTarget.style.background=venc?'#fff5f5':'transparent'}>
                        <td style={{ ...TD, fontFamily:'monospace', fontSize:'.8rem', color:'#6b7280' }}>#{d.numero||d.id}</td>
                        <td style={{ ...TD, fontWeight:600, color:'#111827' }}>{d.cliente||d.descricao||'—'}</td>
                        <td style={{ ...TD, fontWeight:700, color:'#374151' }}>{fmt(d.valor)}</td>
                        <td style={{ ...TD, fontWeight:venc?700:400, color:venc?'#dc2626':'#9ca3af', fontSize:'.78rem' }}>
                          {d.data_vencimento ? new Date(d.data_vencimento+'T12:00').toLocaleDateString('pt-BR') : '—'}{venc&&' ⚠'}
                        </td>
                        <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:venc?'#fef2f2':'#fef3c7', color:venc?'#dc2626':'#d97706' }}>{venc?'Vencido':'Pendente'}</span></td>
                        <td style={{ ...TD, display:'flex', gap:6 }}>
                          <button onClick={()=>setViewer(d)} style={{ padding:'4px 10px', borderRadius:6, background:'#dbeafe', color:'#2563eb', border:'1px solid #93c5fd', fontSize:'.72rem', fontWeight:600, cursor:'pointer' }}>👁 Ver</button>
                          <button onClick={()=>marcarPago(d)} style={{ padding:'4px 10px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', fontSize:'.72rem', fontWeight:600, cursor:'pointer' }}>✓ Confirmar</button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Aba 2: Visualizar */}
        {aba===2 && (
          <div style={{ padding:'18px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Selecione um documento</label>
                <select value={viewer?.id||''} onChange={e=>setViewer(todos.find(d=>String(d.id)===e.target.value)||null)}
                  style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff', maxWidth:400 }}>
                  <option value="">Selecione um recibo...</option>
                  {todos.map((d,i)=><option key={d.id||i} value={d.id}>{d.cliente||d.descricao||`Documento #${d.id||i}`} — {fmt(d.valor)}</option>)}
                </select>
              </div>
              {viewer ? (
                <div>
                  <button onClick={()=>setViewer(null)} style={{ marginBottom:12, padding:'5px 12px', borderRadius:6, background:'#f3f4f6', color:'#374151', border:'none', fontSize:'.78rem', cursor:'pointer' }}>← Outro documento</button>
                  <ReciboViewer doc={viewer} onClose={()=>setViewer(null)} />
                </div>
              ) : (
                <div style={{ padding:'3rem', textAlign:'center', background:'#f8fafc', borderRadius:10, border:'1px dashed #d1d5db' }}>
                  <p style={{ fontSize:'2rem', margin:'0 0 8px' }}>📄</p>
                  <p style={{ color:'#6b7280', fontSize:'.85rem', margin:0 }}>Selecione um documento acima para visualizar o recibo.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {novoModal && <ModalNovoRecibo onClose={()=>setNovo(false)} onSave={d=>setExtras(p=>[...p,{...d,id:Date.now()}])} />}
      {viewer && aba!==2 && <ReciboViewer doc={viewer} onClose={()=>setViewer(null)} />}
    </div>
  );
}
