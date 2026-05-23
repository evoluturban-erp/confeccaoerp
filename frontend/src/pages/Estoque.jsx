import { useState, useMemo, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const CATS=['Tecidos','Aviamentos','Embalagens','Outros'];
const FORM_MAT={codigo:'',nome:'',categoria:'Tecidos',unidade:'m',quantidade_atual:'',quantidade_minima:'',custo_unitario:'',fornecedor:''};
const FORM_MOV={material_id:'',tipo:'entrada',quantidade:'',observacao:''};

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
function Overlay({children,onClose,width='580px'}){
  const op=useOverlayClose(onClose);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} {...op}>
      <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        {children}
      </div>
    </div>
  );
}

function NivelBar({atual,minimo}) {
  const pct=minimo>0?Math.min((atual/minimo)*100,200):100;
  const color=pct<=60?'#dc2626':pct<=100?'#f59e0b':'#16a34a';
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:140}}>
      <div style={{flex:1,height:7,background:'#e5e7eb',borderRadius:999,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:color,borderRadius:999}}/>
      </div>
      <span style={{fontSize:'.72rem',fontWeight:700,color,minWidth:28}}>{atual}</span>
    </div>
  );
}

export default function Estoque() {
  const {setAction,clearAction}=useTopbar();
  const [modalMat,setModalMat]=useState(false);
  const [modalMov,setModalMov]=useState(false);
  const [editMat,setEditMat]=useState(null);
  const [formMat,setFormMat]=useState(FORM_MAT);
  const [formMov,setFormMov]=useState(FORM_MOV);
  const [salvando,setSalvando]=useState(false);
  const [filtros,setFiltros]=useState({busca:'',categoria:'',soAlerta:false});

  const {data:materiais=[],isLoading,refetch}=useApiQuery(['estoque'],()=>api.get('/estoque'));
  const {data:alertas=[]}=useApiQuery(['estoque-alertas'],()=>api.get('/estoque/alertas'));

  useEffect(()=>{
    setAction({label:'Novo Material',onClick:()=>{setFormMat(FORM_MAT);setEditMat(null);setModalMat(true);}});
    return()=>clearAction();
  },[]);

  const kpis=useMemo(()=>({
    total:materiais.length,
    alertas:alertas.length,
    valorTotal:materiais.reduce((s,m)=>s+(+m.quantidade_atual||0)*(+m.custo_unitario||0),0),
    categorias:CATS.reduce((o,c)=>({...o,[c]:materiais.filter(m=>m.categoria===c).length}),{}),
  }),[materiais,alertas]);

  const filtrados=useMemo(()=>materiais.filter(m=>{
    if(filtros.busca){const b=filtros.busca.toLowerCase();if(!m.nome?.toLowerCase().includes(b)&&!m.codigo?.toLowerCase().includes(b))return false;}
    if(filtros.categoria&&m.categoria!==filtros.categoria)return false;
    if(filtros.soAlerta&&+m.quantidade_atual>+m.quantidade_minima)return false;
    return true;
  }),[materiais,filtros]);

  const salvarMat=async()=>{
    if(!formMat.codigo||!formMat.nome){alert('Código e nome são obrigatórios');return;}
    setSalvando(true);
    try{
      if(editMat)await api.put(`/estoque/${editMat.id}`,formMat);
      else await api.post('/estoque',formMat);
      refetch();setModalMat(false);
    }catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };

  const salvarMov=async()=>{
    if(!formMov.material_id||!formMov.quantidade){alert('Material e quantidade são obrigatórios');return;}
    setSalvando(true);
    try{
      await api.post('/estoque/movimentacoes',formMov);
      refetch();setModalMov(false);setFormMov(FORM_MOV);
    }catch(e){alert(e.response?.data?.error||'Quantidade insuficiente ou erro ao registrar');}
    finally{setSalvando(false);}
  };

  const TD={padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Total materiais', value:kpis.total,   icon:'📦', c:'#3b82f6', bg:'#eff6ff'},
          {label:'Alertas mínimo',  value:kpis.alertas, icon:'⚠️', c:'#dc2626', bg:'#fef2f2'},
          {label:'Tecidos',         value:kpis.categorias['Tecidos']||0, icon:'🧵', c:'#7c3aed', bg:'#ede9fe'},
          {label:'Valor em estoque',value:kpis.valorTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}), icon:'💰', c:'#16a34a', bg:'#f0fdf4'},
        ].map(({label,value,icon,c,bg})=>(
          <div key={label} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0}}>{icon}</div>
            <div><p style={{margin:0,fontSize:typeof value==='string'?'1rem':'1.6rem',fontWeight:800,color:c,lineHeight:1}}>{value}</p><p style={{margin:0,fontSize:'.75rem',color:'#6b7280',marginTop:2}}>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,alignItems:'end'}}>
        <Inp label="Buscar" placeholder="Nome ou código do material..." value={filtros.busca} onChange={e=>setFiltros(f=>({...f,busca:e.target.value}))}/>
        <Sel label="Categoria" value={filtros.categoria} onChange={e=>setFiltros(f=>({...f,categoria:e.target.value}))}>
          <option value="">Todas</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </Sel>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>Filtros rápidos</label>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'.85rem',color:'#374151',cursor:'pointer',padding:'7px 10px',border:'1px solid #d1d5db',borderRadius:7,background:filtros.soAlerta?'#fef2f2':'#fff'}}>
            <input type="checkbox" checked={filtros.soAlerta} onChange={e=>setFiltros(f=>({...f,soAlerta:e.target.checked}))} style={{accentColor:'#dc2626'}}/>
            <span style={{color:filtros.soAlerta?'#dc2626':'#374151'}}>⚠️ Somente alertas</span>
          </label>
        </div>
      </div>

      {/* Tabela */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Materiais em estoque
            <span style={{marginLeft:8,fontWeight:400,fontSize:'.78rem',color:'#6b7280'}}>{filtrados.length} ite{filtrados.length!==1?'ns':'m'}</span>
          </span>
          <button onClick={()=>{setFormMov({...FORM_MOV});setModalMov(true);}} style={{padding:'6px 14px',borderRadius:7,background:'#eff6ff',color:'#2563eb',border:'1px solid #93c5fd',cursor:'pointer',fontSize:'.8rem',fontWeight:600}}>
            + Movimentação
          </button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Código','Material','Categoria','Unidade','Nível de Estoque','Mínimo','Custo Unit.','Fornecedor','Ações'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={9} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :filtrados.length===0?<tr><td colSpan={9} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Nenhum material encontrado.</td></tr>
               :filtrados.map(m=>{
                const alerta=+m.quantidade_atual<=+m.quantidade_minima;
                return(
                <tr key={m.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9',background:alerta?'#fff5f5':'transparent'}}>
                  <td style={{...TD,fontFamily:'monospace',fontSize:'.8rem',color:'#6b7280'}}>{m.codigo}</td>
                  <td style={{...TD,fontWeight:600,color:'#111827'}}>
                    {alerta&&<span style={{marginRight:4}}>⚠️</span>}{m.nome}
                  </td>
                  <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:'#f3f4f6',color:'#374151'}}>{m.categoria}</span></td>
                  <td style={TD}>{m.unidade}</td>
                  <td style={TD}><NivelBar atual={+m.quantidade_atual} minimo={+m.quantidade_minima}/></td>
                  <td style={TD}>{m.quantidade_minima}</td>
                  <td style={TD}>{m.custo_unitario>0?Number(m.custo_unitario).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</td>
                  <td style={TD}>{m.fornecedor||'—'}</td>
                  <td style={{...TD,textAlign:'center'}}>
                    <button onClick={()=>{setFormMat({...FORM_MAT,...m});setEditMat(m);setModalMat(true);}}
                      style={{padding:'5px 14px',borderRadius:6,fontSize:'.78rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontWeight:600}}>Editar</button>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Material */}
      {modalMat&&(
        <Overlay onClose={()=>setModalMat(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>{editMat?'Editar Material':'Novo Material'}</h3>
            <button onClick={()=>setModalMat(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:10}}>
              <Inp label="Código *" value={formMat.codigo} onChange={e=>setFormMat(f=>({...f,codigo:e.target.value}))}/>
              <Inp label="Nome *" value={formMat.nome} onChange={e=>setFormMat(f=>({...f,nome:e.target.value}))}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Sel label="Categoria" value={formMat.categoria} onChange={e=>setFormMat(f=>({...f,categoria:e.target.value}))}>
                {CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
              <Inp label="Unidade (ex: m, kg, un)" value={formMat.unidade} onChange={e=>setFormMat(f=>({...f,unidade:e.target.value}))}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <Inp label="Qtd atual" type="number" min="0" value={formMat.quantidade_atual} onChange={e=>setFormMat(f=>({...f,quantidade_atual:e.target.value}))}/>
              <Inp label="Qtd mínima" type="number" min="0" value={formMat.quantidade_minima} onChange={e=>setFormMat(f=>({...f,quantidade_minima:e.target.value}))}/>
              <Inp label="Custo unit. (R$)" type="number" min="0" step="0.01" value={formMat.custo_unitario} onChange={e=>setFormMat(f=>({...f,custo_unitario:e.target.value}))}/>
            </div>
            <Inp label="Fornecedor" value={formMat.fornecedor} onChange={e=>setFormMat(f=>({...f,fornecedor:e.target.value}))}/>
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={()=>setModalMat(false)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarMat} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:salvando?'none':'0 2px 8px rgba(22,163,74,.3)'}}>
              {salvando?'Salvando...':editMat?'Salvar':'Criar material'}
            </button>
          </div>
        </Overlay>
      )}

      {/* Modal Movimentação */}
      {modalMov&&(
        <Overlay onClose={()=>setModalMov(false)} width="480px">
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>Registrar Movimentação</h3>
            <button onClick={()=>setModalMov(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{flex:1,padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
            <Sel label="Material *" value={formMov.material_id} onChange={e=>setFormMov(f=>({...f,material_id:e.target.value}))}>
              <option value="">Selecionar...</option>{materiais.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>)}
            </Sel>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Sel label="Tipo" value={formMov.tipo} onChange={e=>setFormMov(f=>({...f,tipo:e.target.value}))}>
                <option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste">Ajuste</option>
              </Sel>
              <Inp label="Quantidade *" type="number" min="0.001" step="0.001" value={formMov.quantidade} onChange={e=>setFormMov(f=>({...f,quantidade:e.target.value}))}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>Observação</label>
              <textarea rows={2} value={formMov.observacao} onChange={e=>setFormMov(f=>({...f,observacao:e.target.value}))}
                style={{padding:'8px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',resize:'vertical',outline:'none',fontFamily:'inherit'}}/>
            </div>
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={()=>setModalMov(false)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarMov} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':formMov.tipo==='saida'?'linear-gradient(135deg,#dc2626,#b91c1c)':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer'}}>
              {salvando?'Registrando...':formMov.tipo==='entrada'?'Registrar Entrada':formMov.tipo==='saida'?'Registrar Saída':'Registrar Ajuste'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
