import { useState } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const COR0={nome_cor:'',hex_cor:'#000000',kg_malha:'',preco_kg_malha:'',kg_ribana:'',preco_kg_ribana:'',lote:''};
const FORM0={tipo_entrada:'com_nf',numero_controle:'',fornecedor:'',data_entrada:'',tipo_malha:'',gramatura:'',valor_total:'',cores:[]};

const Inp=({label,...p})=>(
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{label}</label>}
    <input style={{padding:'7px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.875rem',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff'}} {...p}/>
  </div>
);

export default function EntradaMalha() {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [salvando,setSalvando]=useState(false);
  const [sucesso,setSucesso]=useState(false);

  const {data:entradas=[],isLoading,refetch}=useApiQuery(['entradas-malha'],()=>api.get('/entradas-malha'));

  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const updCor=(i,k,v)=>setForm(f=>{const c=[...f.cores];c[i]={...c[i],[k]:v};return{...f,cores:c};});
  const addCor=()=>setForm(f=>({...f,cores:[...f.cores,{...COR0}]}));
  const delCor=(i)=>setForm(f=>({...f,cores:f.cores.filter((_,j)=>j!==i)}));

  const totalMalha=form.cores.reduce((s,c)=>s+(+c.kg_malha||0),0);
  const totalRibana=form.cores.reduce((s,c)=>s+(+c.kg_ribana||0),0);
  const totalValor=form.cores.reduce((s,c)=>s+(+c.kg_malha||0)*(+c.preco_kg_malha||0)+(+c.kg_ribana||0)*(+c.preco_kg_ribana||0),0);

  const salvar=async()=>{
    setSalvando(true);
    try{
      await api.post('/entradas-malha',{...form,valor_total:totalValor});
      refetch();setSucesso(true);
      setTimeout(()=>{setForm(FORM0);setStep(0);setSucesso(false);},2000);
    }catch(e){alert(e.response?.data?.error||'Erro ao registrar entrada');}
    finally{setSalvando(false);}
  };

  const STEPS=['Dados da entrada','Cores e pesos','Revisão e confirmação'];
  const TD={padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Toggle NF */}
      <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
        <h3 style={{margin:'0 0 16px',fontSize:'1rem',fontWeight:700,color:'#111827'}}>Nova Entrada de Malha</h3>

        {/* Toggle */}
        <div style={{display:'flex',gap:0,marginBottom:20,background:'#f1f5f9',borderRadius:10,padding:3,width:'fit-content'}}>
          {[['com_nf','📄 Com Nota Fiscal'],['sem_nf','🚚 Sem Nota Fiscal']].map(([val,label])=>(
            <button key={val} onClick={()=>upd('tipo_entrada',val)} style={{padding:'8px 20px',borderRadius:8,border:'none',fontSize:'.85rem',fontWeight:form.tipo_entrada===val?700:400,background:form.tipo_entrada===val?'#fff':'transparent',color:form.tipo_entrada===val?'#16a34a':'#6b7280',cursor:'pointer',boxShadow:form.tipo_entrada===val?'0 1px 4px rgba(0,0,0,.1)':'none',transition:'all .15s'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Stepper */}
        <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'auto'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:i<step?'pointer':'default'}} onClick={()=>i<step&&setStep(i)}>
                <div style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:i<step?'#16a34a':i===step?'#16a34a':'#e5e7eb',border:`2px solid ${i<=step?'#16a34a':'#d1d5db'}`,fontSize:'.72rem',fontWeight:700,color:i<=step?'#fff':'#9ca3af'}}>
                  {i<step?'✓':i+1}
                </div>
                <span style={{fontSize:'.7rem',fontWeight:i===step?700:400,color:i===step?'#16a34a':i<step?'#374151':'#9ca3af',whiteSpace:'nowrap'}}>{s}</span>
              </div>
              {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step?'#16a34a':'#e5e7eb',margin:'0 8px',marginBottom:18}}/>}
            </div>
          ))}
        </div>

        {/* Step 0 */}
        {step===0&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {form.tipo_entrada==='com_nf'&&<Inp label="Número da NF" value={form.numero_controle} onChange={e=>upd('numero_controle',e.target.value)}/>}
              {form.tipo_entrada==='sem_nf'&&<Inp label="Número de controle interno" placeholder="Ex: CTRL-001" value={form.numero_controle} onChange={e=>upd('numero_controle',e.target.value)}/>}
              <Inp label="Data da entrada *" type="date" value={form.data_entrada} onChange={e=>upd('data_entrada',e.target.value)}/>
            </div>
            <Inp label="Fornecedor" placeholder="Nome do fornecedor ou tecedor" value={form.fornecedor} onChange={e=>upd('fornecedor',e.target.value)}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Inp label="Tipo de malha" placeholder="Ex: Meia malha, Moletom, Ribana" value={form.tipo_malha} onChange={e=>upd('tipo_malha',e.target.value)}/>
              <Inp label="Gramatura (g/m²)" type="number" min="0" value={form.gramatura} onChange={e=>upd('gramatura',e.target.value)}/>
            </div>
          </div>
        )}

        {/* Step 1 */}
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{margin:0,fontSize:'.82rem',color:'#6b7280'}}>Informe o peso e preço por kg de cada cor. Malha e ribana são independentes.</p>
              <button onClick={addCor} style={{padding:'7px 14px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',borderRadius:7,cursor:'pointer',fontSize:'.82rem',fontWeight:600}}>+ Cor</button>
            </div>
            {form.cores.length===0&&(
              <div style={{padding:'2rem',textAlign:'center',color:'#9ca3af',background:'#f9fafb',borderRadius:10,border:'2px dashed #e5e7eb',fontSize:'.85rem'}}>
                Clique em "+ Cor" para adicionar a primeira cor desta entrada.
              </div>
            )}
            {form.cores.map((cor,i)=>{
              const subtotal=(+cor.kg_malha||0)*(+cor.preco_kg_malha||0)+(+cor.kg_ribana||0)*(+cor.preco_kg_ribana||0);
              return(
                <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
                  <div style={{background:'#f8fafc',padding:'10px 14px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:10}}>
                    <input type="color" value={cor.hex_cor} onChange={e=>updCor(i,'hex_cor',e.target.value)}
                      style={{width:32,height:32,border:'none',borderRadius:6,cursor:'pointer',padding:0}}/>
                    <input placeholder="Nome da cor *" value={cor.nome_cor} onChange={e=>updCor(i,'nome_cor',e.target.value)}
                      style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.85rem'}}/>
                    <Inp label="" placeholder="Lote" value={cor.lote} onChange={e=>updCor(i,'lote',e.target.value)} style={{width:120}}/>
                    <button onClick={()=>delCor(i)} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:'.78rem'}}>Remover</button>
                  </div>
                  <div style={{padding:'14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
                    <div style={{gridColumn:'span 4'}}>
                      <p style={{margin:'0 0 8px',fontSize:'.78rem',fontWeight:700,color:'#374151'}}>🧶 MALHA</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <Inp label="Kg de malha" type="number" min="0" step="0.001" value={cor.kg_malha} onChange={e=>updCor(i,'kg_malha',e.target.value)}/>
                        <Inp label="Preço/kg malha (R$)" type="number" min="0" step="0.01" value={cor.preco_kg_malha} onChange={e=>updCor(i,'preco_kg_malha',e.target.value)}/>
                      </div>
                    </div>
                    <div style={{gridColumn:'span 4'}}>
                      <p style={{margin:'8px 0 8px',fontSize:'.78rem',fontWeight:700,color:'#374151'}}>🔵 RIBANA</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <Inp label="Kg de ribana" type="number" min="0" step="0.001" value={cor.kg_ribana} onChange={e=>updCor(i,'kg_ribana',e.target.value)}/>
                        <Inp label="Preço/kg ribana (R$)" type="number" min="0" step="0.01" value={cor.preco_kg_ribana} onChange={e=>updCor(i,'preco_kg_ribana',e.target.value)}/>
                      </div>
                    </div>
                    {subtotal>0&&(
                      <div style={{gridColumn:'span 4',padding:'8px 12px',background:'#f0fdf4',borderRadius:7,border:'1px solid #86efac'}}>
                        <span style={{fontSize:'.8rem',fontWeight:700,color:'#16a34a'}}>Subtotal desta cor: {subtotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2 - Revisão */}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {sucesso&&(
              <div style={{padding:'14px 18px',background:'#f0fdf4',borderRadius:10,border:'1px solid #86efac',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#16a34a'}}>✅ Entrada registrada com sucesso!</p>
              </div>
            )}
            {/* Resumo header */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[
                {l:'Fornecedor',v:form.fornecedor||'—'},
                {l:'Tipo de malha',v:form.tipo_malha||'—'},
                {l:'Data',v:form.data_entrada?new Date(form.data_entrada+'T00:00:00').toLocaleDateString('pt-BR'):'—'},
              ].map(({l,v})=>(
                <div key={l} style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px'}}>
                  <p style={{margin:0,fontSize:'.7rem',fontWeight:600,color:'#9ca3af',textTransform:'uppercase'}}>{l}</p>
                  <p style={{margin:0,fontSize:'.9rem',fontWeight:700,color:'#111827'}}>{v}</p>
                </div>
              ))}
            </div>
            {/* Cores resumo */}
            <div style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.83rem'}}>
                <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
                  {['Cor','Kg Malha','R$/kg','Kg Ribana','R$/kg','Subtotal'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:700,color:'#374151'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {form.cores.map((c,i)=>{
                    const sub=(+c.kg_malha||0)*(+c.preco_kg_malha||0)+(+c.kg_ribana||0)*(+c.preco_kg_ribana||0);
                    return(
                      <tr key={i} style={{borderTop:'1px solid #f1f5f9'}}>
                        <td style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:14,height:14,borderRadius:'50%',background:c.hex_cor,border:'1px solid #e5e7eb'}}/>
                          <span style={{fontWeight:600}}>{c.nome_cor||'—'}</span>
                        </td>
                        <td style={{padding:'8px 12px'}}>{c.kg_malha||0} kg</td>
                        <td style={{padding:'8px 12px'}}>{c.preco_kg_malha?Number(c.preco_kg_malha).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</td>
                        <td style={{padding:'8px 12px'}}>{c.kg_ribana||0} kg</td>
                        <td style={{padding:'8px 12px'}}>{c.preco_kg_ribana?Number(c.preco_kg_ribana).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</td>
                        <td style={{padding:'8px 12px',fontWeight:700,color:'#16a34a'}}>{sub.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:'#f0fdf4',borderTop:'2px solid #86efac'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:'#374151'}} colSpan={2}>TOTAIS</td>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{totalMalha.toFixed(3)} kg</td>
                    <td style={{padding:'8px 12px'}}/>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{totalRibana.toFixed(3)} kg</td>
                    <td style={{padding:'8px 12px',fontWeight:800,color:'#16a34a',fontSize:'.95rem'}}>{totalValor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Navegação */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
          {step>0?<button onClick={()=>setStep(s=>s-1)} style={{padding:'8px 18px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>← Anterior</button>:<div/>}
          {step<2?<button onClick={()=>{if(step===0&&!form.data_entrada){alert('Informe a data de entrada');return;}setStep(s=>s+1);}} style={{padding:'8px 18px',borderRadius:8,background:'#16a34a',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:'pointer'}}>Próximo →</button>
           :<button onClick={salvar} disabled={salvando||sucesso} style={{padding:'8px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
             {salvando?'Registrando...':'✓ Confirmar entrada'}
           </button>}
        </div>
      </div>

      {/* Histórico */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9'}}>
          <span style={{fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Histórico de entradas</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Data','Tipo','Nº Controle','Fornecedor','Tipo Malha','Gramatura','Valor Total'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :entradas.length===0?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af',fontSize:'.85rem'}}>Nenhuma entrada registrada ainda.</td></tr>
               :entradas.map(e=>(
                <tr key={e.id} onMouseEnter={el=>el.currentTarget.style.background='#f9fafb'} onMouseLeave={el=>el.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={TD}>{e.data_entrada?new Date(e.data_entrada).toLocaleDateString('pt-BR'):'—'}</td>
                  <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:e.tipo_entrada==='com_nf'?'#f0fdf4':'#fefce8',color:e.tipo_entrada==='com_nf'?'#16a34a':'#ca8a04'}}>{e.tipo_entrada==='com_nf'?'Com NF':'Sem NF'}</span></td>
                  <td style={TD}>{e.numero_controle||'—'}</td>
                  <td style={TD}>{e.fornecedor||'—'}</td>
                  <td style={TD}>{e.tipo_malha||'—'}</td>
                  <td style={TD}>{e.gramatura?`${e.gramatura} g/m²`:'—'}</td>
                  <td style={{...TD,fontWeight:700,color:'#16a34a'}}>{Number(e.valor_total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
