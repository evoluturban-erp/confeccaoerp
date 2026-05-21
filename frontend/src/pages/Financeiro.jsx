import { useState, useMemo } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

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
const Overlay=({children,onClose,width='560px'})=>(
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
       onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'88vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>{children}</div>
  </div>
);

const FORM_REC={cliente_id:'',descricao:'',valor:'',forma_pagamento:'',vencimento:''};
const FORM_PAG={fornecedor:'',categoria:'',descricao:'',valor:'',forma_pagamento:'',vencimento:''};
const CATS_PAG=['Matéria-prima','Facção','Serviços','Salários','Aluguel','Logística','Outros'];

function TabelaReceber({dados,onBaixar,onNovo,isLoading}) {
  const [filtro,setFiltro]=useState({status:'',vencido:'false'});
  const filtrados=dados.filter(r=>{
    if(filtro.status&&r.status!==filtro.status)return false;
    if(filtro.vencido==='true'&&!(r.vencimento&&new Date(r.vencimento)<new Date()&&r.status==='pendente'))return false;
    return true;
  });
  const total=filtrados.reduce((s,r)=>s+(+r.valor||0),0);
  const recebido=filtrados.filter(r=>r.status==='pago').reduce((s,r)=>s+(+r.valor||0),0);
  const TD={padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {l:'Total a receber',v:total,c:'#3b82f6',bg:'#eff6ff'},
          {l:'Já recebido',v:recebido,c:'#16a34a',bg:'#f0fdf4'},
          {l:'Pendente',v:total-recebido,c:'#f59e0b',bg:'#fefce8'},
        ].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:10,padding:'12px 16px',border:`1px solid ${c}20`}}>
            <p style={{margin:0,fontSize:'.72rem',fontWeight:600,color:'#6b7280',textTransform:'uppercase'}}>{l}</p>
            <p style={{margin:0,fontSize:'1.2rem',fontWeight:800,color:c}}>{v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <Sel label="" value={filtro.status} onChange={e=>setFiltro(f=>({...f,status:e.target.value}))} style={{maxWidth:160}}>
          <option value="">Todos status</option><option value="pendente">Pendente</option><option value="pago">Pago</option>
        </Sel>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'.83rem',color:'#374151',cursor:'pointer'}}>
          <input type="checkbox" checked={filtro.vencido==='true'} onChange={e=>setFiltro(f=>({...f,vencido:e.target.checked?'true':'false'}))}/>
          Somente vencidos
        </label>
        <button onClick={onNovo} style={{marginLeft:'auto',padding:'7px 16px',borderRadius:8,background:'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.82rem',fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(22,163,74,.25)'}}>+ Nova conta</button>
      </div>
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Cliente','Descrição','Valor','Forma Pgto','Vencimento','Status','Ação'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :filtrados.length===0?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af',fontSize:'.85rem'}}>Nenhuma conta encontrada.</td></tr>
               :filtrados.map(r=>{
                const vencido=r.vencimento&&new Date(r.vencimento)<new Date()&&r.status==='pendente';
                return(
                <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9',background:vencido?'#fff5f5':'transparent'}}>
                  <td style={{...TD,fontWeight:600}}>{r.cliente_nome||'—'}</td>
                  <td style={TD}>{r.descricao||'—'}</td>
                  <td style={{...TD,fontWeight:700,color:'#16a34a'}}>{Number(r.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  <td style={TD}>{r.forma_pagamento||'—'}</td>
                  <td style={{...TD,color:vencido?'#dc2626':'#374151',fontWeight:vencido?700:400}}>
                    {r.vencimento?new Date(r.vencimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}
                    {vencido&&<span style={{marginLeft:4,fontSize:'.7rem'}}>⚠️</span>}
                  </td>
                  <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:r.status==='pago'?'#f0fdf4':'#fefce8',color:r.status==='pago'?'#16a34a':'#ca8a04'}}>{r.status}</span></td>
                  <td style={TD}>
                    {r.status==='pendente'&&<button onClick={()=>onBaixar(r.id)} style={{padding:'4px 12px',borderRadius:6,background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontSize:'.78rem',fontWeight:600}}>✓ Pago</button>}
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabelaPagar({dados,onBaixar,onNovo,isLoading}) {
  const [filtro,setFiltro]=useState({status:'',categoria:''});
  const filtrados=dados.filter(r=>{
    if(filtro.status&&r.status!==filtro.status)return false;
    if(filtro.categoria&&r.categoria!==filtro.categoria)return false;
    return true;
  });
  const total=filtrados.reduce((s,r)=>s+(+r.valor||0),0);
  const pago=filtrados.filter(r=>r.status==='pago').reduce((s,r)=>s+(+r.valor||0),0);
  const TD={padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {l:'Total a pagar',v:total,c:'#dc2626',bg:'#fef2f2'},
          {l:'Já pago',v:pago,c:'#16a34a',bg:'#f0fdf4'},
          {l:'Pendente',v:total-pago,c:'#f59e0b',bg:'#fefce8'},
        ].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:10,padding:'12px 16px',border:`1px solid ${c}20`}}>
            <p style={{margin:0,fontSize:'.72rem',fontWeight:600,color:'#6b7280',textTransform:'uppercase'}}>{l}</p>
            <p style={{margin:0,fontSize:'1.2rem',fontWeight:800,color:c}}>{v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <Sel label="" value={filtro.status} onChange={e=>setFiltro(f=>({...f,status:e.target.value}))} style={{maxWidth:160}}>
          <option value="">Todos status</option><option value="pendente">Pendente</option><option value="pago">Pago</option>
        </Sel>
        <Sel label="" value={filtro.categoria} onChange={e=>setFiltro(f=>({...f,categoria:e.target.value}))} style={{maxWidth:180}}>
          <option value="">Todas categorias</option>{CATS_PAG.map(c=><option key={c} value={c}>{c}</option>)}
        </Sel>
        <button onClick={onNovo} style={{marginLeft:'auto',padding:'7px 16px',borderRadius:8,background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',border:'none',fontSize:'.82rem',fontWeight:600,cursor:'pointer'}}>+ Nova conta</button>
      </div>
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Fornecedor','Categoria','Descrição','Valor','Forma Pgto','Vencimento','Status','Ação'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading?<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Carregando...</td></tr>
               :filtrados.length===0?<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#9ca3af',fontSize:'.85rem'}}>Nenhuma conta encontrada.</td></tr>
               :filtrados.map(r=>{
                const vencido=r.vencimento&&new Date(r.vencimento)<new Date()&&r.status==='pendente';
                return(
                <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9',background:vencido?'#fff5f5':'transparent'}}>
                  <td style={{...TD,fontWeight:600}}>{r.fornecedor||'—'}</td>
                  <td style={TD}>{r.categoria?<span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:'#f3f4f6',color:'#374151'}}>{r.categoria}</span>:'—'}</td>
                  <td style={TD}>{r.descricao||'—'}</td>
                  <td style={{...TD,fontWeight:700,color:'#dc2626'}}>{Number(r.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  <td style={TD}>{r.forma_pagamento||'—'}</td>
                  <td style={{...TD,color:vencido?'#dc2626':'#374151',fontWeight:vencido?700:400}}>
                    {r.vencimento?new Date(r.vencimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}
                    {vencido&&<span style={{marginLeft:4}}>⚠️</span>}
                  </td>
                  <td style={TD}><span style={{padding:'3px 10px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:r.status==='pago'?'#f0fdf4':'#fef2f2',color:r.status==='pago'?'#16a34a':'#dc2626'}}>{r.status}</span></td>
                  <td style={TD}>
                    {r.status==='pendente'&&<button onClick={()=>onBaixar(r.id)} style={{padding:'4px 12px',borderRadius:6,background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontSize:'.78rem',fontWeight:600}}>✓ Pago</button>}
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [aba,setAba]=useState(0);
  const [modalRec,setModalRec]=useState(false);
  const [modalPag,setModalPag]=useState(false);
  const [formRec,setFormRec]=useState(FORM_REC);
  const [formPag,setFormPag]=useState(FORM_PAG);
  const [salvando,setSalvando]=useState(false);

  const {data:receber=[],isLoading:lRec,refetch:rRec}=useApiQuery(['receber'],()=>api.get('/financeiro/receber'));
  const {data:pagar=[],isLoading:lPag,refetch:rPag}=useApiQuery(['pagar'],()=>api.get('/financeiro/pagar'));
  const {data:ranking={clientes:[]}}=useApiQuery(['ranking-clientes'],()=>api.get('/relatorios/ranking-clientes'));
  const {data:dre={}}=useApiQuery(['dre'],()=>api.get('/relatorios/dre'));
  const {data:clientes=[]}=useApiQuery(['clientes'],()=>api.get('/clientes'));

  const baixarRec=async(id)=>{
    try{await api.patch(`/financeiro/receber/${id}/baixar`);rRec();}
    catch(e){alert(e.response?.data?.error||'Erro ao baixar');}
  };
  const baixarPag=async(id)=>{
    try{await api.patch(`/financeiro/pagar/${id}/baixar`);rPag();}
    catch(e){alert(e.response?.data?.error||'Erro ao baixar');}
  };
  const salvarRec=async()=>{
    if(!formRec.valor||!formRec.vencimento){alert('Valor e vencimento são obrigatórios');return;}
    setSalvando(true);
    try{await api.post('/financeiro/receber',formRec);rRec();setModalRec(false);setFormRec(FORM_REC);}
    catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };
  const salvarPag=async()=>{
    if(!formPag.valor||!formPag.vencimento){alert('Valor e vencimento são obrigatórios');return;}
    setSalvando(true);
    try{await api.post('/financeiro/pagar',formPag);rPag();setModalPag(false);setFormPag(FORM_PAG);}
    catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };

  const ABAS=['💰 Contas a Receber','💸 Contas a Pagar','🏆 Ranking Clientes','📊 DRE'];

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Tabs */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',padding:'0 8px'}}>
          {ABAS.map((a,i)=>(
            <button key={i} onClick={()=>setAba(i)} style={{padding:'14px 18px',border:'none',background:'none',fontSize:'.85rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`3px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',whiteSpace:'nowrap',marginBottom:-1}}>
              {a}
            </button>
          ))}
        </div>
        <div style={{padding:'18px'}}>
          {aba===0&&<TabelaReceber dados={receber} onBaixar={baixarRec} onNovo={()=>setModalRec(true)} isLoading={lRec}/>}
          {aba===1&&<TabelaPagar dados={pagar} onBaixar={baixarPag} onNovo={()=>setModalPag(true)} isLoading={lPag}/>}

          {aba===2&&(
            <div>
              <h4 style={{margin:'0 0 14px',fontSize:'.9rem',fontWeight:700,color:'#111827'}}>Ranking de Clientes por Faturamento</h4>
              {(ranking.clientes||[]).length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'2rem'}}>Sem dados de faturamento ainda.</p>:(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(ranking.clientes||[]).map((c,i)=>(
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#f8fafc',borderRadius:10,border:'1px solid #e5e7eb'}}>
                      <span style={{width:28,height:28,borderRadius:'50%',background:i<3?['#f59e0b','#9ca3af','#d97706'][i]:'#e5e7eb',color:i<3?'#fff':'#6b7280',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'.8rem',flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontWeight:700,color:'#111827',fontSize:'.9rem'}}>{c.razao_social}</p>
                        <p style={{margin:0,fontSize:'.75rem',color:'#6b7280'}}>{c.total_ops} OPs · {c.total_faturas} faturas</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{margin:0,fontWeight:800,color:'#16a34a',fontSize:'.95rem'}}>{Number(c.faturamento_total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                        <p style={{margin:0,fontSize:'.72rem',color:'#6b7280'}}>recebido: {Number(c.recebido||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {aba===3&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h4 style={{margin:0,fontSize:'.9rem',fontWeight:700,color:'#111827'}}>DRE — {dre.periodo?.data_ini} a {dre.periodo?.data_fim}</h4>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                {[
                  {l:'Receita Total',v:dre.receitas?.total||0,c:'#16a34a',bg:'#f0fdf4'},
                  {l:'Despesa Total',v:dre.despesas?.total||0,c:'#dc2626',bg:'#fef2f2'},
                  {l:'Lucro Bruto',v:dre.lucro_bruto||0,c:+dre.lucro_bruto>=0?'#16a34a':'#dc2626',bg:+dre.lucro_bruto>=0?'#f0fdf4':'#fef2f2'},
                ].map(({l,v,c,bg})=>(
                  <div key={l} style={{background:bg,borderRadius:10,padding:'14px 18px',border:`1px solid ${c}25`}}>
                    <p style={{margin:0,fontSize:'.72rem',fontWeight:600,color:'#6b7280',textTransform:'uppercase'}}>{l}</p>
                    <p style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:c}}>{Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 18px',border:'1px solid #e5e7eb'}}>
                  <p style={{margin:'0 0 10px',fontWeight:700,color:'#374151',fontSize:'.85rem'}}>Receitas</p>
                  {[['A receber',dre.receitas?.a_receber,'#3b82f6'],['Recebido',dre.receitas?.recebido,'#16a34a']].map(([l,v,c])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f1f5f9'}}>
                      <span style={{fontSize:'.82rem',color:'#6b7280'}}>{l}</span>
                      <span style={{fontSize:'.85rem',fontWeight:700,color:c}}>{Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 18px',border:'1px solid #e5e7eb'}}>
                  <p style={{margin:'0 0 10px',fontWeight:700,color:'#374151',fontSize:'.85rem'}}>Despesas</p>
                  {[['A pagar',dre.despesas?.a_pagar,'#f59e0b'],['Pago',dre.despesas?.pago,'#dc2626']].map(([l,v,c])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f1f5f9'}}>
                      <span style={{fontSize:'.82rem',color:'#6b7280'}}>{l}</span>
                      <span style={{fontSize:'.85rem',fontWeight:700,color:c}}>{Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0 0'}}>
                    <span style={{fontSize:'.82rem',fontWeight:700,color:'#374151'}}>Margem</span>
                    <span style={{fontSize:'.9rem',fontWeight:800,color:+dre.margem_percent>=0?'#16a34a':'#dc2626'}}>{dre.margem_percent||'0.00'}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova conta a receber */}
      {modalRec&&(
        <Overlay onClose={()=>setModalRec(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>Nova Conta a Receber</h3>
            <button onClick={()=>setModalRec(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{flex:1,padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
            <Sel label="Cliente" value={formRec.cliente_id} onChange={e=>setFormRec(f=>({...f,cliente_id:e.target.value}))}>
              <option value="">Sem cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.razao_social}</option>)}
            </Sel>
            <Inp label="Descrição" value={formRec.descricao} onChange={e=>setFormRec(f=>({...f,descricao:e.target.value}))}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Inp label="Valor (R$) *" type="number" min="0" step="0.01" value={formRec.valor} onChange={e=>setFormRec(f=>({...f,valor:e.target.value}))}/>
              <Inp label="Vencimento *" type="date" value={formRec.vencimento} onChange={e=>setFormRec(f=>({...f,vencimento:e.target.value}))}/>
            </div>
            <Inp label="Forma de pagamento" placeholder="Ex: PIX, Boleto" value={formRec.forma_pagamento} onChange={e=>setFormRec(f=>({...f,forma_pagamento:e.target.value}))}/>
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={()=>setModalRec(false)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarRec} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer'}}>
              {salvando?'Salvando...':'Criar conta'}
            </button>
          </div>
        </Overlay>
      )}

      {/* Modal Nova conta a pagar */}
      {modalPag&&(
        <Overlay onClose={()=>setModalPag(false)}>
          <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>Nova Conta a Pagar</h3>
            <button onClick={()=>setModalPag(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
          </div>
          <div style={{flex:1,padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Inp label="Fornecedor" value={formPag.fornecedor} onChange={e=>setFormPag(f=>({...f,fornecedor:e.target.value}))}/>
              <Sel label="Categoria" value={formPag.categoria} onChange={e=>setFormPag(f=>({...f,categoria:e.target.value}))}>
                <option value="">Sem categoria</option>{CATS_PAG.map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
            </div>
            <Inp label="Descrição" value={formPag.descricao} onChange={e=>setFormPag(f=>({...f,descricao:e.target.value}))}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Inp label="Valor (R$) *" type="number" min="0" step="0.01" value={formPag.valor} onChange={e=>setFormPag(f=>({...f,valor:e.target.value}))}/>
              <Inp label="Vencimento *" type="date" value={formPag.vencimento} onChange={e=>setFormPag(f=>({...f,vencimento:e.target.value}))}/>
            </div>
            <Inp label="Forma de pagamento" value={formPag.forma_pagamento} onChange={e=>setFormPag(f=>({...f,forma_pagamento:e.target.value}))}/>
          </div>
          <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button onClick={()=>setModalPag(false)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarPag} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer'}}>
              {salvando?'Salvando...':'Criar conta'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
