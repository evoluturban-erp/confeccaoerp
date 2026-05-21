import { useState, useRef } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const hoje = new Date().toISOString().slice(0,10);
const anoIni = `${new Date().getFullYear()}-01-01`;

const ABAS = ['💰 Fluxo de Caixa','📊 DRE','📥 A Receber','📤 A Pagar','🏆 Ranking Clientes'];

function BtnImprimir({onClick}) {
  return (
    <button onClick={onClick} style={{padding:'6px 16px',borderRadius:7,background:'#f3f4f6',color:'#374151',border:'1px solid #d1d5db',cursor:'pointer',fontSize:'.82rem',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
      🖨️ Imprimir
    </button>
  );
}
function FiltroData({ini,fim,setIni,setFim}) {
  return (
    <div style={{display:'flex',gap:10,alignItems:'center'}}>
      <label style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>Período:</label>
      <input type="date" value={ini} onChange={e=>setIni(e.target.value)}
        style={{padding:'6px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.83rem',outline:'none'}}/>
      <span style={{fontSize:'.8rem',color:'#6b7280'}}>até</span>
      <input type="date" value={fim} onChange={e=>setFim(e.target.value)}
        style={{padding:'6px 10px',borderRadius:7,border:'1px solid #d1d5db',fontSize:'.83rem',outline:'none'}}/>
    </div>
  );
}

// ── Fluxo de Caixa ────────────────────────────────────────────────────────────
function RelFluxo() {
  const [ini,setIni]=useState(anoIni);
  const [fim,setFim]=useState(hoje);
  const ref=useRef();
  const {data={fluxo:[]}}=useApiQuery(['fluxo',ini,fim],()=>api.get('/relatorios/fluxo-caixa',{params:{data_ini:ini,data_fim:fim}}));
  const fluxo=data.fluxo||[];
  const totalEnt=fluxo.reduce((s,f)=>s+(+f.entradas||0),0);
  const totalSai=fluxo.reduce((s,f)=>s+(+f.saidas||0),0);
  const saldoFinal=totalEnt-totalSai;
  const maxVal=Math.max(...fluxo.map(f=>Math.max(+f.entradas||0,+f.saidas||0)),1);
  const fmt=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  return (
    <div ref={ref} style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <FiltroData ini={ini} fim={fim} setIni={setIni} setFim={setFim}/>
        <BtnImprimir onClick={()=>window.print()}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[{l:'Total entradas',v:totalEnt,c:'#16a34a',bg:'#f0fdf4'},{l:'Total saídas',v:totalSai,c:'#dc2626',bg:'#fef2f2'},{l:'Saldo do período',v:saldoFinal,c:saldoFinal>=0?'#16a34a':'#dc2626',bg:saldoFinal>=0?'#f0fdf4':'#fef2f2'}].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:10,padding:'12px 16px',border:`1px solid ${c}20`}}>
            <p style={{margin:0,fontSize:'.72rem',fontWeight:600,color:'#6b7280',textTransform:'uppercase'}}>{l}</p>
            <p style={{margin:0,fontSize:'1.2rem',fontWeight:800,color:c}}>{fmt(v)}</p>
          </div>
        ))}
      </div>
      {fluxo.length>0&&(
        <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',padding:'16px'}}>
          <p style={{margin:'0 0 12px',fontWeight:700,fontSize:'.85rem',color:'#374151'}}>Entradas × Saídas por período</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {fluxo.map((f,i) => (
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:'.78rem'}}>
                  <span style={{color:'#374151',fontWeight:600}}>{new Date(f.periodo).toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}</span>
                  <span style={{color:'#374151'}}>{fmt(+f.entradas||0)} / {fmt(+f.saidas||0)}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${((+f.entradas||0)/maxVal)*100}%`,background:'#16a34a',borderRadius:999}}/>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${((+f.saidas||0)/maxVal)*100}%`,background:'#dc2626',borderRadius:999}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:14,marginTop:10,fontSize:'.75rem'}}>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'#16a34a',display:'inline-block'}}/>Entradas</span>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'#dc2626',display:'inline-block'}}/>Saídas</span>
          </div>
        </div>
      )}
      {fluxo.length===0&&<p style={{textAlign:'center',color:'#9ca3af',padding:'2rem'}}>Sem dados para o período.</p>}
    </div>
  );
}

// ── DRE ───────────────────────────────────────────────────────────────────────
function RelDRE() {
  const [ini,setIni]=useState(anoIni);
  const [fim,setFim]=useState(hoje);
  const {data:dre={receitas:{},despesas:{},lucro_bruto:0,margem_percent:'0.00'}}=useApiQuery(['dre',ini,fim],()=>api.get('/relatorios/dre',{params:{data_ini:ini,data_fim:fim}}));
  const fmt=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const mg=+dre.margem_percent;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <FiltroData ini={ini} fim={fim} setIni={setIni} setFim={setFim}/>
        <BtnImprimir onClick={()=>window.print()}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {l:'Receita Bruta',    v:dre.receitas?.total,   c:'#16a34a', bg:'#f0fdf4'},
          {l:'Total Despesas',   v:dre.despesas?.total,   c:'#dc2626', bg:'#fef2f2'},
          {l:'Lucro Bruto',      v:dre.lucro_bruto,       c:+dre.lucro_bruto>=0?'#16a34a':'#dc2626', bg:+dre.lucro_bruto>=0?'#f0fdf4':'#fef2f2'},
        ].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:10,padding:'14px 18px',border:`1px solid ${c}25`}}>
            <p style={{margin:0,fontSize:'.72rem',fontWeight:600,color:'#6b7280',textTransform:'uppercase'}}>{l}</p>
            <p style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:c}}>{fmt(v)}</p>
          </div>
        ))}
      </div>
      {/* Margem */}
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:'.85rem',color:'#374151'}}>Margem de lucro</span>
          <span style={{fontSize:'1.2rem',fontWeight:800,color:mg>=20?'#16a34a':mg>=10?'#f59e0b':'#dc2626'}}>{mg.toFixed(1)}%</span>
        </div>
        <div style={{height:12,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${Math.min(Math.max(mg,0),100)}%`,background:mg>=20?'#16a34a':mg>=10?'#f59e0b':'#dc2626',borderRadius:999}}/>
        </div>
      </div>
      {/* Detalhes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {[
          {t:'Receitas',rows:[['Faturado',dre.receitas?.total,'#374151'],['Recebido',dre.receitas?.recebido,'#16a34a'],['A receber',dre.receitas?.a_receber,'#3b82f6']]},
          {t:'Despesas',rows:[['Total',dre.despesas?.total,'#374151'],['Pago',dre.despesas?.pago,'#dc2626'],['A pagar',dre.despesas?.a_pagar,'#f59e0b']]},
        ].map(({t,rows}) => (
          <div key={t} style={{background:'#f8fafc',borderRadius:10,padding:'14px',border:'1px solid #e5e7eb'}}>
            <p style={{margin:'0 0 10px',fontWeight:700,fontSize:'.85rem',color:'#111827'}}>{t}</p>
            {rows.map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
                <span style={{fontSize:'.82rem',color:'#6b7280'}}>{l}</span>
                <span style={{fontSize:'.85rem',fontWeight:700,color:c}}>{fmt(v)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── A Receber ─────────────────────────────────────────────────────────────────
function RelReceber() {
  const {data:receber=[]}=useApiQuery(['rel-receber'],()=>api.get('/financeiro/receber'));
  const fmt=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const total=receber.reduce((s,r)=>s+(+r.valor||0),0);
  const pago=receber.filter(r=>r.status==='pago').reduce((s,r)=>s+(+r.valor||0),0);
  const pendente=receber.filter(r=>r.status==='pendente').reduce((s,r)=>s+(+r.valor||0),0);
  const vencido=receber.filter(r=>r.status==='pendente'&&r.vencimento&&new Date(r.vencimento)<new Date()).reduce((s,r)=>s+(+r.valor||0),0);
  const TD={padding:'9px 14px',fontSize:'.83rem',color:'#374151',verticalAlign:'middle'};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}><BtnImprimir onClick={()=>window.print()}/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Total',v:total,c:'#374151'},{l:'Recebido',v:pago,c:'#16a34a'},{l:'Pendente',v:pendente,c:'#3b82f6'},{l:'Vencido',v:vencido,c:'#dc2626'}].map(({l,v,c})=>(
          <div key={l} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e5e7eb'}}>
            <p style={{margin:0,fontSize:'.7rem',fontWeight:600,color:'#9ca3af',textTransform:'uppercase'}}>{l}</p>
            <p style={{margin:0,fontSize:'1.05rem',fontWeight:800,color:c}}>{fmt(v)}</p>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
            {['Cliente','Descrição','Valor','Vencimento','Forma Pgto','Status'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {receber.length===0&&<tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhuma conta a receber.</td></tr>}
            {receber.map(r=>{
              const atrasado=r.status==='pendente'&&r.vencimento&&new Date(r.vencimento)<new Date();
              return(
                <tr key={r.id} style={{borderBottom:'1px solid #f1f5f9',background:atrasado?'#fff5f5':'transparent'}}>
                  <td style={{...TD,fontWeight:600}}>{r.cliente_nome||'—'}</td>
                  <td style={TD}>{r.descricao||'—'}</td>
                  <td style={{...TD,fontWeight:700,color:'#16a34a'}}>{fmt(r.valor)}</td>
                  <td style={{...TD,color:atrasado?'#dc2626':'#374151'}}>{r.vencimento?new Date(r.vencimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                  <td style={TD}>{r.forma_pagamento||'—'}</td>
                  <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:r.status==='pago'?'#f0fdf4':'#fef2f2',color:r.status==='pago'?'#16a34a':'#dc2626'}}>{r.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── A Pagar ───────────────────────────────────────────────────────────────────
function RelPagar() {
  const {data:pagar=[]}=useApiQuery(['rel-pagar'],()=>api.get('/financeiro/pagar'));
  const fmt=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const catMap={};
  pagar.forEach(p=>{const c=p.categoria||'Outros';catMap[c]=(catMap[c]||0)+(+p.valor||0);});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat=cats[0]?.[1]||1;
  const total=pagar.reduce((s,p)=>s+(+p.valor||0),0);
  const TD={padding:'9px 14px',fontSize:'.83rem',color:'#374151',verticalAlign:'middle'};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}><BtnImprimir onClick={()=>window.print()}/></div>
      {cats.length>0&&(
        <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',padding:'16px'}}>
          <p style={{margin:'0 0 12px',fontWeight:700,fontSize:'.85rem',color:'#374151'}}>Despesas por categoria</p>
          {cats.map(([cat,val])=>(
            <div key={cat} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:'.8rem',color:'#374151'}}>{cat}</span>
                <span style={{fontSize:'.8rem',fontWeight:700,color:'#dc2626'}}>{fmt(val)} ({total>0?((val/total)*100).toFixed(0):0}%)</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(val/maxCat)*100}%`,background:'#dc2626',borderRadius:999}}/>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
            {['Fornecedor','Categoria','Valor','Vencimento','Forma Pgto','Status'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pagar.length===0&&<tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhuma conta a pagar.</td></tr>}
            {pagar.map(p=>(
              <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                <td style={{...TD,fontWeight:600}}>{p.fornecedor||'—'}</td>
                <td style={TD}>{p.categoria?<span style={{padding:'2px 8px',borderRadius:999,background:'#f3f4f6',color:'#374151',fontSize:'.72rem',fontWeight:600}}>{p.categoria}</span>:'—'}</td>
                <td style={{...TD,fontWeight:700,color:'#dc2626'}}>{fmt(p.valor)}</td>
                <td style={TD}>{p.vencimento?new Date(p.vencimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                <td style={TD}>{p.forma_pagamento||'—'}</td>
                <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,fontSize:'.72rem',fontWeight:600,background:p.status==='pago'?'#f0fdf4':'#fef2f2',color:p.status==='pago'?'#16a34a':'#dc2626'}}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ranking Clientes ──────────────────────────────────────────────────────────
function RelRanking() {
  const {data={clientes:[]}}=useApiQuery(['rel-ranking'],()=>api.get('/relatorios/ranking-clientes',{params:{limite:20}}));
  const clientes=data.clientes||[];
  const fmt=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const medalhas=['🥇','🥈','🥉'];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}><BtnImprimir onClick={()=>window.print()}/></div>
      {clientes.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'2rem'}}>Sem dados de faturamento.</p>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {clientes.map((c,i) => {
            const maxFat=+clientes[0]?.faturamento_total||1;
            const pctBar=((+c.faturamento_total||0)/maxFat)*100;
            return (
              <div key={c.id} style={{background:'#fff',borderRadius:10,padding:'14px 16px',border:'1px solid #e5e7eb',display:'flex',gap:14,alignItems:'center'}}>
                <span style={{fontSize:i<3?'1.3rem':'.85rem',fontWeight:700,minWidth:32,textAlign:'center',color:'#374151'}}>{i<3?medalhas[i]:i+1}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <div>
                      <p style={{margin:0,fontWeight:700,color:'#111827',fontSize:'.9rem'}}>{c.razao_social}</p>
                      <p style={{margin:0,fontSize:'.73rem',color:'#6b7280'}}>{c.total_ops||0} OPs · {c.total_faturas||0} faturas</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{margin:0,fontWeight:800,color:'#16a34a',fontSize:'.95rem'}}>{fmt(c.faturamento_total)}</p>
                      <p style={{margin:0,fontSize:'.72rem',color:'#6b7280'}}>Recebido: {fmt(c.recebido)}</p>
                    </div>
                  </div>
                  <div style={{height:5,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pctBar}%`,background:i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#d97706':'#16a34a',borderRadius:999}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [aba,setAba]=useState(0);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',padding:'0 8px',overflowX:'auto'}}>
          {ABAS.map((a,i)=>(
            <button key={i} onClick={()=>setAba(i)} style={{padding:'13px 16px',border:'none',background:'none',fontSize:'.83rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`3px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',whiteSpace:'nowrap',marginBottom:-1}}>
              {a}
            </button>
          ))}
        </div>
        <div style={{padding:'20px'}}>
          {aba===0&&<RelFluxo/>}
          {aba===1&&<RelDRE/>}
          {aba===2&&<RelReceber/>}
          {aba===3&&<RelPagar/>}
          {aba===4&&<RelRanking/>}
        </div>
      </div>
    </div>
  );
}
