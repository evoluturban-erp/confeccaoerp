import { useState } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const TAMANHOS = ['PP','P','M','G','GG','XGG'];
const SETORES  = ['Corte','Costura','DTF / Bordado','Acabamento','Qualidade','Expedição','Almoxarifado'];

const QR = ({ data, size=90 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`}
    width={size} height={size} alt="QR" style={{ borderRadius:4, border:'1px solid #e5e7eb', display:'block' }} />
);

function EtiquetaCor({ op, cor, config }) {
  const total = Object.values(op.grade?.[cor]||{}).reduce((s,v)=>s+(Number(v)||0),0);
  const qrData = `OP:${op.numero_op}|COR:${cor}|PCS:${total}|ORI:${config.setor_origem}|DST:${config.destino}|FRN:${config.fornecedor}|DT:${config.data}`;
  return (
    <div style={{ border:'2px solid #e5e7eb', borderRadius:10, padding:'16px', width:220, background:'#fff', display:'flex', flexDirection:'column', gap:12, alignItems:'center', pageBreakInside:'avoid' }}>
      <div style={{ width:'100%', textAlign:'center' }}>
        <p style={{ margin:0, fontSize:'.6rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px' }}>ConfecçãoERP</p>
        <p style={{ margin:'2px 0 0', fontSize:'1rem', fontWeight:800, color:'#111827' }}>{cor}</p>
        <p style={{ margin:0, fontSize:'.72rem', color:'#6b7280' }}>OP #{op.numero_op}</p>
      </div>
      <QR data={qrData} size={90} />
      <div style={{ width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
          {TAMANHOS.map(t => { const q=op.grade?.[cor]?.[t]||0; return q>0 ? (
            <div key={t} style={{ textAlign:'center', padding:'4px', borderRadius:4, background:'#f3f4f6' }}>
              <p style={{ margin:0, fontSize:'.58rem', color:'#9ca3af' }}>{t}</p>
              <p style={{ margin:0, fontSize:'.8rem', fontWeight:700, color:'#374151' }}>{q}</p>
            </div>
          ) : null; })}
        </div>
        <p style={{ margin:'8px 0 0', fontSize:'.65rem', color:'#9ca3af', textAlign:'center' }}>Total: <b style={{ color:'#374151' }}>{total} pcs</b></p>
      </div>
      {config.setor_origem && <div style={{ width:'100%', borderTop:'1px solid #f1f5f9', paddingTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
        {[['Origem',config.setor_origem],['Destino',config.destino],['Fornecedor',config.fornecedor],['Data',config.data?new Date(config.data+'T12:00').toLocaleDateString('pt-BR'):'—']].map(([k,v])=>v?(
          <div key={k}>
            <p style={{ margin:0, fontSize:'.55rem', color:'#9ca3af' }}>{k}</p>
            <p style={{ margin:0, fontSize:'.65rem', fontWeight:600, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</p>
          </div>
        ):null)}
      </div>}
    </div>
  );
}

function Romaneio({ op, config }) {
  const cores  = Object.keys(op.grade||{});
  const totais = cores.reduce((m,c) => { m[c]=Object.values(op.grade[c]||{}).reduce((s,v)=>s+(Number(v)||0),0); return m; }, {});
  const grand  = Object.values(totais).reduce((s,v)=>s+v,0);
  const qrData = `ROMANEIO|OP:${op.numero_op}|CLI:${op.cliente_nome||''}|PCS:${grand}|ORI:${config.setor_origem}|DST:${config.destino}|DT:${config.data}`;
  return (
    <div style={{ border:'2px solid #16a34a', borderRadius:10, padding:'20px', background:'#fff', maxWidth:500, pageBreakInside:'avoid' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <p style={{ margin:0, fontSize:'.65rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px' }}>ConfecçãoERP — Romaneio</p>
          <p style={{ margin:'2px 0 0', fontSize:'1.1rem', fontWeight:800, color:'#111827' }}>OP #{op.numero_op}</p>
          <p style={{ margin:'2px 0 0', fontSize:'.78rem', color:'#6b7280' }}>{op.cliente_nome||'—'} · {op.descricao||''}</p>
        </div>
        <QR data={qrData} size={80} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:12, fontSize:'.75rem' }}>
        {[['Origem',config.setor_origem],['Destino',config.destino],['Fornecedor',config.fornecedor],['Data',config.data?new Date(config.data+'T12:00').toLocaleDateString('pt-BR'):'—']].map(([k,v])=>(
          <div key={k} style={{ padding:'6px 8px', borderRadius:6, background:'#f8fafc', border:'1px solid #e5e7eb' }}>
            <p style={{ margin:0, fontSize:'.6rem', color:'#9ca3af', textTransform:'uppercase' }}>{k}</p>
            <p style={{ margin:'2px 0 0', fontWeight:600, color:'#374151' }}>{v||'—'}</p>
          </div>
        ))}
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.8rem' }}>
        <thead><tr style={{ background:'#f8fafc' }}>
          <th style={{ padding:'6px 10px', textAlign:'left', border:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase', color:'#374151' }}>Cor</th>
          {TAMANHOS.map(t=><th key={t} style={{ padding:'6px 10px', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'.7rem', textTransform:'uppercase', color:'#374151' }}>{t}</th>)}
          <th style={{ padding:'6px 10px', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'.7rem', color:'#16a34a' }}>Total</th>
        </tr></thead>
        <tbody>
          {cores.map(cor=>(
            <tr key={cor}>
              <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827' }}>{cor}</td>
              {TAMANHOS.map(t=><td key={t} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', color:'#374151' }}>{op.grade[cor]?.[t]||0}</td>)}
              <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#16a34a' }}>{totais[cor]}</td>
            </tr>
          ))}
          <tr style={{ background:'#f0fdf4' }}>
            <td colSpan={TAMANHOS.length+1} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', fontWeight:700, color:'#16a34a', textAlign:'right' }}>TOTAL GERAL</td>
            <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:800, color:'#16a34a', fontSize:'1rem' }}>{grand}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:30 }}>
        {['Expedidor','Receptor'].map(r=>(
          <div key={r} style={{ textAlign:'center' }}>
            <div style={{ borderTop:'1px solid #9ca3af', paddingTop:4 }}>
              <p style={{ margin:0, fontSize:'.65rem', color:'#9ca3af' }}>{r}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONFIG0 = { setor_origem:'', destino:'', fornecedor:'', data:new Date().toISOString().split('T')[0] };

export default function Etiquetas() {
  const [opSel, setOpSel]     = useState(null);
  const [modo, setModo]       = useState('cor'); // 'cor' | 'romaneio'
  const [config, setConfig]   = useState(CONFIG0);

  const { data: ordens=[], isLoading } = useApiQuery(['ordens-etiq'], () => api.get('/ordens'));

  const cores = opSel ? Object.keys(opSel.grade||{}) : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Configuração */}
      <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
        <h3 style={{ margin:'0 0 14px', fontSize:'.95rem', fontWeight:700, color:'#111827' }}>🏷 Gerador de Etiquetas</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Ordem de Produção *</label>
            <select value={opSel?.id||''} onChange={e=>setOpSel(ordens.find(o=>String(o.id)===e.target.value)||null)}
              style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
              <option value="">Selecione uma OP...</option>
              {ordens.map(o=><option key={o.id} value={o.id}>#{o.numero_op} — {o.cliente_nome||'sem cliente'}</option>)}
            </select>
          </div>
          {[
            { label:'Setor origem', key:'setor_origem', type:'select', opts:SETORES },
            { label:'Destino', key:'destino', type:'text', placeholder:'Empresa / setor destino' },
            { label:'Fornecedor', key:'fornecedor', type:'text', placeholder:'Nome do fornecedor' },
            { label:'Data', key:'data', type:'date' },
          ].map(f => (
            <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>{f.label}</label>
              {f.type==='select'
                ? <select value={config[f.key]} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))}
                    style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                    <option value="">Selecione...</option>
                    {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                : <input type={f.type} value={config[f.key]} placeholder={f.placeholder||''} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))}
                    style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', boxSizing:'border-box' }} />
              }
            </div>
          ))}
        </div>

        {/* Toggle modo */}
        <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:'.8rem', fontWeight:600, color:'#374151' }}>Modo:</span>
          {[{ val:'cor', label:'Etiqueta por cor' },{ val:'romaneio', label:'Romaneio único' }].map(m => (
            <button key={m.val} onClick={()=>setModo(m.val)}
              style={{ padding:'7px 18px', borderRadius:8, border:`2px solid ${modo===m.val?'#16a34a':'#e5e7eb'}`, background:modo===m.val?'#f0fdf4':'#fff', color:modo===m.val?'#16a34a':'#374151', fontSize:'.82rem', fontWeight:modo===m.val?700:400, cursor:'pointer' }}>
              {m.label}
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            {opSel && <button onClick={()=>window.print()} style={{ padding:'7px 18px', borderRadius:8, background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', fontSize:'.82rem', fontWeight:600, cursor:'pointer', boxShadow:'0 2px 8px rgba(22,163,74,.3)' }}>🖨 Imprimir</button>}
          </div>
        </div>
      </div>

      {/* Preview */}
      {isLoading && <p style={{ textAlign:'center', color:'#9ca3af', fontSize:'.85rem' }}>Carregando OPs...</p>}

      {!opSel && !isLoading && (
        <div style={{ background:'#fff', borderRadius:12, padding:'4rem', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
          <p style={{ fontSize:'2rem', marginBottom:12 }}>🏷</p>
          <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px' }}>Selecione uma OP acima</p>
          <p style={{ color:'#6b7280', fontSize:'.85rem', margin:0 }}>As etiquetas serão geradas com QR Code para rastreamento.</p>
        </div>
      )}

      {opSel && modo==='cor' && (
        <div style={{ background:'#fff', borderRadius:12, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Etiquetas por cor — OP #{opSel.numero_op}</span>
            <span style={{ fontSize:'.75rem', color:'#6b7280' }}>{cores.length} etiqueta(s)</span>
          </div>
          {cores.length===0
            ? <p style={{ textAlign:'center', color:'#9ca3af', fontSize:'.85rem', padding:'1rem' }}>Esta OP não possui grade com cores definidas.</p>
            : <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                {cores.map(cor=><EtiquetaCor key={cor} op={opSel} cor={cor} config={config} />)}
              </div>
          }
        </div>
      )}

      {opSel && modo==='romaneio' && (
        <div style={{ background:'#fff', borderRadius:12, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
          <div style={{ marginBottom:14 }}>
            <span style={{ fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Romaneio único — OP #{opSel.numero_op}</span>
          </div>
          <Romaneio op={opSel} config={config} />
        </div>
      )}
    </div>
  );
}
