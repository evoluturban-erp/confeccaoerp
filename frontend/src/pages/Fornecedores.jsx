import { useState, useMemo, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const SETORES=['Todos','Costura','Corte','DTF','Acabamento','Transporte','Geral'];
const FORM0={nome:'',setor:'Costura',contato:'',telefone:'',cidade:'',status:'ativo'};
const SERV0={nome:'',valor:'',unidade_cobranca:'por peça'};

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
function Overlay({children,onClose,width='660px'}){
  const op=useOverlayClose(onClose);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} {...op}>
      <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>{children}</div>
    </div>
  );
}

const SETOR_COR={
  Costura: {bg:'#dbeafe',text:'#2563eb'},
  Corte:   {bg:'#ede9fe',text:'#7c3aed'},
  DTF:     {bg:'#fce7f3',text:'#be185d'},
  Acabamento:{bg:'#ffedd5',text:'#ea580c'},
  Transporte:{bg:'#cffafe',text:'#0891b2'},
  Geral:   {bg:'#f3f4f6',text:'#6b7280'},
};

export default function Fornecedores() {
  const {setAction,clearAction}=useTopbar();
  const {user}=useAuth();
  const isAdmin=user?.perfil==='Administrador';
  const [setor,setSetor]=useState('Todos');
  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [aba,setAba]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [servicos,setServicos]=useState([]);
  const [novoServ,setNovoServ]=useState(SERV0);
  const [salvando,setSalvando]=useState(false);
  const [busca,setBusca]=useState('');

  const {data:fornecedores=[],isLoading,refetch}=useApiQuery(['fornecedores'],()=>api.get('/fornecedores'));

  useEffect(()=>{
    setAction({label:'Novo Fornecedor',onClick:()=>{setForm(FORM0);setServicos([]);setEditando(null);setAba(0);setModal(true);}});
    return()=>clearAction();
  },[]);

  const filtrados=useMemo(()=>fornecedores.filter(f=>{
    if(setor!=='Todos'&&f.setor!==setor)return false;
    if(busca&&!f.nome?.toLowerCase().includes(busca.toLowerCase()))return false;
    return true;
  }),[fornecedores,setor,busca]);

  const abrir=async(f)=>{
    setForm({...FORM0,...f});setEditando(f);setAba(0);
    try{const{data}=await api.get(`/fornecedores/${f.id}`);setServicos(data.servicos||[]);}
    catch{setServicos([]);}
    setModal(true);
  };

  const salvar=async()=>{
    if(!form.nome.trim()){alert('Nome é obrigatório');return;}
    setSalvando(true);
    try{
      if(editando)await api.put(`/fornecedores/${editando.id}`,form);
      else await api.post('/fornecedores',form);
      refetch();setModal(false);
    }catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };

  const adicionarServico=async()=>{
    if(!novoServ.nome||!editando)return;
    try{
      const{data}=await api.post(`/fornecedores/${editando.id}/servicos`,novoServ);
      setServicos(s=>[...s,data]);setNovoServ(SERV0);
    }catch(e){alert(e.response?.data?.error||'Erro ao adicionar serviço');}
  };

  const removerServico=async(sId)=>{
    if(!editando)return;
    try{
      await api.delete(`/fornecedores/${editando.id}/servicos/${sId}`);
      setServicos(s=>s.filter(x=>x.id!==sId));
    }catch(e){alert('Erro ao remover serviço');}
  };

  const kpis=useMemo(()=>{
    const r={total:fornecedores.length,ativos:fornecedores.filter(f=>f.status==='ativo').length};
    SETORES.slice(1).forEach(s=>r[s]=fornecedores.filter(f=>f.setor===s).length);
    return r;
  },[fornecedores]);

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Total',   value:kpis.total,   icon:'🏭', c:'#3b82f6', bg:'#eff6ff'},
          {label:'Ativos',  value:kpis.ativos,  icon:'✅', c:'#16a34a', bg:'#f0fdf4'},
          {label:'Costura', value:kpis.Costura||0, icon:'🧵', c:'#2563eb', bg:'#dbeafe'},
          {label:'Outros setores', value:(kpis.total-kpis.Costura||0), icon:'⚙️', c:'#6b7280', bg:'#f3f4f6'},
        ].map(({label,value,icon,c,bg})=>(
          <div key={label} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0}}>{icon}</div>
            <div><p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:c,lineHeight:1}}>{value}</p><p style={{margin:0,fontSize:'.75rem',color:'#6b7280',marginTop:2}}>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Abas setor + busca */}
      <div style={{background:'#fff',borderRadius:12,padding:'12px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {SETORES.map(s=>{
            const c=SETOR_COR[s]||{bg:'#f3f4f6',text:'#374151'};
            const ativo=setor===s;
            return(
              <button key={s} onClick={()=>setSetor(s)} style={{padding:'6px 16px',borderRadius:999,border:`1px solid ${ativo?c.text+'60':'#e5e7eb'}`,background:ativo?c.bg:'#fff',color:ativo?c.text:'#6b7280',fontSize:'.8rem',fontWeight:ativo?700:400,cursor:'pointer'}}>
                {s}
                <span style={{marginLeft:6,fontSize:'.7rem',opacity:.7}}>{s==='Todos'?fornecedores.length:(fornecedores.filter(f=>f.setor===s).length)}</span>
              </button>
            );
          })}
        </div>
        <input placeholder="Buscar fornecedor..." value={busca} onChange={e=>setBusca(e.target.value)}
          style={{padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:'.85rem',outline:'none',width:'280px',boxSizing:'border-box'}}/>
      </div>

      {/* Cards */}
      {isLoading?<div style={{textAlign:'center',padding:'3rem',color:'#9ca3af'}}>Carregando...</div>
       :filtrados.length===0?<div style={{background:'#fff',borderRadius:12,padding:'3rem',textAlign:'center',color:'#9ca3af',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>Nenhum fornecedor encontrado.</div>
       :(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtrados.map(f=>{
            const sc=SETOR_COR[f.setor]||SETOR_COR.Geral;
            return(
              <div key={f.id} style={{background:'#fff',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',border:'1px solid #f1f5f9',cursor:'pointer',transition:'box-shadow .15s'}}
                   onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.07)'}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <p style={{margin:0,fontSize:'.95rem',fontWeight:700,color:'#111827'}}>{f.nome}</p>
                    <p style={{margin:'2px 0 0',fontSize:'.78rem',color:'#6b7280'}}>{f.cidade||'Cidade não informada'}</p>
                  </div>
                  <span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:700,background:sc.bg,color:sc.text}}>{f.setor||'Geral'}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:'.8rem',color:'#6b7280',marginBottom:12}}>
                  {f.contato&&<span>👤 {f.contato}</span>}
                  {f.telefone&&<span>📞 {f.telefone}</span>}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:f.status==='ativo'?'#f0fdf4':'#fef2f2',color:f.status==='ativo'?'#16a34a':'#dc2626'}}>{f.status}</span>
                  <button onClick={()=>abrir(f)} style={{padding:'5px 14px',borderRadius:6,fontSize:'.78rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontWeight:600}}>Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal&&(
        <Overlay onClose={()=>setModal(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>{editando?'Editar Fornecedor':'Novo Fornecedor'}</h3>
            <button onClick={()=>setModal(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',padding:'0 22px',flexShrink:0}}>
            {['Dados gerais',`Serviços e valores${!isAdmin?' 🔒':''}`].map((a,i)=>(
              <button key={i} onClick={()=>(i===1&&!isAdmin)?null:setAba(i)} style={{padding:'10px 14px',border:'none',background:'none',fontSize:'.82rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':i===1&&!isAdmin?'#d1d5db':'#6b7280',borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`,cursor:i===1&&!isAdmin?'not-allowed':'pointer',marginBottom:-1}}>{a}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            {aba===0&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}>
                  <Inp label="Nome *" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
                  <Sel label="Setor" value={form.setor} onChange={e=>setForm(f=>({...f,setor:e.target.value}))}>
                    {SETORES.slice(1).map(s=><option key={s} value={s}>{s}</option>)}
                  </Sel>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Contato" value={form.contato||''} onChange={e=>setForm(f=>({...f,contato:e.target.value}))}/>
                  <Inp label="Telefone" value={form.telefone||''} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Cidade" value={form.cidade||''} onChange={e=>setForm(f=>({...f,cidade:e.target.value}))}/>
                  <Sel label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                  </Sel>
                </div>
              </div>
            )}
            {aba===1&&isAdmin&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {!editando&&<div style={{padding:'12px',background:'#fefce8',borderRadius:8,border:'1px solid #fcd34d',fontSize:'.82rem',color:'#92400e'}}>Salve o fornecedor primeiro para adicionar serviços.</div>}
                {editando&&(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
                      <Inp label="Nome do serviço" value={novoServ.nome} onChange={e=>setNovoServ(s=>({...s,nome:e.target.value}))}/>
                      <Inp label="Valor (R$)" type="number" min="0" step="0.01" value={novoServ.valor} onChange={e=>setNovoServ(s=>({...s,valor:e.target.value}))}/>
                      <Sel label="Unidade" value={novoServ.unidade_cobranca} onChange={e=>setNovoServ(s=>({...s,unidade_cobranca:e.target.value}))}>
                        <option value="por peça">Por peça</option>
                        <option value="por viagem">Por viagem</option>
                        <option value="mensal">Mensal</option>
                        <option value="por kg">Por kg</option>
                        <option value="por hora">Por hora</option>
                      </Sel>
                      <button onClick={adicionarServico} style={{padding:'7px 14px',borderRadius:7,background:'#16a34a',color:'#fff',border:'none',cursor:'pointer',fontSize:'.82rem',fontWeight:600,height:36,marginBottom:0}}>+ Add</button>
                    </div>
                    {servicos.length===0?<p style={{textAlign:'center',color:'#9ca3af',fontSize:'.85rem',padding:'1rem'}}>Nenhum serviço cadastrado.</p>:(
                      <div style={{border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.83rem'}}>
                          <thead><tr style={{background:'#f8fafc'}}>{['Serviço','Valor','Unidade',''].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:700,color:'#374151'}}>{h}</th>)}</tr></thead>
                          <tbody>{servicos.map(s=>(
                            <tr key={s.id} style={{borderTop:'1px solid #f1f5f9'}}>
                              <td style={{padding:'8px 12px',fontWeight:600}}>{s.nome}</td>
                              <td style={{padding:'8px 12px',color:'#16a34a',fontWeight:700}}>{Number(s.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                              <td style={{padding:'8px 12px',color:'#6b7280'}}>{s.unidade_cobranca}</td>
                              <td style={{padding:'8px 12px'}}><button onClick={()=>removerServico(s.id)} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontSize:'.75rem'}}>Remover</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={()=>setModal(false)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:salvando?'none':'0 2px 8px rgba(22,163,74,.3)'}}>
              {salvando?'Salvando...':editando?'Salvar':'Criar fornecedor'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
