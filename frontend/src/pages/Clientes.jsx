import { useState, useMemo, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const FORM0={razao_social:'',fantasia:'',tipo:'PJ',documento:'',email:'',telefone:'',cidade:'',limite_credito:'',forma_pagamento:'',status:'ativo'};

const Inp=({label,...p})=>(
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <input style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}/>
  </div>
);
const Sel=({label,children,...p})=>(
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <select style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}>{children}</select>
  </div>
);
const Overlay=({children,onClose,width='680px'})=>(
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
       onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
      {children}
    </div>
  </div>
);

export default function Clientes() {
  const {setAction,clearAction}=useTopbar();
  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [aba,setAba]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [salvando,setSalvando]=useState(false);
  const [filtros,setFiltros]=useState({busca:'',tipo:'',status:''});

  const {data:clientes=[],isLoading,refetch}=useApiQuery(['clientes'],()=>api.get('/clientes'));

  useEffect(()=>{
    setAction({label:'Novo Cliente',onClick:()=>{setForm(FORM0);setEditando(null);setAba(0);setModal(true);}});
    return()=>clearAction();
  },[]);

  const kpis=useMemo(()=>({
    total:clientes.length,
    ativos:clientes.filter(c=>c.status==='ativo').length,
    pj:clientes.filter(c=>c.tipo==='PJ').length,
    pf:clientes.filter(c=>c.tipo==='PF').length,
  }),[clientes]);

  const filtrados=useMemo(()=>clientes.filter(c=>{
    if(filtros.busca){const b=filtros.busca.toLowerCase();if(!c.razao_social?.toLowerCase().includes(b)&&!c.fantasia?.toLowerCase().includes(b)&&!c.documento?.includes(b))return false;}
    if(filtros.tipo&&c.tipo!==filtros.tipo)return false;
    if(filtros.status&&c.status!==filtros.status)return false;
    return true;
  }),[clientes,filtros]);

  const abrir=(c)=>{setForm({...FORM0,...c});setEditando(c);setAba(0);setModal(true);};

  const salvar=async()=>{
    if(!form.razao_social.trim()){alert('Razão social é obrigatória');return;}
    setSalvando(true);
    try{
      if(editando) await api.put(`/clientes/${editando.id}`,form);
      else await api.post('/clientes',form);
      refetch();setModal(false);
    }catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };

  const ABAS=['Dados cadastrais','Endereço','Financeiro'];
  const TD={padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Total',       value:kpis.total,   icon:'👥', c:'#3b82f6', bg:'#eff6ff'},
          {label:'Ativos',      value:kpis.ativos,  icon:'✅', c:'#16a34a', bg:'#f0fdf4'},
          {label:'Pessoa Jurídica', value:kpis.pj,  icon:'🏢', c:'#7c3aed', bg:'#ede9fe'},
          {label:'Pessoa Física',   value:kpis.pf,  icon:'👤', c:'#0891b2', bg:'#cffafe'},
        ].map(({label,value,icon,c,bg})=>(
          <div key={label} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0}}>{icon}</div>
            <div><p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:c,lineHeight:1}}>{value}</p><p style={{margin:0,fontSize:'.75rem',color:'#6b7280',marginTop:2}}>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,alignItems:'end'}}>
        <Inp label="Buscar" placeholder="Razão social, CNPJ, cidade..." value={filtros.busca} onChange={e=>setFiltros(f=>({...f,busca:e.target.value}))}/>
        <Sel label="Tipo" value={filtros.tipo} onChange={e=>setFiltros(f=>({...f,tipo:e.target.value}))}>
          <option value="">Todos</option><option value="PJ">PJ</option><option value="PF">PF</option>
        </Sel>
        <Sel label="Status" value={filtros.status} onChange={e=>setFiltros(f=>({...f,status:e.target.value}))}>
          <option value="">Todos</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option>
        </Sel>
      </div>

      {/* Tabela */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9'}}>
          <span style={{fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Clientes
            <span style={{marginLeft:8,fontWeight:400,fontSize:'.78rem',color:'#6b7280'}}>{filtrados.length} resultado{filtrados.length!==1?'s':''}</span>
          </span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Razão Social','Fantasia','Tipo','Documento','Cidade','Telefone','Limite Crédito','Forma Pgto','Status','Ações'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={10} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :filtrados.length===0?<tr><td colSpan={10} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Nenhum cliente encontrado.</td></tr>
               :filtrados.map(c=>(
                <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{...TD,fontWeight:700,color:'#111827'}}>{c.razao_social}</td>
                  <td style={TD}>{c.fantasia||'—'}</td>
                  <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:700,background:c.tipo==='PJ'?'#ede9fe':'#dbeafe',color:c.tipo==='PJ'?'#7c3aed':'#2563eb'}}>{c.tipo}</span></td>
                  <td style={TD}>{c.documento||'—'}</td>
                  <td style={TD}>{c.cidade||'—'}</td>
                  <td style={TD}>{c.telefone||'—'}</td>
                  <td style={TD}>{c.limite_credito>0?Number(c.limite_credito).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</td>
                  <td style={TD}>{c.forma_pagamento||'—'}</td>
                  <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:c.status==='ativo'?'#f0fdf4':'#fef2f2',color:c.status==='ativo'?'#16a34a':'#dc2626'}}>{c.status}</span></td>
                  <td style={{...TD,textAlign:'center'}}>
                    <button onClick={()=>abrir(c)} style={{padding:'5px 14px',borderRadius:6,fontSize:'.78rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontWeight:600}}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal&&(
        <Overlay onClose={()=>setModal(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>{editando?'Editar Cliente':'Novo Cliente'}</h3>
            <button onClick={()=>setModal(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',padding:'0 22px',flexShrink:0}}>
            {ABAS.map((a,i)=><button key={i} onClick={()=>setAba(i)} style={{padding:'10px 14px',border:'none',background:'none',fontSize:'.82rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',marginBottom:-1}}>{a}</button>)}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            {aba===0&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}>
                  <Inp label="Razão Social *" value={form.razao_social} onChange={e=>setForm(f=>({...f,razao_social:e.target.value}))}/>
                  <Sel label="Tipo" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                    <option value="PJ">PJ – Pessoa Jurídica</option><option value="PF">PF – Pessoa Física</option>
                  </Sel>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Nome Fantasia" value={form.fantasia||''} onChange={e=>setForm(f=>({...f,fantasia:e.target.value}))}/>
                  <Inp label={form.tipo==='PJ'?'CNPJ':'CPF'} value={form.documento||''} onChange={e=>setForm(f=>({...f,documento:e.target.value}))}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="E-mail" type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                  <Inp label="Telefone" value={form.telefone||''} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/>
                </div>
                <Sel label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                </Sel>
              </div>
            )}
            {aba===1&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <Inp label="Cidade" value={form.cidade||''} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))}/>
                <p style={{margin:0,fontSize:'.78rem',color:'#9ca3af',textAlign:'center',padding:'1rem',background:'#f8fafc',borderRadius:8,border:'1px dashed #d1d5db'}}>
                  Campos de endereço completo (CEP, logradouro, estado) podem ser adicionados ao banco futuramente.
                </p>
              </div>
            )}
            {aba===2&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Limite de Crédito (R$)" type="number" min="0" step="0.01" value={form.limite_credito||''} onChange={e=>setForm(f=>({...f,limite_credito:e.target.value}))}/>
                  <Inp label="Forma de Pagamento" placeholder="Ex: Boleto 30/60/90" value={form.forma_pagamento||''} onChange={e=>setForm(f=>({...f,forma_pagamento:e.target.value}))}/>
                </div>
                {form.limite_credito>0&&(
                  <div style={{padding:'10px 14px',background:'#f0fdf4',borderRadius:8,border:'1px solid #86efac'}}>
                    <p style={{margin:0,fontSize:'.75rem',color:'#16a34a',fontWeight:600}}>Limite: {Number(form.limite_credito).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:6}}>
              {aba>0&&<button onClick={()=>setAba(a=>a-1)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>← Anterior</button>}
              {aba<ABAS.length-1&&<button onClick={()=>setAba(a=>a+1)} style={{padding:'7px 16px',borderRadius:8,background:'#f3f4f6',color:'#374151',border:'none',fontSize:'.85rem',cursor:'pointer'}}>Próximo →</button>}
            </div>
            <button onClick={salvar} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:salvando?'none':'0 2px 8px rgba(22,163,74,.3)'}}>
              {salvando?'Salvando...':editando?'Salvar alterações':'Criar cliente'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
