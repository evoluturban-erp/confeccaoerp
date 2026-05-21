import { useState, useMemo, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const TAMANHOS = ['PP','P','M','G','GG','XGG'];
const METRICAS = ['recebidas','aprovadas','retrabalho','refugo'];
const TIPO_DEF = ['Costura aberta','Ponto falhado','Mancha','Furo','Etiqueta incorreta','Tamanho errado','Peça torta','Barra desalinhada','Outro'];

const FORM0 = {
  op_id:'', faccao:'', revisora:'', data: new Date().toISOString().slice(0,10),
  cores_json:[], defeitos_json:[],
};

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
const Overlay = ({children,onClose,width='820px'}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
       onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:width,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
      {children}
    </div>
  </div>
);

// ── helpers ───────────────────────────────────────────────────────────────────
function somarMetrica(revisoes, metrica) {
  return revisoes.reduce((s,r) =>
    s + (r.cores_json||[]).reduce((cs,cor) =>
      cs + TAMANHOS.reduce((ts,t) => ts + (+((cor.tamanhos||{})[t]||{})[metrica]||0), 0)
    , 0)
  , 0);
}
function pct(a,b) { return b>0 ? ((a/b)*100).toFixed(1) : '0.0'; }

// ── Painel ────────────────────────────────────────────────────────────────────
function TabPainel({revisoes}) {
  const total    = somarMetrica(revisoes,'recebidas');
  const aprov    = somarMetrica(revisoes,'aprovadas');
  const retrab   = somarMetrica(revisoes,'retrabalho');
  const refugo   = somarMetrica(revisoes,'refugo');
  const taxaAprov = pct(aprov, total);
  const taxaRet   = pct(retrab, total);
  const taxaRef   = pct(refugo, total);

  // top defeitos
  const defMap = {};
  revisoes.forEach(r => (r.defeitos_json||[]).forEach(d => {
    defMap[d.tipo] = (defMap[d.tipo]||0) + (+d.quantidade||1);
  }));
  const topDef = Object.entries(defMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

  // por facção
  const facMap = {};
  revisoes.forEach(r => {
    const f = r.faccao||'Sem facção';
    if(!facMap[f]) facMap[f]={rec:0,apr:0,ret:0,ref:0};
    facMap[f].rec += somarMetrica([r],'recebidas');
    facMap[f].apr += somarMetrica([r],'aprovadas');
    facMap[f].ret += somarMetrica([r],'retrabalho');
    facMap[f].ref += somarMetrica([r],'refugo');
  });
  const facList = Object.entries(facMap).sort((a,b)=>b[1].rec-a[1].rec).slice(0,5);

  const TD = {padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:18}}>
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Peças revisadas', value:total,       icon:'🔍', c:'#3b82f6', bg:'#eff6ff'},
          {label:'Taxa aprovação',  value:`${taxaAprov}%`, icon:'✅', c:'#16a34a', bg:'#f0fdf4'},
          {label:'Retrabalho',      value:`${taxaRet}%`, icon:'🔄', c:'#f59e0b', bg:'#fefce8'},
          {label:'Refugo',          value:`${taxaRef}%`, icon:'❌', c:'#dc2626', bg:'#fef2f2'},
        ].map(({label,value,icon,c,bg}) => (
          <div key={label} style={{background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0}}>{icon}</div>
            <div>
              <p style={{margin:0,fontSize:'1.5rem',fontWeight:800,color:c,lineHeight:1}}>{value}</p>
              <p style={{margin:0,fontSize:'.75rem',color:'#6b7280',marginTop:2}}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:16}}>
        {/* Por facção */}
        <div style={{background:'#fff',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
          <h4 style={{margin:'0 0 14px',fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Taxa de aprovação por facção</h4>
          {facList.length===0 ? <p style={{color:'#9ca3af',fontSize:'.85rem',textAlign:'center',padding:'1rem'}}>Sem dados.</p> : facList.map(([f,m]) => {
            const tx = m.rec>0 ? (m.apr/m.rec)*100 : 0;
            const col = tx>=90?'#16a34a':tx>=70?'#f59e0b':'#dc2626';
            return (
              <div key={f} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:'.8rem',fontWeight:600,color:'#374151'}}>{f}</span>
                  <span style={{fontSize:'.8rem',fontWeight:700,color:col}}>{tx.toFixed(1)}% ({m.rec} pcs)</span>
                </div>
                <div style={{height:7,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(tx,100)}%`,background:col,borderRadius:999}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top defeitos */}
        <div style={{background:'#fff',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
          <h4 style={{margin:'0 0 14px',fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Top defeitos</h4>
          {topDef.length===0 ? <p style={{color:'#9ca3af',fontSize:'.85rem',textAlign:'center',padding:'1rem'}}>Nenhum defeito registrado.</p>
            : topDef.map(([tipo,qtd],i) => (
            <div key={tipo} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
              <span style={{width:22,height:22,borderRadius:'50%',background:i<3?['#dc2626','#f59e0b','#3b82f6'][i]:'#e5e7eb',color:i<3?'#fff':'#6b7280',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',fontWeight:800,flexShrink:0}}>{i+1}</span>
              <span style={{flex:1,fontSize:'.82rem',color:'#374151'}}>{tipo}</span>
              <span style={{fontSize:'.82rem',fontWeight:700,color:'#dc2626'}}>{qtd}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela recente */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9'}}>
          <span style={{fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Revisões recentes</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['OP','Facção','Revisora','Data','Recebidas','Aprovadas','Retrabalho','Refugo'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {revisoes.slice(0,10).map(r => {
                const rec=somarMetrica([r],'recebidas'); const apr=somarMetrica([r],'aprovadas');
                const ret=somarMetrica([r],'retrabalho'); const ref=somarMetrica([r],'refugo');
                return (
                  <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{...TD,fontWeight:700}}>{r.op_numero||'—'}</td>
                    <td style={TD}>{r.faccao||'—'}</td>
                    <td style={TD}>{r.revisora||'—'}</td>
                    <td style={TD}>{r.data?new Date(r.data).toLocaleDateString('pt-BR'):'—'}</td>
                    <td style={{...TD,textAlign:'center'}}>{rec}</td>
                    <td style={{...TD,textAlign:'center',color:'#16a34a',fontWeight:700}}>{apr}</td>
                    <td style={{...TD,textAlign:'center',color:'#f59e0b',fontWeight:700}}>{ret}</td>
                    <td style={{...TD,textAlign:'center',color:'#dc2626',fontWeight:700}}>{ref}</td>
                  </tr>
                );
              })}
              {revisoes.length===0&&<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhuma revisão registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Por OP ────────────────────────────────────────────────────────────────────
function TabPorOP({revisoes}) {
  const grouped = useMemo(() => {
    const m = {};
    revisoes.forEach(r => {
      const k = r.op_id||'sem-op';
      if(!m[k]) m[k]={op_numero:r.op_numero||'—',revisoes:[]};
      m[k].revisoes.push(r);
    });
    return Object.values(m);
  },[revisoes]);
  const TD = {padding:'8px 12px',fontSize:'.83rem',color:'#374151',verticalAlign:'middle'};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {grouped.length===0&&<p style={{textAlign:'center',color:'#9ca3af',padding:'2rem'}}>Sem revisões registradas.</p>}
      {grouped.map(({op_numero,revisoes:rs}) => {
        const rec=somarMetrica(rs,'recebidas'); const apr=somarMetrica(rs,'aprovadas');
        const ret=somarMetrica(rs,'retrabalho'); const ref=somarMetrica(rs,'refugo');
        return (
          <div key={op_numero} style={{background:'#fff',borderRadius:10,border:'1px solid #e5e7eb',overflow:'hidden'}}>
            <div style={{background:'#f8fafc',padding:'10px 16px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,color:'#111827'}}>OP {op_numero}</span>
              <div style={{display:'flex',gap:16,fontSize:'.8rem'}}>
                <span style={{color:'#374151'}}>Rec: <strong>{rec}</strong></span>
                <span style={{color:'#16a34a'}}>Apr: <strong>{apr}</strong></span>
                <span style={{color:'#f59e0b'}}>Ret: <strong>{ret}</strong></span>
                <span style={{color:'#dc2626'}}>Ref: <strong>{ref}</strong></span>
                <span style={{color:'#7c3aed'}}>Taxa: <strong>{pct(apr,rec)}%</strong></span>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.82rem'}}>
                <thead><tr style={{background:'#fafafa'}}>
                  <th style={{...TD,fontWeight:700}}>Facção</th><th style={{...TD,fontWeight:700}}>Cor</th>
                  {TAMANHOS.map(t=><th key={t} style={{...TD,textAlign:'center',fontWeight:700}}>{t}</th>)}
                  <th style={{...TD,fontWeight:700,color:'#16a34a'}}>Total Apr.</th>
                </tr></thead>
                <tbody>
                  {rs.flatMap(r=>(r.cores_json||[]).map((cor,ci)=>{
                    const ts=cor.tamanhos||{};
                    const totApr=TAMANHOS.reduce((s,t)=>s+(+ts[t]?.aprovadas||0),0);
                    return (
                      <tr key={`${r.id}-${ci}`} style={{borderTop:'1px solid #f1f5f9'}}>
                        <td style={TD}>{r.faccao||'—'}</td>
                        <td style={{...TD,fontWeight:600,color:'#7c3aed'}}>{cor.cor}</td>
                        {TAMANHOS.map(t=>(
                          <td key={t} style={{...TD,textAlign:'center',fontSize:'.78rem'}}>
                            {ts[t]?<div style={{display:'flex',flexDirection:'column',gap:1,alignItems:'center'}}>
                              <span style={{color:'#374151'}}>{ts[t].recebidas||0}</span>
                              <span style={{color:'#16a34a',fontSize:'.68rem'}}>{ts[t].aprovadas||0}</span>
                              {(ts[t].retrabalho||0)>0&&<span style={{color:'#f59e0b',fontSize:'.68rem'}}>{ts[t].retrabalho}r</span>}
                              {(ts[t].refugo||0)>0&&<span style={{color:'#dc2626',fontSize:'.68rem'}}>{ts[t].refugo}x</span>}
                            </div>:'—'}
                          </td>
                        ))}
                        <td style={{...TD,textAlign:'center',fontWeight:700,color:'#16a34a'}}>{totApr}</td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Retrabalho ────────────────────────────────────────────────────────────────
function TabRetrabalho({revisoes,onRefetch}) {
  const fila = useMemo(() => {
    const items = [];
    revisoes.forEach(r => {
      (r.cores_json||[]).forEach(cor => {
        TAMANHOS.forEach(tam => {
          const ts = (cor.tamanhos||{})[tam]||{};
          if((+ts.retrabalho||0)>0) items.push({...r,cor:cor.cor,tam,qtd:+ts.retrabalho});
        });
      });
    });
    return items;
  },[revisoes]);
  const TD = {padding:'10px 14px',fontSize:'.85rem',color:'#374151',verticalAlign:'middle'};
  return (
    <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Fila de retrabalho
          <span style={{marginLeft:8,padding:'2px 8px',borderRadius:999,background:'#fef3c7',color:'#d97706',fontSize:'.75rem',fontWeight:700}}>{fila.length}</span>
        </span>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
            {['OP','Facção','Cor','Tam','Qtd Retrabalho','Data','Revisora','Ações'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {fila.length===0&&<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhum item em retrabalho.</td></tr>}
            {fila.map((item,i) => (
              <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#fffbeb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                <td style={{...TD,fontWeight:700}}>{item.op_numero||'—'}</td>
                <td style={TD}>{item.faccao||'—'}</td>
                <td style={{...TD,color:'#7c3aed',fontWeight:600}}>{item.cor}</td>
                <td style={TD}><span style={{padding:'2px 8px',borderRadius:999,background:'#ede9fe',color:'#7c3aed',fontSize:'.75rem',fontWeight:700}}>{item.tam}</span></td>
                <td style={{...TD,textAlign:'center',fontWeight:700,color:'#f59e0b'}}>{item.qtd}</td>
                <td style={TD}>{item.data?new Date(item.data).toLocaleDateString('pt-BR'):'—'}</td>
                <td style={TD}>{item.revisora||'—'}</td>
                <td style={{...TD,display:'flex',gap:6}}>
                  <button style={{padding:'4px 12px',borderRadius:6,background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>✓ Aprovado</button>
                  <button style={{padding:'4px 12px',borderRadius:6,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>✕ Refugo</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Por Facção ────────────────────────────────────────────────────────────────
function TabFaccao({revisoes}) {
  const facs = useMemo(() => {
    const m = {};
    revisoes.forEach(r => {
      const f = r.faccao||'Sem facção';
      if(!m[f]) m[f]={nome:f,revisoes:[],defeitos:{}};
      m[f].revisoes.push(r);
      (r.defeitos_json||[]).forEach(d=>{m[f].defeitos[d.tipo]=(m[f].defeitos[d.tipo]||0)+(+d.quantidade||1);});
    });
    return Object.values(m).sort((a,b)=>b.revisoes.length-a.revisoes.length);
  },[revisoes]);
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
      {facs.length===0&&<p style={{textAlign:'center',color:'#9ca3af',padding:'2rem',gridColumn:'span 3'}}>Sem dados por facção.</p>}
      {facs.map(f => {
        const rec=somarMetrica(f.revisoes,'recebidas'); const apr=somarMetrica(f.revisoes,'aprovadas');
        const ret=somarMetrica(f.revisoes,'retrabalho'); const ref=somarMetrica(f.revisoes,'refugo');
        const tx=rec>0?((apr/rec)*100):0;
        const txColor=tx>=90?'#16a34a':tx>=70?'#f59e0b':'#dc2626';
        const topDef=Object.entries(f.defeitos).sort((a,b)=>b[1]-a[1]).slice(0,3);
        return (
          <div key={f.nome} style={{background:'#fff',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',border:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
              <div>
                <p style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>{f.nome}</p>
                <p style={{margin:0,fontSize:'.75rem',color:'#6b7280'}}>{f.revisoes.length} revisões · {rec} peças</p>
              </div>
              <div style={{padding:'6px 12px',borderRadius:8,background:txColor+'15',border:`1px solid ${txColor}30`}}>
                <p style={{margin:0,fontSize:'1.1rem',fontWeight:800,color:txColor}}>{tx.toFixed(1)}%</p>
                <p style={{margin:0,fontSize:'.65rem',color:'#6b7280',textAlign:'center'}}>aprovação</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
              {[['Apr',apr,'#16a34a'],['Ret',ret,'#f59e0b'],['Ref',ref,'#dc2626']].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center',padding:'6px',background:'#f8fafc',borderRadius:7}}>
                  <p style={{margin:0,fontSize:'1rem',fontWeight:800,color:c}}>{v}</p>
                  <p style={{margin:0,fontSize:'.68rem',color:'#9ca3af'}}>{l}</p>
                </div>
              ))}
            </div>
            <div style={{height:6,background:'#f1f5f9',borderRadius:999,overflow:'hidden',marginBottom:topDef.length?10:0}}>
              <div style={{height:'100%',width:`${Math.min(tx,100)}%`,background:txColor,borderRadius:999}}/>
            </div>
            {topDef.length>0&&(
              <div style={{borderTop:'1px solid #f1f5f9',paddingTop:10}}>
                <p style={{margin:'0 0 6px',fontSize:'.7rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase'}}>Top Defeitos</p>
                {topDef.map(([tipo,qtd])=>(
                  <div key={tipo} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'.78rem'}}>
                    <span style={{color:'#374151'}}>{tipo}</span>
                    <span style={{fontWeight:700,color:'#dc2626'}}>{qtd}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Defeitos ──────────────────────────────────────────────────────────────────
function TabDefeitos({revisoes}) {
  const defeitos = useMemo(() => {
    const list = [];
    revisoes.forEach(r=>(r.defeitos_json||[]).forEach(d=>list.push({...d,op_numero:r.op_numero,faccao:r.faccao,data:r.data})));
    return list;
  },[revisoes]);
  const porTipo = useMemo(() => {
    const m={};
    defeitos.forEach(d=>{m[d.tipo]=(m[d.tipo]||0)+(+d.quantidade||1);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[defeitos]);
  const maxDef = porTipo[0]?.[1]||1;
  const TD = {padding:'9px 14px',fontSize:'.83rem',color:'#374151',verticalAlign:'middle'};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Gráfico por tipo */}
      {porTipo.length>0&&(
        <div style={{background:'#fff',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
          <h4 style={{margin:'0 0 14px',fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Defeitos por tipo</h4>
          {porTipo.map(([tipo,qtd]) => (
            <div key={tipo} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:'.8rem',color:'#374151'}}>{tipo}</span>
                <span style={{fontSize:'.8rem',fontWeight:700,color:'#dc2626'}}>{qtd}×</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:999,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(qtd/maxDef)*100}%`,background:'linear-gradient(90deg,#dc2626,#ef4444)',borderRadius:999}}/>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Tabela completa */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9'}}>
          <span style={{fontSize:'.88rem',fontWeight:700,color:'#111827'}}>Todos os defeitos registrados <span style={{fontWeight:400,fontSize:'.75rem',color:'#6b7280'}}>({defeitos.length})</span></span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              {['Tipo','Quantidade','Cor','Tamanho','OP','Facção','Data'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'.72rem',fontWeight:700,color:'#374151',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {defeitos.length===0&&<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>Nenhum defeito registrado.</td></tr>}
              {defeitos.map((d,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{...TD,fontWeight:600,color:'#dc2626'}}>{d.tipo||'—'}</td>
                  <td style={{...TD,textAlign:'center',fontWeight:700}}>{d.quantidade||1}</td>
                  <td style={TD}>{d.cor||'—'}</td>
                  <td style={TD}>{d.tamanho?<span style={{padding:'2px 8px',borderRadius:999,background:'#ede9fe',color:'#7c3aed',fontSize:'.75rem',fontWeight:700}}>{d.tamanho}</span>:'—'}</td>
                  <td style={{...TD,fontWeight:600}}>{d.op_numero||'—'}</td>
                  <td style={TD}>{d.faccao||'—'}</td>
                  <td style={TD}>{d.data?new Date(d.data).toLocaleDateString('pt-BR'):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Modal nova revisão ────────────────────────────────────────────────────────
function ModalRevisao({onClose,onSalvo,ordens}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState(FORM0);
  const [salvando,setSalvando]=useState(false);

  const addCor=()=>setForm(f=>({...f,cores_json:[...f.cores_json,{cor:'',tamanhos:Object.fromEntries(TAMANHOS.map(t=>[t,{recebidas:'',aprovadas:'',retrabalho:'',refugo:''}]))}]}));
  const delCor=i=>setForm(f=>({...f,cores_json:f.cores_json.filter((_,j)=>j!==i)}));
  const updCor=(i,k,v)=>setForm(f=>{const c=[...f.cores_json];c[i]={...c[i],[k]:v};return{...f,cores_json:c};});
  const updGrade=(i,tam,met,v)=>setForm(f=>{
    const c=[...f.cores_json]; const ts={...(c[i].tamanhos||{})};
    ts[tam]={...ts[tam],[met]:v}; c[i]={...c[i],tamanhos:ts}; return{...f,cores_json:c};
  });
  const addDef=()=>setForm(f=>({...f,defeitos_json:[...f.defeitos_json,{tipo:'',quantidade:1,cor:'',tamanho:''}]}));
  const delDef=i=>setForm(f=>({...f,defeitos_json:f.defeitos_json.filter((_,j)=>j!==i)}));
  const updDef=(i,k,v)=>setForm(f=>{const d=[...f.defeitos_json];d[i]={...d[i],[k]:v};return{...f,defeitos_json:d};});

  const salvar=async()=>{
    if(!form.op_id){alert('Selecione uma OP');return;}
    setSalvando(true);
    try{await api.post('/qualidade',form);onSalvo();}
    catch(e){alert(e.response?.data?.error||'Erro ao salvar');}
    finally{setSalvando(false);}
  };
  const STEPS=['Dados','Grade por cor','Defeitos'];

  return (
    <Overlay onClose={onClose}>
      <div style={{padding:'16px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#111827'}}>Nova Revisão de Qualidade</h3>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#9ca3af'}}>×</button>
      </div>
      {/* Stepper */}
      <div style={{padding:'12px 22px',borderBottom:'1px solid #f1f5f9',flexShrink:0,display:'flex',alignItems:'center',gap:0}}>
        {STEPS.map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:i<step?'#16a34a':i===step?'#16a34a':'#e5e7eb',fontSize:'.72rem',fontWeight:700,color:i<=step?'#fff':'#9ca3af'}}>{i<step?'✓':i+1}</div>
              <span style={{fontSize:'.78rem',fontWeight:i===step?700:400,color:i===step?'#16a34a':i<step?'#374151':'#9ca3af'}}>{s}</span>
            </div>
            {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step?'#16a34a':'#e5e7eb',margin:'0 12px'}}/>}
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
        {step===0&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Sel label="Ordem de Produção *" value={form.op_id} onChange={e=>setForm(f=>({...f,op_id:e.target.value}))}>
              <option value="">Selecionar OP...</option>{ordens.map(o=><option key={o.id} value={o.id}>OP {o.numero} – {o.cliente_nome||'Sem cliente'}</option>)}
            </Sel>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Inp label="Facção" placeholder="Nome da facção/costureira" value={form.faccao} onChange={e=>setForm(f=>({...f,faccao:e.target.value}))}/>
              <Inp label="Revisora" value={form.revisora} onChange={e=>setForm(f=>({...f,revisora:e.target.value}))}/>
            </div>
            <Inp label="Data da revisão" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
          </div>
        )}
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {form.cores_json.map((cor,i) => (
              <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#f8fafc',padding:'8px 12px',borderBottom:'1px solid #e5e7eb',display:'flex',gap:10,alignItems:'center'}}>
                  <input placeholder="Nome da cor *" value={cor.cor} onChange={e=>updCor(i,'cor',e.target.value)}
                    style={{flex:1,padding:'5px 9px',borderRadius:6,border:'1px solid #d1d5db',fontSize:'.83rem'}}/>
                  <button onClick={()=>delCor(i)} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontSize:'.75rem'}}>Remover</button>
                </div>
                <div style={{padding:'12px',overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
                    <thead><tr style={{background:'#f8fafc'}}>
                      <th style={{padding:'5px 10px',textAlign:'left'}}>Tamanho</th>
                      {METRICAS.map(m=><th key={m} style={{padding:'5px 8px',textAlign:'center',textTransform:'capitalize'}}>{m}</th>)}
                    </tr></thead>
                    <tbody>{TAMANHOS.map(tam => (
                      <tr key={tam} style={{borderTop:'1px solid #f1f5f9'}}>
                        <td style={{padding:'4px 10px',fontWeight:700,color:'#7c3aed'}}>{tam}</td>
                        {METRICAS.map(met => (
                          <td key={met} style={{padding:'3px 5px'}}>
                            <input type="number" min="0" value={(cor.tamanhos[tam]||{})[met]||''}
                              onChange={e=>updGrade(i,tam,met,e.target.value)}
                              style={{width:56,textAlign:'center',padding:'4px',borderRadius:5,border:'1px solid #d1d5db',fontSize:'.78rem'}}/>
                          </td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            ))}
            <button onClick={addCor} style={{padding:'10px',border:'2px dashed #d1d5db',borderRadius:8,background:'#f9fafb',color:'#6b7280',fontSize:'.85rem',cursor:'pointer'}}>+ Adicionar cor</button>
          </div>
        )}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {form.defeitos_json.map((d,i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
                <Sel label={i===0?'Tipo de defeito':''} value={d.tipo} onChange={e=>updDef(i,'tipo',e.target.value)}>
                  <option value="">Tipo...</option>{TIPO_DEF.map(t=><option key={t} value={t}>{t}</option>)}
                </Sel>
                <Inp label={i===0?'Qtd':''}  type="number" min="1" value={d.quantidade} onChange={e=>updDef(i,'quantidade',e.target.value)}/>
                <Inp label={i===0?'Cor':''}   placeholder="Cor" value={d.cor}      onChange={e=>updDef(i,'cor',e.target.value)}/>
                <Sel label={i===0?'Tam':''} value={d.tamanho} onChange={e=>updDef(i,'tamanho',e.target.value)}>
                  <option value="">—</option>{TAMANHOS.map(t=><option key={t} value={t}>{t}</option>)}
                </Sel>
                <button onClick={()=>delDef(i)} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:7,padding:'7px 10px',cursor:'pointer',height:36}}>×</button>
              </div>
            ))}
            <button onClick={addDef} style={{padding:'10px',border:'2px dashed #d1d5db',borderRadius:8,background:'#f9fafb',color:'#6b7280',fontSize:'.85rem',cursor:'pointer'}}>+ Registrar defeito</button>
          </div>
        )}
      </div>
      <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',flexShrink:0,display:'flex',justifyContent:'space-between'}}>
        <div>{step>0&&<button onClick={()=>setStep(s=>s-1)} style={{padding:'7px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'#fff',color:'#374151',fontSize:'.85rem',cursor:'pointer'}}>← Anterior</button>}</div>
        <div style={{display:'flex',gap:10}}>
          {step<2?<button onClick={()=>setStep(s=>s+1)} style={{padding:'7px 18px',borderRadius:8,background:'#16a34a',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:'pointer'}}>Próximo →</button>
           :<button onClick={salvar} disabled={salvando} style={{padding:'7px 22px',borderRadius:8,background:salvando?'#9ca3af':'linear-gradient(135deg,#16a34a,#15803d)',color:'#fff',border:'none',fontSize:'.85rem',fontWeight:600,cursor:salvando?'not-allowed':'pointer',boxShadow:salvando?'none':'0 2px 8px rgba(22,163,74,.3)'}}>
             {salvando?'Salvando...':'Salvar revisão'}
           </button>}
        </div>
      </div>
    </Overlay>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Qualidade() {
  const {setAction,clearAction}=useTopbar();
  const [aba,setAba]=useState(0);
  const [modalNova,setModalNova]=useState(false);

  const {data:revisoes=[],isLoading,refetch}=useApiQuery(['qualidade'],()=>api.get('/qualidade'));
  const {data:ordens=[]}=useApiQuery(['ordens'],()=>api.get('/ordens'));

  useEffect(()=>{
    setAction({label:'Nova Revisão',onClick:()=>setModalNova(true)});
    return()=>clearAction();
  },[]);

  const ABAS=['📊 Painel','📋 Por OP','🔄 Retrabalho','🏭 Por Facção','⚠️ Defeitos'];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.07)',overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',padding:'0 8px'}}>
          {ABAS.map((a,i)=>(
            <button key={i} onClick={()=>setAba(i)} style={{padding:'13px 16px',border:'none',background:'none',fontSize:'.83rem',fontWeight:aba===i?700:400,color:aba===i?'#16a34a':'#6b7280',borderBottom:`3px solid ${aba===i?'#16a34a':'transparent'}`,cursor:'pointer',whiteSpace:'nowrap',marginBottom:-1}}>
              {a}
            </button>
          ))}
        </div>
        <div style={{padding:'18px'}}>
          {isLoading?<div style={{textAlign:'center',padding:'3rem',color:'#9ca3af'}}>Carregando...</div>:(
            <>
              {aba===0&&<TabPainel revisoes={revisoes}/>}
              {aba===1&&<TabPorOP revisoes={revisoes}/>}
              {aba===2&&<TabRetrabalho revisoes={revisoes} onRefetch={refetch}/>}
              {aba===3&&<TabFaccao revisoes={revisoes}/>}
              {aba===4&&<TabDefeitos revisoes={revisoes}/>}
            </>
          )}
        </div>
      </div>
      {modalNova&&<ModalRevisao onClose={()=>setModalNova(false)} onSalvo={()=>{refetch();setModalNova(false);}} ordens={ordens}/>}
    </div>
  );
}
