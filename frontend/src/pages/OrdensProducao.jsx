import { useState, useEffect, useMemo } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery, useApiMutation } from '../hooks/useApi';
import api from '../services/api';

// ── constantes ────────────────────────────────────────────────────────────────
const FASES    = ['Cadastrada','Corte','Costura','Acabamento','Revisão','Expedição','Concluída'];
const TAMANHOS = ['PP','P','M','G','GG','XGG'];

const FASE_COR = {
  Cadastrada: { bg:'#f3f4f6', text:'#6b7280', border:'#d1d5db' },
  Corte:      { bg:'#ede9fe', text:'#7c3aed', border:'#c4b5fd' },
  Costura:    { bg:'#dbeafe', text:'#2563eb', border:'#93c5fd' },
  Acabamento: { bg:'#ffedd5', text:'#ea580c', border:'#fdba74' },
  'Revisão':  { bg:'#cffafe', text:'#0891b2', border:'#67e8f9' },
  Expedição:  { bg:'#dcfce7', text:'#16a34a', border:'#86efac' },
  Concluída:  { bg:'#166534', text:'#fff',    border:'#15803d' },
};
const STATUS_COR = {
  'Aberta':       { bg:'#eff6ff', text:'#2563eb' },
  'Em andamento': { bg:'#fefce8', text:'#ca8a04' },
  Concluída:      { bg:'#f0fdf4', text:'#16a34a' },
  Cancelada:      { bg:'#fef2f2', text:'#dc2626' },
};
const PRIO_COR = {
  Normal:  { bg:'#f3f4f6', text:'#374151' },
  Alta:    { bg:'#fef3c7', text:'#d97706' },
  Urgente: { bg:'#fee2e2', text:'#dc2626' },
};
const FORM0 = {
  numero:'', cliente_id:'', prioridade:'Normal', data_entrega:'', observacoes:'',
  referencias:[],
  custos:{ materia_prima:'', corte:'', costura:'', dtf:'', acabamento:'', transporte:'', valor_venda:'' },
  planejamento:{ Corte:'', Costura:'', Acabamento:'', 'Revisão':'', Expedição:'' },
};

// ── helpers ───────────────────────────────────────────────────────────────────
const diasRest = (d) => {
  if (!d) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const dt   = new Date(d+'T00:00:00');
  return Math.round((dt-hoje)/86400000);
};
const progresso = (fase) => {
  const idx = FASES.indexOf(fase);
  return idx <= 0 ? 0 : Math.round((idx/(FASES.length-1))*100);
};
const totalPcs = (op) => (op.referencias||[]).reduce((s,r)=> {
  return s + Object.values(r.grade_json||{}).reduce((a,cor)=>
    a + (typeof cor==='object' ? Object.values(cor).reduce((x,v)=>x+(+v||0),0) : (+cor||0))
  ,0);
},0);

// ── mini componentes ──────────────────────────────────────────────────────────
const Inp = ({label,...p})=>(
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <input style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}/>
  </div>
);
const Sel = ({label,children,...p})=>(
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <select style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}>{children}</select>
  </div>
);
const Overlay = ({children,onClose,width='760px'})=>(
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
       onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
      {children}
    </div>
  </div>
);
const TD = {padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({faseAtual}) {
  const idx = FASES.indexOf(faseAtual);
  return (
    <div style={{display:'flex',alignItems:'center',overflowX:'auto',padding:'4px 0'}}>
      {FASES.map((f,i)=>{
        const done=i<idx, active=i===idx, c=FASE_COR[f]||FASE_COR.Cadastrada;
        return (
          <div key={f} style={{display:'flex',alignItems:'center',flexShrink:0}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                background:done?'#16a34a':active?c.bg:'#f3f4f6',
                border:`2px solid ${done?'#16a34a':active?c.text:'#d1d5db'}`,
                fontSize:'.7rem',fontWeight:700,color:done?'#fff':active?c.text:'#9ca3af'}}>
                {done?'✓':i+1}
              </div>
              <span style={{fontSize:'.63rem',fontWeight:active?700:400,color:done?'#16a34a':active?c.text:'#9ca3af',whiteSpace:'nowrap'}}>{f}</span>
            </div>
            {i<FASES.length-1&&<div style={{width:36,height:2,background:done?'#16a34a':'#e5e7eb',margin:'0 4px',marginBottom:16,flexShrink:0}}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab referências ───────────────────────────────────────────────────────────
function TabRefs({form,setForm}) {
  const add = ()=>setForm(f=>({...f,referencias:[...f.referencias,{id:Date.now(),codigo:'',nome:'',cores:[],grade_json:{}}]}));
  const del = (i)=>setForm(f=>({...f,referencias:f.referencias.filter((_,j)=>j!==i)}));
  const upd = (i,k,v)=>setForm(f=>{const r=[...f.referencias];r[i]={...r[i],[k]:v};return{...f,referencias:r};});
  const addCor=(i,cor)=>{
    const c=cor.trim(); if(!c)return;
    setForm(f=>{
      const r=[...f.referencias]; const ref=r[i];
      if(ref.cores.includes(c))return f;
      r[i]={...ref,cores:[...ref.cores,c],grade_json:{...ref.grade_json,[c]:{PP:'',P:'',M:'',G:'',GG:'',XGG:''}}};
      return{...f,referencias:r};
    });
  };
  const delCor=(i,cor)=>setForm(f=>{
    const r=[...f.referencias]; const ref=r[i];
    const g={...ref.grade_json}; delete g[cor];
    r[i]={...ref,cores:ref.cores.filter(c=>c!==cor),grade_json:g};
    return{...f,referencias:r};
  });
  const updGrade=(i,cor,tam,v)=>setForm(f=>{
    const r=[...f.referencias]; const ref=r[i];
    r[i]={...ref,grade_json:{...ref.grade_json,[cor]:{...ref.grade_json[cor],[tam]:v===''?'':+v}}};
    return{...f,referencias:r};
  });
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {form.referencias.map((ref,i)=>(
        <RefCard key={ref.id||i} ref_={ref} idx={i} onDel={()=>del(i)}
          onUpd={(k,v)=>upd(i,k,v)} onAddCor={c=>addCor(i,c)}
          onDelCor={c=>delCor(i,c)} onUpdGrade={(c,t,v)=>updGrade(i,c,t,v)}/>
      ))}
      <button onClick={add} style={{padding:'10px',border:'2px dashed #d1d5db',borderRadius:8,background:'#f9fafb',color:'#6b7280',fontSize:'.85rem',cursor:'pointer'}}>
        + Adicionar referência
      </button>
    </div>
  );
}
function RefCard({ref_,idx,onDel,onUpd,onAddCor,onDelCor,onUpdGrade}) {
  const [novaCor,setNovaCor]=useState('');
  return(
    <div style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
      <div style={{background:'#f8fafc',padding:'8px 12px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontWeight:700,color:'#374151',fontSize:'.78rem'}}>Ref {idx+1}</span>
        <input placeholder="Código" value={ref_.codigo} onChange={e=>onUpd('codigo',e.target.value)}
          style={{width:90,padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.78rem'}}/>
        <input placeholder="Nome da referência *" value={ref_.nome} onChange={e=>onUpd('nome',e.target.value)}
          style={{flex:1,padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.78rem'}}/>
        <button onClick={onDel} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:'.75rem'}}>Remover</button>
      </div>
      <div style={{padding:'10px 12px'}}>
        <label style={{fontSize:'.75rem',fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Cores</label>
        <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
          {ref_.cores.map(c=>(
            <span key={c} style={{display:'flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:999,background:'#ede9fe',color:'#7c3aed',fontSize:'.72rem',fontWeight:600}}>
              {c}<button onClick={()=>onDelCor(c)} style={{background:'none',border:'none',cursor:'pointer',color:'#7c3aed',fontSize:'.85rem',padding:'0 1px',lineHeight:1}}>×</button>
            </span>
          ))}
        </div>
        <div style={{display:'flex',gap:6}}>
          <input placeholder="Ex: Branco" value={novaCor} onChange={e=>setNovaCor(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'){onAddCor(novaCor);setNovaCor('');e.preventDefault();}}}
            style={{flex:1,padding:'5px 9px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.78rem'}}/>
          <button onClick={()=>{onAddCor(novaCor);setNovaCor('');}}
            style={{padding:'5px 12px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',borderRadius:6,cursor:'pointer',fontSize:'.78rem'}}>+ Cor</button>
        </div>
        {ref_.cores.length>0&&(
          <div style={{marginTop:10,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
              <thead><tr style={{background:'#f8fafc'}}>
                <th style={{padding:'5px 10px',textAlign:'left',color:'#374151',fontWeight:600}}>Cor</th>
                {TAMANHOS.map(t=><th key={t} style={{padding:'5px 8px',textAlign:'center',color:'#374151',fontWeight:600}}>{t}</th>)}
                <th style={{padding:'5px 8px',textAlign:'center',color:'#16a34a',fontWeight:600}}>Total</th>
              </tr></thead>
              <tbody>{ref_.cores.map(cor=>{
                const g=ref_.grade_json[cor]||{};
                const tot=TAMANHOS.reduce((s,t)=>s+(+g[t]||0),0);
                return(<tr key={cor} style={{borderTop:'1px solid #f1f5f9'}}>
                  <td style={{padding:'4px 10px',fontWeight:600,color:'#7c3aed'}}>{cor}</td>
                  {TAMANHOS.map(tam=>(
                    <td key={tam} style={{padding:'3px 5px',textAlign:'center'}}>
                      <input type="number" min="0" value={g[tam]===undefined?'':g[tam]} onChange={e=>onUpdGrade(cor,tam,e.target.value)}
                        style={{width:48,textAlign:'center',padding:'3px',borderRadius:5,border:'1px solid #d1d5db',fontSize:'.78rem'}}/>
                    </td>
                  ))}
                  <td style={{padding:'4px 8px',textAlign:'center',fontWeight:700,color:'#16a34a'}}>{tot}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab custos ────────────────────────────────────────────────────────────────
function TabCustos({form,setForm}) {
  const upd=(k,v)=>setForm(f=>({...f,custos:{...f.custos,[k]:v}}));
  const c=form.custos;
  const total=['materia_prima','corte','costura','dtf','acabamento','transporte'].reduce((s,k)=>s+(+c[k]||0),0);
  const mg=+c.valor_venda>0?(((+c.valor_venda-total)/(+c.valor_venda))*100).toFixed(1):null;
  const mgColor=mg!==null?(mg>=30?'#16a34a':mg>=10?'#d97706':'#dc2626'):'#6b7280';
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[['materia_prima','Matéria-prima (R$)'],['corte','Corte (R$)'],['costura','Costura / Facção (R$)'],['dtf','Estamparia / DTF (R$)'],['acabamento','Acabamento (R$)'],['transporte','Transporte (R$)']].map(([k,l])=>(
          <Inp key={k} label={l} type="number" min="0" step="0.01" value={c[k]} onChange={e=>upd(k,e.target.value)}/>
        ))}
      </div>
      <div style={{borderTop:'2px solid #e5e7eb',paddingTop:10,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,alignItems:'end'}}>
        <div style={{padding:'10px 14px',background:'#fef3c7',borderRadius:8,border:'1px solid #fcd34d'}}>
          <p style={{margin:0,fontSize:'.7rem',fontWeight:600,color:'#92400e'}}>CUSTO TOTAL</p>
          <p style={{margin:0,fontSize:'1.15rem',fontWeight:800,color:'#78350f'}}>{total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
        </div>
        <Inp label="Valor de venda (R$)" type="number" min="0" step="0.01" value={c.valor_venda} onChange={e=>upd('valor_venda',e.target.value)}/>
        <div style={{padding:'10px 14px',background:mg>=30?'#f0fdf4':mg>=10?'#fefce8':'#fef2f2',borderRadius:8,border:`1px solid ${mgColor}40`}}>
          <p style={{margin:0,fontSize:'.7rem',fontWeight:600,color:'#374151'}}>MARGEM</p>
          <p style={{margin:0,fontSize:'1.15rem',fontWeight:800,color:mgColor}}>{mg!==null?`${mg}%`:'—'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Tab planejamento ──────────────────────────────────────────────────────────
function TabPlan({form,setForm}) {
  const upd=(fase,v)=>setForm(f=>({...f,planejamento:{...f.planejamento,[fase]:v}}));
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <p style={{margin:0,fontSize:'.82rem',color:'#6b7280'}}>Defina as datas previstas de início de cada fase.</p>
      {Object.keys(form.planejamento).map(fase=>{
        const c=FASE_COR[fase]||FASE_COR.Cadastrada;
        return(
          <div key={fase} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:8,background:c.bg+'80',border:`1px solid ${c.border||'#e5e7eb'}`}}>
            <span style={{minWidth:90,fontSize:'.85rem',fontWeight:600,color:c.text}}>{fase}</span>
            <input type="date" value={form.planejamento[fase]} onChange={e=>upd(fase,e.target.value)}
              style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.85rem',background:'#fff'}}/>
          </div>
        );
      })}
    </div>
  );
}

// ── LinhaOP ───────────────────────────────────────────────────────────────────
function LinhaOP({op,onVer}) {
  const dias=diasRest(op.data_entrega);
  const pct=progresso(op.fase_atual);
  const fc=FASE_COR[op.fase_atual]||FASE_COR.Cadastrada;
  const sc=STATUS_COR[op.status]||STATUS_COR['Aberta'];
  const pc=PRIO_COR[op.prioridade]||PRIO_COR.Normal;
  const pcs=totalPcs(op);
  const diasColor=dias===null?'#6b7280':dias<0?'#dc2626':dias<=7?'#d97706':'#16a34a';
  return(
    <tr onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
      <td style={{...TD,fontWeight:700,color:'#111827'}}>{op.numero}</td>
      <td style={TD}>{op.cliente_nome||'—'}</td>
      <td style={{...TD}}>
        <span style={{fontSize:'.75rem',color:'#6b7280'}}>
          {op.referencias?.length>0?`${op.referencias.length} ref.`:'—'}
        </span>
      </td>
      <td style={{...TD,textAlign:'center',fontWeight:600}}>{pcs>0?pcs.toLocaleString('pt-BR'):'—'}</td>
      <td style={TD}>
        <span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:fc.bg,color:fc.text,border:`1px solid ${fc.border||'transparent'}`}}>{op.fase_atual}</span>
      </td>
      <td style={{...TD,minWidth:130}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{flex:1,height:6,background:'#e5e7eb',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:pct>=100?'#16a34a':pct>50?'#3b82f6':'#f59e0b',borderRadius:999}}/>
          </div>
          <span style={{fontSize:'.68rem',color:'#6b7280',minWidth:28,textAlign:'right'}}>{pct}%</span>
        </div>
      </td>
      <td style={TD}>{op.data_entrega?new Date(op.data_entrega+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
      <td style={{...TD,textAlign:'center'}}>
        {dias!==null?<span style={{fontSize:'.8rem',fontWeight:700,color:diasColor}}>{dias<0?`${Math.abs(dias)}d atr.`:dias===0?'Hoje':`${dias}d`}</span>:'—'}
      </td>
      <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:sc.bg,color:sc.text}}>{op.status}</span></td>
      <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.7rem',fontWeight:600,background:pc.bg,color:pc.text}}>{op.prioridade}</span></td>
      <td style={{...TD,textAlign:'center'}}>
        <button onClick={()=>onVer(op)} style={{padding:'5px 14px',borderRadius:6,fontSize:'.78rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontWeight:600}}>Ver</button>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function OrdensProducao() {
  const {setAction,clearAction}=useTopbar();
  const [modalNova,setModalNova]=useState(false);
  const [detalhe,setDetalhe]=useState(null);
  const [aba,setAba]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [salvando,setSalvando]=useState(false);
  const [filtros,setFiltros]=useState({busca:'',fase:'',status:'',cliente_id:''});

  const {data:ordens=[],isLoading,refetch}=useApiQuery(['ordens'],()=>api.get('/ordens'));
  const {data:clientes=[]}=useApiQuery(['clientes'],()=>api.get('/clientes'));

  useEffect(()=>{
    setAction({label:'Nova OP',onClick:()=>{setForm(FORM0);setAba(0);setModalNova(true);}});
    return()=>clearAction();
  },[]);

  const kpis=useMemo(()=>{
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    return{
      total:ordens.length,
      emProducao:ordens.filter(o=>o.status==='Em andamento').length,
      noPrazo:ordens.filter(o=>o.data_entrega&&o.status!=='Concluída'&&new Date(o.data_entrega+'T00:00:00')>=hoje).length,
      atrasadas:ordens.filter(o=>o.data_entrega&&o.status!=='Concluída'&&new Date(o.data_entrega+'T00:00:00')<hoje).length,
    };
  },[ordens]);

  const filtradas=useMemo(()=>ordens.filter(op=>{
    if(filtros.busca){const b=filtros.busca.toLowerCase();if(!op.numero?.toLowerCase().includes(b)&&!op.cliente_nome?.toLowerCase().includes(b))return false;}
    if(filtros.fase&&op.fase_atual!==filtros.fase)return false;
    if(filtros.status&&op.status!==filtros.status)return false;
    if(filtros.cliente_id&&String(op.cliente_id)!==filtros.cliente_id)return false;
    return true;
  }),[ordens,filtros]);

  const salvar=async()=>{
    if(!form.numero.trim()){alert('Informe o número da OP');setAba(0);return;}
    setSalvando(true);
    try{
      await api.post('/ordens',{
        numero:form.numero,cliente_id:form.cliente_id||null,
        prioridade:form.prioridade,data_entrega:form.data_entrega||null,
        observacoes:form.observacoes,
        referencias:form.referencias.map(r=>({codigo:r.codigo,nome:r.nome,cores:r.cores,grade_json:r.grade_json})),
      });
      refetch();setModalNova(false);setForm(FORM0);setAba(0);
    }catch(e){alert(e.response?.data?.error||'Erro ao salvar OP');}
    finally{setSalvando(false);}
  };

  const avancar=async(id)=>{
    try{
      const{data}=await api.post(`/ordens/${id}/avancar-fase`);
      refetch();setDetalhe(prev=>prev?{...prev,...data}:null);
    }catch(e){alert(e.response?.data?.error||'Erro ao avançar fase');}
  };

  const ABAS=['Dados gerais','Referências e grade','Custos estimados','Planejamento'];

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Total de OPs',   value:kpis.total,       icon:'📋', c:'#3b82f6', bg:'#eff6ff'},
          {label:'Em Produção',    value:kpis.emProducao,  icon:'⚙️', c:'#f59e0b', bg:'#fefce8'},
          {label:'No Prazo',       value:kpis.noPrazo,     icon:'✅', c:'#16a34a', bg:'#f0fdf4'},
          {label:'Atrasadas',      value:kpis.atrasadas,   icon:'⚠️', c:'#dc2626', bg:'#fef2f2'},
        ].map(({label,value,icon,c,bg})=>(
          <div key={label} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0}}>{icon}</div>
            <div><p style={{margin:0,fontSize:'1.6rem',fontWeight:800,color:c,lineHeight:1}}>{value}</p><p style={{margin:0,fontSize:'.75rem',color:'#6b7280',marginTop:2}}>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:10,alignItems:'end'}}>
        <Inp label="Buscar" placeholder="Nº OP, cliente..." value={filtros.busca} onChange={e=>setFiltros(f=>({...f,busca:e.target.value}))}/>
        <Sel label="Fase" value={filtros.fase} onChange={e=>setFiltros(f=>({...f,fase:e.target.value}))}>
          <option value="">Todas</option>{FASES.map(f=><option key={f} value={f}>{f}</option>)}
        </Sel>
        <Sel label="Status" value={filtros.status} onChange={e=>setFiltros(f=>({...f,status:e.target.value}))}>
          <option value="">Todos</option>{['Aberta','Em andamento','Concluída','Cancelada'].map(s=><option key={s} value={s}>{s}</option>)}
        </Sel>
        <Sel label="Cliente" value={filtros.cliente_id} onChange={e=>setFiltros(f=>({...f,cliente_id:e.target.value}))}>
          <option value="">Todos</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.razao_social}</option>)}
        </Sel>
      </div>

      {/* Tabela */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Ordens de Produção
            <span style={{marginLeft:8,fontWeight:400,fontSize:'.78rem',color:'#6b7280'}}>{filtradas.length} resultado{filtradas.length!==1?'s':''}</span>
          </span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Nº OP','Cliente','Refs','Total pcs','Fase','Progresso','Entrega','Dias rest.','Status','Prioridade','Ações'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={11} style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :filtradas.length===0?<tr><td colSpan={11} style={{padding:'3rem',textAlign:'center',color:'#9ca3af',fontSize:'.9rem'}}>
                 {ordens.length===0?'Nenhuma OP cadastrada. Clique em "Nova OP" para começar.':'Nenhum resultado para os filtros aplicados.'}
               </td></tr>
               :filtradas.map(op=><LinhaOP key={op.id} op={op} onVer={async(o)=>{
                 try{const{data}=await api.get(`/ordens/${o.id}`);setDetalhe(data);}
                 catch{setDetalhe(o);}
               }}/>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova OP */}
      {modalNova&&(
        <Overlay onClose={()=>setModalNova(false)} width="820px">
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div><h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>Nova Ordem de Produção</h3>
              <p style={{margin:0,fontSize:'.75rem',color:'#6b7280'}}>Preencha as informações da nova OP</p></div>
            <button onClick={()=>setModalNova(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          {/* Abas */}
          <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',padding:'0 22px',flexShrink:0}}>
            {ABAS.map((a,i)=>(
              <button key={i} onClick={()=>setAba(i)} style={{padding:'10px 14px',border:'none',background:'none',fontSize:'.82rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`2px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',whiteSpace:'nowrap',marginBottom:-1}}>{a}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            {aba===0&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Inp label="Número da OP *" placeholder="Ex: OP-2026-001" value={form.numero} onChange={e=>setForm(f=>({...f,numero:e.target.value}))}/>
                  <Sel label="Prioridade" value={form.prioridade} onChange={e=>setForm(f=>({...f,prioridade:e.target.value}))}>
                    {['Normal','Alta','Urgente'].map(p=><option key={p} value={p}>{p}</option>)}
                  </Sel>
                </div>
                <Sel label="Cliente" value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}>
                  <option value="">Selecionar cliente...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.razao_social}</option>)}
                </Sel>
                <Inp label="Data de entrega" type="date" value={form.data_entrega} onChange={e=>setForm(f=>({...f,data_entrega:e.target.value}))}/>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>Observações</label>
                  <textarea rows={3} value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}
                    placeholder="Informações adicionais..."
                    style={{padding:'8px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',resize:'vertical',outline:'none',fontFamily:'inherit'}}/>
                </div>
              </div>
            )}
            {aba===1&&<TabRefs form={form} setForm={setForm}/>}
            {aba===2&&<TabCustos form={form} setForm={setForm}/>}
            {aba===3&&<TabPlan form={form} setForm={setForm}/>}
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',gap:5}}>
              {ABAS.map((_,i)=><button key={i} onClick={()=>setAba(i)} style={{width:8,height:8,borderRadius:'50%',border:'none',background:aba===i?'#16a34a':'#d1d5db',cursor:'pointer',padding:0}}/>)}
            </div>
            <div style={{display:'flex',gap:10}}>
              {aba>0&&<button onClick={()=>setAba(a=>a-1)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>← Anterior</button>}
              {aba<ABAS.length-1
                ?<button onClick={()=>setAba(a=>a+1)} style={{padding:'7px 16px',borderRadius:8,background:'#16a34a',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:'pointer'}}>Próximo →</button>
                :<button onClick={salvar} disabled={salvando} style={{padding:'7px 20px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:salvando?'none':'0 2px 8px rgba(22,163,74,.3)'}}>
                  {salvando?'Salvando...':'Criar OP'}
                </button>}
            </div>
          </div>
        </Overlay>
      )}

      {/* Modal Detalhe */}
      {detalhe&&(
        <Overlay onClose={()=>setDetalhe(null)} width="860px">
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div>
                <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>OP {detalhe.numero}</h3>
                <p style={{margin:0,fontSize:'.75rem',color:'#6b7280'}}>{detalhe.cliente_nome||'Sem cliente'} · Criada em {new Date(detalhe.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span style={{padding:'3px 12px',borderRadius:999,fontSize:'.72rem',fontWeight:700,background:(FASE_COR[detalhe.fase_atual]||FASE_COR.Cadastrada).bg,color:(FASE_COR[detalhe.fase_atual]||FASE_COR.Cadastrada).text}}>{detalhe.fase_atual}</span>
            </div>
            <button onClick={()=>setDetalhe(null)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}><Stepper faseAtual={detalhe.fase_atual}/></div>
          <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
              {[['Prioridade',detalhe.prioridade],['Status',detalhe.status],['Entrega',detalhe.data_entrega?new Date(detalhe.data_entrega+'T00:00:00').toLocaleDateString('pt-BR'):'—'],['Dias rest.',()=>{const d=diasRest(detalhe.data_entrega);return d===null?'—':d<0?`${Math.abs(d)}d atr.`:d===0?'Hoje':`${d}d`;}]].map(([l,v])=>(
                <div key={l} style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px'}}>
                  <p style={{margin:0,fontSize:'.68rem',fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.5px'}}>{l}</p>
                  <p style={{margin:0,fontSize:'.9rem',fontWeight:700,color:'#111827',marginTop:2}}>{typeof v==='function'?v():v}</p>
                </div>
              ))}
            </div>
            {detalhe.referencias?.length>0&&(
              <div style={{marginBottom:18}}>
                <h4 style={{margin:'0 0 10px',fontSize:'.85rem',fontWeight:700,color:'#374151'}}>Referências e Grade</h4>
                {detalhe.referencias.map((ref,i)=>{
                  const cores=Object.keys(ref.grade_json||{});
                  return(
                    <div key={i} style={{marginBottom:10,border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
                      <div style={{background:'#f8fafc',padding:'8px 12px',borderBottom:'1px solid #e5e7eb'}}>
                        <span style={{fontWeight:700,color:'#374151',fontSize:'.85rem'}}>{ref.codigo?`[${ref.codigo}] `:''}{ref.nome}</span>
                      </div>
                      {cores.length>0?(
                        <div style={{overflowX:'auto'}}>
                          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.8rem'}}>
                            <thead><tr style={{background:'#f8fafc'}}>
                              <th style={{padding:'6px 12px',textAlign:'left',color:'#374151'}}>Cor</th>
                              {TAMANHOS.map(t=><th key={t} style={{padding:'6px 10px',textAlign:'center',color:'#374151'}}>{t}</th>)}
                              <th style={{padding:'6px 10px',textAlign:'center',color:'#16a34a'}}>Total</th>
                            </tr></thead>
                            <tbody>{cores.map(cor=>{
                              const g=ref.grade_json[cor]||{};
                              const tot=TAMANHOS.reduce((s,t)=>s+(+g[t]||0),0);
                              return(<tr key={cor} style={{borderTop:'1px solid #f1f5f9'}}>
                                <td style={{padding:'6px 12px',fontWeight:600,color:'#7c3aed'}}>{cor}</td>
                                {TAMANHOS.map(t=><td key={t} style={{padding:'6px 10px',textAlign:'center',color:'#374151'}}>{g[t]||0}</td>)}
                                <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#16a34a'}}>{tot}</td>
                              </tr>);
                            })}</tbody>
                          </table>
                        </div>
                      ):<p style={{padding:'10px 12px',margin:0,color:'#9ca3af',fontSize:'.82rem'}}>Sem grade cadastrada</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {detalhe.observacoes&&(
              <div style={{background:'#fefce8',borderRadius:8,padding:'12px',border:'1px solid #fcd34d'}}>
                <p style={{margin:0,fontSize:'.7rem',fontWeight:700,color:'#92400e',marginBottom:4}}>OBSERVAÇÕES</p>
                <p style={{margin:0,fontSize:'.85rem',color:'#78350f'}}>{detalhe.observacoes}</p>
              </div>
            )}
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <p style={{margin:0,fontSize:'.7rem',color:'#6b7280',marginBottom:4}}>Progresso · {progresso(detalhe.fase_atual)}%</p>
              <div style={{width:200,height:8,background:'#e5e7eb',borderRadius:999,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${progresso(detalhe.fase_atual)}%`,background:'linear-gradient(90deg,#16a34a,#15803d)',borderRadius:999}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setDetalhe(null)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Fechar</button>
              {detalhe.fase_atual!=='Concluída'&&detalhe.status!=='Cancelada'&&(
                <button onClick={()=>avancar(detalhe.id)} style={{padding:'7px 20px',borderRadius:8,background:'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
                  → {FASES[FASES.indexOf(detalhe.fase_atual)+1]||'Concluir'}
                </button>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
