import { useState, useEffect } from 'react';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import api from '../services/api';

const QR = ({ data, size=80 }) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`}
    width={size} height={size} alt="QR" style={{ borderRadius:4, border:'1px solid #e5e7eb', display:'block' }} />
);

const SETORES = ['Corte','Costura','Qualidade','Almoxarifado','Expedição'];

export default function Transporte() {
  const { setAction, clearAction } = useTopbar();
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroSetor, setFiltroSetor]     = useState('');
  const [abaQR, setAbaQR]               = useState(false);

  const { data: coletas=[], isLoading } = useApiQuery(['coletas-transp'], () => api.get('/coletas'));
  const { data: usuarios=[] }           = useApiQuery(['usuarios-transp'], () => api.get('/usuarios'));

  const transportadores = usuarios.filter(u => u.perfil==='Transportador' || u.perfil==='Gerente');

  useEffect(() => {
    setAction({ label:'Nova Coleta', onClick:() => {} });
    return () => clearAction();
  }, []);

  const hoje = coletas.filter(c => new Date(c.created_at).toDateString()===new Date().toDateString());
  const pendentes  = coletas.filter(c => c.status==='pendente' || !c.status);
  const concluidas = coletas.filter(c => c.status==='concluído');

  const coletasFiltradas = coletas.filter(c => {
    const matchU = !filtroUsuario || c.transportador_id===Number(filtroUsuario) || c.transportador_nome===filtroUsuario;
    const matchS = !filtroSetor  || c.setor===filtroSetor;
    return matchU && matchS;
  });

  const tasksPorTransportador = (uid) => hoje.filter(c => c.transportador_id===uid || c.usuario_id===uid);

  const statusStyle = (s) => ({
    'concluído': { bg:'#f0fdf4', text:'#16a34a' },
    'pendente':  { bg:'#fef3c7', text:'#d97706' },
    'em rota':   { bg:'#dbeafe', text:'#2563eb' },
  }[s] || { bg:'#f3f4f6', text:'#374151' });

  const TD = { padding:'10px 14px', fontSize:'.85rem', color:'#374151', verticalAlign:'middle' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Coletas hoje',       val:hoje.length, cor:'#0891b2', icon:'🚚' },
          { label:'Pendentes',          val:pendentes.length, cor:'#d97706', icon:'⏳' },
          { label:'Concluídas',         val:concluidas.length, cor:'#16a34a', icon:'✓' },
          { label:'Transportadores',    val:transportadores.length, cor:'#7c3aed', icon:'👤' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'1.2rem' }}>{k.icon}</span>
              <span style={{ fontSize:'1.6rem', fontWeight:800, color:k.cor }}>{k.val}</span>
            </div>
            <p style={{ margin:0, fontSize:'.72rem', color:'#6b7280' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Transportadores — status + tarefas do dia */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.07)', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'#111827' }}>Transportadores
            <span style={{ marginLeft:8, fontSize:'.75rem', fontWeight:400, color:'#6b7280' }}>tarefas do dia</span>
          </span>
        </div>
        {transportadores.length===0 ? (
          <p style={{ padding:'2rem', textAlign:'center', color:'#9ca3af', fontSize:'.85rem', margin:0 }}>Nenhum transportador cadastrado.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, padding:'16px' }}>
            {transportadores.map(t => {
              const tasks = tasksPorTransportador(t.id);
              const online = tasks.some(c => c.status==='em rota');
              return (
                <div key={t.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'12px 14px', background: online ? '#f0fdf4' : '#f9fafb', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #e5e7eb' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#0891b2,#0e7490)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'.8rem', fontWeight:700, flexShrink:0 }}>
                      {(t.nome||'?').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:'.82rem', fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.nome}</p>
                      <p style={{ margin:0, fontSize:'.68rem', color:'#6b7280' }}>{t.perfil}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: online?'#16a34a':'#9ca3af' }} />
                      <span style={{ fontSize:'.68rem', color: online?'#16a34a':'#9ca3af', fontWeight:600 }}>{online?'Em rota':'Offline'}</span>
                    </div>
                  </div>
                  <div style={{ padding:'10px 14px' }}>
                    {tasks.length===0
                      ? <p style={{ margin:0, fontSize:'.75rem', color:'#9ca3af', textAlign:'center', padding:'8px 0' }}>Sem tarefas hoje</p>
                      : tasks.slice(0,3).map((c,i) => {
                        const st = statusStyle(c.status);
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:i<tasks.length-1?'1px solid #f1f5f9':'none' }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:st.text, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ margin:0, fontSize:'.72rem', fontWeight:600, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.fornecedor_nome||c.origem||`Tarefa #${i+1}`}</p>
                              <p style={{ margin:0, fontSize:'.62rem', color:'#9ca3af' }}>{c.tipo||'Coleta'} · {c.setor||'—'}</p>
                            </div>
                            <span style={{ padding:'2px 6px', borderRadius:999, fontSize:'.62rem', fontWeight:600, background:st.bg, color:st.text, flexShrink:0 }}>{c.status||'pendente'}</span>
                          </div>
                        );
                      })}
                    {tasks.length>3 && <p style={{ margin:'6px 0 0', fontSize:'.68rem', color:'#9ca3af', textAlign:'center' }}>+{tasks.length-3} mais</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico + filtros */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.07)', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'#111827', flex:1 }}>Histórico de Coletas
            <span style={{ marginLeft:8, fontSize:'.75rem', fontWeight:400, color:'#6b7280' }}>{coletasFiltradas.length} registros</span>
          </span>
          <select value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.8rem', color:'#374151', outline:'none', background:'#fff' }}>
            <option value="">Todos os transportadores</option>
            {transportadores.map(t=><option key={t.id} value={t.nome}>{t.nome}</option>)}
          </select>
          <select value={filtroSetor} onChange={e=>setFiltroSetor(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.8rem', color:'#374151', outline:'none', background:'#fff' }}>
            <option value="">Todos os setores</option>
            {SETORES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={()=>setAbaQR(v=>!v)}
            style={{ padding:'7px 14px', borderRadius:7, background:abaQR?'#030f06':'#f3f4f6', color:abaQR?'#22c55e':'#374151', border:abaQR?'1px solid rgba(34,197,94,.3)':'1px solid #e5e7eb', fontSize:'.8rem', fontWeight:600, cursor:'pointer' }}>
            {abaQR?'✕ Fechar QR':'📱 QR Codes'}
          </button>
        </div>

        {/* QR codes pendentes */}
        {abaQR && (
          <div style={{ padding:'16px 18px', borderBottom:'1px solid #f1f5f9', background:'#fafafa' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:'.82rem', fontWeight:700, color:'#374151' }}>🖨 QR Codes — Lotes pendentes</span>
              <button onClick={()=>window.print()} style={{ padding:'5px 12px', borderRadius:6, background:'#16a34a', color:'#fff', border:'none', fontSize:'.75rem', fontWeight:600, cursor:'pointer' }}>Imprimir</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
              {pendentes.slice(0,12).map((c,i) => {
                const qr = `COLETA:${c.id||i}|ORI:${c.origem||'?'}|DST:${c.destino||'?'}|TP:${c.transportador_nome||'?'}`;
                return (
                  <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'10px', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:130 }}>
                    <QR data={qr} size={80} />
                    <div style={{ textAlign:'center' }}>
                      <p style={{ margin:0, fontSize:'.65rem', fontWeight:700, color:'#374151' }}>{c.fornecedor_nome||c.origem||`Lote #${i+1}`}</p>
                      <p style={{ margin:0, fontSize:'.6rem', color:'#9ca3af' }}>{c.tipo||'Coleta'}</p>
                    </div>
                  </div>
                );
              })}
              {pendentes.length===0 && <p style={{ color:'#9ca3af', fontSize:'.82rem', padding:'1rem 0' }}>Nenhum lote pendente.</p>}
            </div>
          </div>
        )}

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
              {['Tipo','Origem','Destino','Transportador','Setor','Status','Data'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'.72rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>Carregando...</td></tr>
                : coletasFiltradas.length===0
                ? <tr><td colSpan={7} style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Nenhuma coleta encontrada.</td></tr>
                : coletasFiltradas.map((c,i) => {
                  const st=statusStyle(c.status||'pendente');
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:'#cffafe', color:'#0891b2' }}>{c.tipo||'Coleta'}</span></td>
                      <td style={{ ...TD, color:'#374151' }}>{c.fornecedor_nome||c.origem||'—'}</td>
                      <td style={{ ...TD, color:'#374151' }}>{c.destino||'—'}</td>
                      <td style={{ ...TD, fontWeight:600, color:'#111827' }}>{c.transportador_nome||'—'}</td>
                      <td style={TD}>{c.setor||'—'}</td>
                      <td style={TD}><span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:st.bg, color:st.text }}>{c.status||'pendente'}</span></td>
                      <td style={{ ...TD, fontSize:'.78rem', color:'#9ca3af' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
