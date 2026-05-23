import { useState, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useAuth } from '../context/AuthContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const PERFIS   = ['Administrador','Gerente','Transportador','Facção'];
const SETORES_OPT = ['Corte','Costura','Qualidade','Almoxarifado','Financeiro','Expedição','Transporte'];
const FORM0 = {nome:'',login:'',senha:'',perfil:'Gerente',setores:[],status:'ativo'};

const Inp = ({label,...p}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <input style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}/>
  </div>
);
const Sel = ({label,children,...p}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <select style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}>{children}</select>
  </div>
);
function Overlay({children,onClose}){
  const op=useOverlayClose(onClose);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} {...op}>
      <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:600,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        {children}
      </div>
    </div>
  );
}

const PERFIL_COR = {
  Administrador: {bg:'#fef2f2',text:'#dc2626'},
  Gerente:       {bg:'#ede9fe',text:'#7c3aed'},
  Transportador: {bg:'#cffafe',text:'#0891b2'},
  'Facção':      {bg:'#dbeafe',text:'#2563eb'},
};

export default function Usuarios() {
  const {setAction,clearAction}=useTopbar();
  const {user}=useAuth();
  const isAdmin = user?.perfil==='Administrador';

  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [aba,setAba]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [salvando,setSalvando]=useState(false);

  const {data:usuarios=[],isLoading,refetch}=useApiQuery(['usuarios'],()=>api.get('/usuarios'));

  useEffect(()=>{
    if(isAdmin) setAction({label:'Novo Usuário',onClick:()=>{setForm(FORM0);setEditando(null);setAba(0);setModal(true);}});
    return()=>clearAction();
  },[isAdmin]);

  const abrir = (u) => {
    setForm({nome:u.nome,login:u.login,senha:'',perfil:u.perfil,setores:u.setores||[],status:u.status});
    setEditando(u); setAba(0); setModal(true);
  };

  const toggleSetor = (s) => setForm(f => ({
    ...f, setores: f.setores.includes(s) ? f.setores.filter(x=>x!==s) : [...f.setores,s]
  }));

  const salvar = async () => {
    if(!form.nome||!form.login||(!editando&&!form.senha)){alert('Nome, login e senha são obrigatórios');return;}
    setSalvando(true);
    try {
      const payload = {...form};
      if(editando&&!payload.senha) delete payload.senha;
      if(editando) await api.put(`/usuarios/${editando.id}`,payload);
      else await api.post('/usuarios',payload);
      refetch(); setModal(false);
    } catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };

  const ABAS=['Dados e perfil','Setores e permissões'];
  const TD = {padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

  if(!isAdmin) return (
    <div style={{background:'#fff',borderRadius:12,padding:'3rem',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
      <p style={{fontSize:'2rem',marginBottom:12}}>🔒</p>
      <p style={{fontSize:'1rem',fontWeight:700,color:'#111827'}}>Acesso restrito</p>
      <p style={{color:'#6b7280',fontSize:'.9rem'}}>Apenas Administradores podem gerenciar usuários.</p>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {PERFIS.map(p => {
          const c=PERFIL_COR[p]; const qtd=usuarios.filter(u=>u.perfil===p).length;
          return (
            <div key={p} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
              <p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:c.text,lineHeight:1}}>{qtd}</p>
              <p style={{margin:'4px 0 0',fontSize:'.78rem',color:'#6b7280'}}>{p}</p>
            </div>
          );
        })}
      </div>

      {/* Tabela */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Usuários do sistema
            <span style={{marginLeft:8,fontWeight:400,fontSize:'.78rem',color:'#6b7280'}}>{usuarios.length} cadastrados</span>
          </span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Nome','Login','Perfil','Setores','Status','Criado em','Ações'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={7} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :usuarios.length===0?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhum usuário.</td></tr>
               :usuarios.map(u => {
                const pc=PERFIL_COR[u.perfil]||{bg:'#f3f4f6',text:'#374151'};
                return (
                  <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{...TD,fontWeight:700,color:'#111827'}}>{u.nome}</td>
                    <td style={{...TD,fontFamily:'monospace',fontSize:'.82rem',color:'#6b7280'}}>{u.login}</td>
                    <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:700,background:pc.bg,color:pc.text}}>{u.perfil}</span></td>
                    <td style={TD}>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {(u.setores||[]).length===0?<span style={{fontSize:'.75rem',color:'#9ca3af'}}>Todos</span>
                         :(u.setores||[]).slice(0,3).map(s=>(
                          <span key={s} style={{padding:'2px 7px',borderRadius:999,background:'#f3f4f6',color:'#374151',fontSize:'.72rem',fontWeight:600}}>{s}</span>
                        ))}
                        {(u.setores||[]).length>3&&<span style={{fontSize:'.72rem',color:'#6b7280'}}>+{u.setores.length-3}</span>}
                      </div>
                    </td>
                    <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:u.status==='ativo'?'#f0fdf4':'#fef2f2',color:u.status==='ativo'?'#16a34a':'#dc2626'}}>{u.status}</span></td>
                    <td style={{...TD,fontSize:'.78rem',color:'#9ca3af'}}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{...TD,textAlign:'center'}}>
                      <button onClick={()=>abrir(u)} style={{padding:'5px 14px',borderRadius:6,fontSize:'.78rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontWeight:600}}>Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal&&(
        <Overlay onClose={()=>setModal(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>{editando?'Editar Usuário':'Novo Usuário'}</h3>
            <button onClick={()=>setModal(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',padding:'0 22px',flexShrink:0}}>
            {ABAS.map((a,i)=><button key={i} onClick={()=>setAba(i)} style={{padding:'10px 14px',border:'none',background:'none',fontSize:'.82rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',marginBottom:-1}}>{a}</button>)}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            {aba===0&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <Inp label="Nome completo *" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Login *" placeholder="login para acesso" value={form.login} onChange={e=>setForm(f=>({...f,login:e.target.value}))}/>
                  <Inp label={editando?'Nova senha (deixe vazio para manter)':'Senha *'} type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Sel label="Perfil" value={form.perfil} onChange={e=>setForm(f=>({...f,perfil:e.target.value}))}>
                    {PERFIS.map(p=><option key={p} value={p}>{p}</option>)}
                  </Sel>
                  <Sel label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                  </Sel>
                </div>
                {/* preview perfil */}
                <div style={{padding:'10px 14px',borderRadius:8,background:(PERFIL_COR[form.perfil]||{bg:'#f3f4f6'}).bg,border:`1px solid ${(PERFIL_COR[form.perfil]||{text:'#e5e7eb'}).text}30`}}>
                  <p style={{margin:0,fontSize:'.78rem',fontWeight:600,color:(PERFIL_COR[form.perfil]||{text:'#374151'}).text}}>
                    Perfil: {form.perfil}
                  </p>
                  <p style={{margin:'2px 0 0',fontSize:'.72rem',color:'#6b7280'}}>
                    {form.perfil==='Administrador'?'Acesso total ao sistema'
                     :form.perfil==='Gerente'?'Acesso a produção, estoque e relatórios'
                     :form.perfil==='Transportador'?'Acesso apenas às coletas e entregas'
                     :'Acesso restrito às OPs e revisões de qualidade'}
                  </p>
                </div>
              </div>
            )}
            {aba===1&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <p style={{margin:0,fontSize:'.82rem',color:'#6b7280'}}>
                  Selecione os setores que este usuário pode visualizar e operar. Se nenhum for selecionado, terá acesso a todos.
                </p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {SETORES_OPT.map(s => {
                    const ativo=form.setores.includes(s);
                    return (
                      <button key={s} onClick={()=>toggleSetor(s)} style={{padding:'10px 14px',borderRadius:8,border:`2px solid ${ativo?'#16a34a':'#e5e7eb'}`,background:ativo?'#f0fdf4':'#fff',color:ativo?'#16a34a':'#374151',fontSize:'.85rem',fontWeight:ativo?700:400,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:18,height:18,borderRadius:4,border:`2px solid ${ativo?'#16a34a':'#d1d5db'}`,background:ativo?'#16a34a':'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',color:'#fff',flexShrink:0}}>{ativo?'✓':''}</span>
                        {s}
                      </button>
                    );
                  })}
                </div>
                {form.setores.length===0&&(
                  <div style={{padding:'10px 14px',background:'#fefce8',borderRadius:8,border:'1px solid #fcd34d',fontSize:'.8rem',color:'#92400e'}}>
                    ⚠️ Sem restrição de setor — usuário terá acesso a todos os módulos do seu perfil.
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
              {salvando?'Salvando...':editando?'Salvar alterações':'Criar usuário'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
