import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTopbar } from '../context/TopbarContext';
import { useApiQuery } from '../hooks/useApi';
import { useOverlayClose } from '../hooks/useOverlayClose';
import api from '../services/api';

const ORDEM_TAMANHOS = ['PP','EXG','P','M','G','GG','XGG','G1','G2','G3','G4','G5','02','04','06','08','10','12','14','16'];
const CATS_MATERIAL  = ['Embalagem','Aviamento','Etiqueta'];
const thS = { padding:'7px 10px', fontWeight:700, color:'#374151', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'.72rem', textTransform:'uppercase' };

// ─── helpers ──────────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }) {
  const op = useOverlayClose(onClose);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} {...op}>
      {children}
    </div>
  );
}

function getCoresFromRefs(refs) {
  const seen = new Set(); const out = [];
  for (const ref of refs)
    for (const cor of (ref.cores || []))
      if (!seen.has(cor)) { seen.add(cor); out.push(cor); }
  return out;
}

function deriveTamanhos(refs) {
  const keys = new Set(refs.flatMap(r => Object.values(r.grade_json || {}).flatMap(Object.keys)));
  return ORDEM_TAMANHOS.filter(t => keys.has(t));
}

// ─── Conferência de peças ─────────────────────────────────────────────────────

function ConferenciaGrid({ cores, tamanhos, conferencia, onChangeAprov, loading }) {
  if (loading) return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>Carregando grade...</p>;
  if (!cores.length) return <p style={{ color:'#9ca3af', fontSize:'.82rem' }}>Selecione uma OP no passo anterior.</p>;

  return (
    <div style={{ overflowX:'auto' }}>
      <p style={{ margin:'0 0 8px', fontSize:'.75rem', color:'#6b7280' }}>
        Confira as quantidades recebidas e ajuste as aprovadas para acabamento. A diferença vai para qualidade.
      </p>
      <table style={{ borderCollapse:'collapse', fontSize:'.82rem', width:'100%' }}>
        <thead>
          <tr style={{ background:'#f8fafc' }}>
            <th style={{ ...thS, textAlign:'left', minWidth:80 }}>Cor</th>
            {tamanhos.map(t => <th key={t} style={{ ...thS, minWidth:64 }}>{t}</th>)}
            <th style={{ ...thS, background:'#dbeafe', color:'#1d4ed8' }}>Recebidas</th>
            <th style={{ ...thS, background:'#dcfce7', color:'#15803d' }}>Aprovadas</th>
            <th style={{ ...thS, background:'#fef2f2', color:'#dc2626' }}>Problema</th>
          </tr>
        </thead>
        <tbody>
          {cores.map(cor => {
            const totalRec  = tamanhos.reduce((s, t) => s + (conferencia[cor]?.[t]?.recebidas || 0), 0);
            const totalAprov= tamanhos.reduce((s, t) => s + (Number(conferencia[cor]?.[t]?.aprovadas) || 0), 0);
            const problema  = Math.max(0, totalRec - totalAprov);
            return (
              <tr key={cor} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', fontWeight:600, color:'#111827', whiteSpace:'nowrap' }}>{cor}</td>
                {tamanhos.map(t => {
                  const rec   = conferencia[cor]?.[t]?.recebidas || 0;
                  const aprov = conferencia[cor]?.[t]?.aprovadas;
                  return (
                    <td key={t} style={{ border:'1px solid #e5e7eb', padding:'3px 4px', textAlign:'center' }}>
                      {rec > 0 ? (
                        <div>
                          <input type="number" min="0" max={rec}
                            value={aprov !== undefined ? aprov : rec}
                            onChange={e => onChangeAprov(cor, t, e.target.value)}
                            style={{ width:46, textAlign:'center', padding:'3px', borderRadius:5, border:'1px solid #d1d5db', fontSize:'.82rem', outline:'none' }} />
                          <div style={{ fontSize:'.6rem', color:'#9ca3af', lineHeight:1, marginTop:2 }}>rec:{rec}</div>
                        </div>
                      ) : <span style={{ color:'#e5e7eb', fontSize:'.72rem' }}>—</span>}
                    </td>
                  );
                })}
                <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:600, color:'#1d4ed8', background:'#eff6ff' }}>{totalRec}</td>
                <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:'#15803d', background:'#f0fdf4' }}>{totalAprov}</td>
                <td style={{ padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center', fontWeight:700, color:problema>0?'#dc2626':'#9ca3af', background:problema>0?'#fef2f2':'transparent' }}>
                  {problema > 0 ? `${problema} ⚠` : '0'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Consumo de materiais ─────────────────────────────────────────────────────

function ConsumoMateriais({ materiais, consumo, onToggle, onQty }) {
  const filtered = materiais.filter(m => CATS_MATERIAL.includes(m.categoria));
  if (!filtered.length) {
    return (
      <div style={{ padding:'16px', borderRadius:8, background:'#f8fafc', border:'1px solid #e5e7eb', fontSize:'.82rem', color:'#6b7280', textAlign:'center' }}>
        Nenhum material de Embalagem/Aviamento/Etiqueta cadastrado no estoque.
        <br /><span style={{ fontSize:'.72rem' }}>Acesse Estoque para cadastrar os materiais de acabamento.</span>
      </div>
    );
  }
  const byCat = filtered.reduce((acc, m) => {
    const cat = m.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {Object.entries(byCat).map(([cat, mats]) => (
        <div key={cat}>
          <p style={{ margin:'0 0 6px', fontSize:'.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px' }}>{cat}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {mats.map(m => {
              const sel  = consumo[m.id] !== undefined;
              const qty  = consumo[m.id]?.quantidade ?? '';
              const abaixo = m.quantidade_atual <= m.quantidade_minima;
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:`1px solid ${sel?'#86efac':'#e5e7eb'}`, background:sel?'#f0fdf4':'#f9fafb' }}>
                  <input type="checkbox" checked={sel} onChange={() => onToggle(m.id, m)}
                    style={{ width:16, height:16, cursor:'pointer', accentColor:'#16a34a' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:'.82rem', fontWeight:600, color:'#111827' }}>{m.nome}</span>
                    <span style={{ marginLeft:8, fontSize:'.68rem', padding:'1px 6px', borderRadius:999, background:'#f3f4f6', color:'#6b7280' }}>{m.unidade}</span>
                    {abaixo && <span style={{ marginLeft:6, fontSize:'.65rem', color:'#dc2626', fontWeight:700 }}>⚠ Estoque baixo</span>}
                  </div>
                  <span style={{ fontSize:'.72rem', color:abaixo?'#dc2626':'#9ca3af', whiteSpace:'nowrap' }}>
                    Estq.: {Number(m.quantidade_atual).toLocaleString('pt-BR')} {m.unidade}
                  </span>
                  {sel && (
                    <input type="number" min="0" value={qty} onChange={e => onQty(m.id, e.target.value)}
                      placeholder="Qtd."
                      style={{ width:72, padding:'4px 8px', borderRadius:6, border:'1px solid #86efac', fontSize:'.82rem', outline:'none', textAlign:'center' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card de OP ───────────────────────────────────────────────────────────────

function OpCard({ op, faccao, onIniciar }) {
  const prio = op.prioridade?.toLowerCase();
  const prioColor = { urgente:'#dc2626', alta:'#d97706', normal:'#6b7280', baixa:'#9ca3af' }[prio] || '#6b7280';
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.07)', border:'1px solid #f1f5f9', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
            <span style={{ fontFamily:'monospace', fontSize:'.88rem', fontWeight:700, color:'#111827' }}>{op.numero}</span>
            {prio && prio !== 'normal' && (
              <span style={{ padding:'1px 7px', borderRadius:999, fontSize:'.65rem', fontWeight:700, background:`${prioColor}18`, color:prioColor, textTransform:'uppercase' }}>{op.prioridade}</span>
            )}
          </div>
          <p style={{ margin:0, fontSize:'.8rem', color:'#374151' }}>{op.cliente_nome || '—'}</p>
        </div>
        <span style={{ padding:'3px 9px', borderRadius:999, fontSize:'.72rem', fontWeight:600, background:'#fef3c7', color:'#d97706', whiteSpace:'nowrap', flexShrink:0 }}>
          Aguardando
        </span>
      </div>
      <div style={{ display:'flex', gap:16, fontSize:'.75rem', color:'#6b7280' }}>
        <span>📅 {op.data_entrega ? new Date(op.data_entrega+'T12:00').toLocaleDateString('pt-BR') : '—'}</span>
        {faccao && <span>🏭 {faccao}</span>}
      </div>
      <button
        onClick={() => onIniciar(op)}
        style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', fontSize:'.82rem', fontWeight:600, cursor:'pointer', alignSelf:'flex-end' }}>
        Iniciar Acabamento →
      </button>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

const FORM0 = { op:null, responsavel:'', conferencia:{}, consumo:{} };

export default function Acabamento() {
  const queryClient = useQueryClient();
  const { setAction, clearAction } = useTopbar();

  const [modal, setModal]   = useState(null);
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState(FORM0);
  const [saving, setSaving] = useState(false);
  const [stats, setStats]   = useState({ concluidas:0, aprovadas:0, problema:0, embalagens:0 });
  const gradeSourceRef      = useRef(null);

  const { data: ordens    = [] } = useApiQuery(['ordens-acabamento'],    () => api.get('/ordens'));
  const { data: coletas   = [] } = useApiQuery(['coletas-acab'],         () => api.get('/coletas?tipo=envio_faccao'));
  const { data: materiais = [] } = useApiQuery(['estoque-acab'],         () => api.get('/estoque'));
  const { data: opRefs = [], isFetching: loadingRefs } = useApiQuery(
    ['op-refs-acabamento', form.op?.id],
    () => api.get(`/ordens/${form.op.id}/referencias`),
    { enabled: !!form.op?.id, staleTime: 60000 }
  );

  const opsAcabamento  = ordens.filter(o => o.fase_atual === 'Acabamento');
  const opsDisponiveis = ordens.filter(o => o.fase_atual === 'Acabamento'); // para o select do passo 1

  // Mapa op_id -> nome da facção (do último envio)
  const faccaoMap = {};
  for (const c of coletas) {
    if (!faccaoMap[c.op_id] || new Date(c.data) > new Date(faccaoMap[c.op_id].data))
      faccaoMap[c.op_id] = c;
  }

  const opCores = getCoresFromRefs(opRefs);
  const opTams  = deriveTamanhos(opRefs);

  // Inicializa conferência quando refs carregam para a OP selecionada
  useEffect(() => {
    if (opRefs.length > 0 && form.op?.id && form.op.id !== gradeSourceRef.current) {
      gradeSourceRef.current = form.op.id;
      const conf = {};
      for (const ref of opRefs) {
        for (const [cor, tams] of Object.entries(ref.grade_json || {})) {
          if (!conf[cor]) conf[cor] = {};
          for (const [tam, qty] of Object.entries(tams)) {
            const n = Number(qty) || 0;
            if (n > 0) conf[cor][tam] = { recebidas: n, aprovadas: n };
          }
        }
      }
      setForm(f => ({ ...f, conferencia: conf }));
    }
  }, [opRefs, form.op?.id]);

  useEffect(() => {
    setAction({ label:'Novo Lançamento', onClick:() => abrirModal(null) });
    return () => clearAction();
  }, []);

  const abrirModal = (op) => {
    gradeSourceRef.current = null;
    setForm({ ...FORM0, op });
    setStep(0);
    setModal('lancamento');
  };

  // Totais da conferência atual
  const totalRec   = Object.values(form.conferencia).reduce((s, tams) => s + Object.values(tams).reduce((a, b) => a + (b.recebidas || 0), 0), 0);
  const totalAprov = Object.values(form.conferencia).reduce((s, tams) => s + Object.values(tams).reduce((a, b) => a + (Number(b.aprovadas) ?? b.recebidas ?? 0), 0), 0);
  const totalProb  = Math.max(0, totalRec - totalAprov);

  const setAprovada = (cor, tam, val) => setForm(f => ({
    ...f,
    conferencia: {
      ...f.conferencia,
      [cor]: { ...f.conferencia[cor], [tam]: { ...f.conferencia[cor]?.[tam], aprovadas: val === '' ? '' : Number(val) } },
    },
  }));

  const toggleMaterial = (matId, material) => setForm(f => {
    const c = { ...f.consumo };
    if (c[matId] !== undefined) delete c[matId];
    else c[matId] = { material, quantidade: '' };
    return { ...f, consumo: c };
  });

  const setQtyMaterial = (matId, qty) => setForm(f => ({
    ...f,
    consumo: { ...f.consumo, [matId]: { ...f.consumo[matId], quantidade: qty } },
  }));

  const confirmarAcabamento = async () => {
    if (!form.op) { alert('Selecione uma OP.'); return; }
    setSaving(true);
    try {
      // Baixa de materiais no estoque
      let totalEmbalagens = 0;
      for (const [matId, { quantidade }] of Object.entries(form.consumo)) {
        const qty = Number(quantidade);
        if (!qty || qty <= 0) continue;
        await api.post('/estoque/movimentacoes', {
          material_id: Number(matId),
          tipo: 'saida',
          quantidade: qty,
          op_id: form.op.id,
          observacao: `Acabamento OP ${form.op.numero}`,
        });
        totalEmbalagens += qty;
      }

      // Avança OP para Revisão (Qualidade)
      await api.post(`/ordens/${form.op.id}/avancar-fase`);

      queryClient.invalidateQueries({ queryKey: ['ordens-acabamento'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-acab'] });

      setStats(s => ({
        concluidas: s.concluidas + 1,
        aprovadas: s.aprovadas + totalAprov,
        problema: s.problema + totalProb,
        embalagens: s.embalagens + totalEmbalagens,
      }));
      setModal(null);
    } catch (err) {
      alert(err?.response?.data?.error || 'Erro ao concluir acabamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const TD = { padding:'10px 14px', fontSize:'.85rem', color:'#374151', verticalAlign:'middle' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'OPs em acabamento', val: opsAcabamento.length, cor:'#d97706', icon:'⚙' },
          { label:'Concluídas (sessão)', val: stats.concluidas, cor:'#16a34a', icon:'✓' },
          { label:'Peças aprovadas', val: stats.aprovadas, cor:'#2563eb', icon:'👕' },
          { label:'Peças com problema', val: stats.problema, cor:'#dc2626', icon:'⚠' },
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

      {/* Painel de OPs */}
      {opsAcabamento.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:12, padding:'3rem', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.07)', color:'#9ca3af' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>⚙</div>
          <p style={{ margin:0, fontWeight:600, color:'#374151' }}>Nenhuma OP em acabamento</p>
          <p style={{ margin:'4px 0 0', fontSize:'.82rem' }}>As OPs aparecerão aqui após a conclusão da costura.</p>
        </div>
      ) : (
        <div>
          <p style={{ margin:'0 0 10px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>
            Ordens aguardando acabamento <span style={{ marginLeft:6, fontSize:'.75rem', fontWeight:400, color:'#6b7280' }}>{opsAcabamento.length} OP(s)</span>
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
            {opsAcabamento.map(op => (
              <OpCard key={op.id} op={op} faccao={faccaoMap[op.id]?.destino} onIniciar={abrirModal} />
            ))}
          </div>
        </div>
      )}

      {/* Modal lançamento */}
      {modal === 'lancamento' && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:740, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>

            {/* cabeçalho */}
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700 }}>Lançamento de Acabamento</h3>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>

            {/* tabs */}
            <div style={{ display:'flex', padding:'0 22px', borderBottom:'1px solid #f1f5f9' }}>
              {['OP & Responsável','Conferência de Peças','Consumo de Materiais'].map((a, i) => (
                <button key={i} onClick={() => setStep(i)}
                  style={{ padding:'10px 14px', border:'none', background:'none', fontSize:'.82rem', fontWeight:step===i?700:400, color:step===i?'#d97706':'#6b7280', borderBottom:`2px solid ${step===i?'#d97706':'transparent'}`, cursor:'pointer', marginBottom:-1, whiteSpace:'nowrap' }}>
                  {i+1}. {a}
                </button>
              ))}
            </div>

            {/* corpo */}
            <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>

              {/* Passo 1 */}
              {step === 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Ordem de Produção *</label>
                    <select
                      value={form.op?.id || ''}
                      onChange={e => {
                        const op = opsDisponiveis.find(x => String(x.id) === e.target.value) || null;
                        gradeSourceRef.current = null;
                        setForm(f => ({ ...f, op, conferencia: {}, consumo: {} }));
                      }}
                      style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none', background:'#fff' }}>
                      <option value="">Selecione a OP...</option>
                      {opsDisponiveis.map(o => <option key={o.id} value={o.id}>{o.numero} — {o.cliente_nome}</option>)}
                    </select>
                    {opsDisponiveis.length === 0 && (
                      <p style={{ margin:0, fontSize:'.72rem', color:'#9ca3af' }}>Nenhuma OP em fase de Acabamento.</p>
                    )}
                  </div>

                  {form.op && (
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:'.8rem', color:'#374151' }}>
                      <div><span style={{ color:'#6b7280' }}>OP: </span><b>{form.op.numero}</b></div>
                      <div><span style={{ color:'#6b7280' }}>Cliente: </span><b>{form.op.cliente_nome}</b></div>
                      <div><span style={{ color:'#6b7280' }}>Fase: </span>{form.op.fase_atual}</div>
                      <div><span style={{ color:'#6b7280' }}>Facção: </span>{faccaoMap[form.op.id]?.destino || '—'}</div>
                      {form.op.data_entrega && <div><span style={{ color:'#6b7280' }}>Entrega: </span>{new Date(form.op.data_entrega+'T12:00').toLocaleDateString('pt-BR')}</div>}
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:'.78rem', fontWeight:600, color:'#374151' }}>Responsável pelo acabamento</label>
                    <input
                      type="text"
                      value={form.responsavel}
                      onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                      placeholder="Nome do responsável..."
                      style={{ padding:'8px 10px', borderRadius:7, border:'1px solid #d1d5db', fontSize:'.875rem', outline:'none' }}
                    />
                  </div>

                  {loadingRefs && form.op && (
                    <p style={{ margin:0, fontSize:'.78rem', color:'#9ca3af' }}>Carregando grade da OP...</p>
                  )}
                </div>
              )}

              {/* Passo 2 */}
              {step === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {totalRec > 0 && (
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {[
                        { label:'Recebidas', val:totalRec, bg:'#eff6ff', cor:'#1d4ed8' },
                        { label:'Aprovadas', val:totalAprov, bg:'#f0fdf4', cor:'#15803d' },
                        { label:'Problema', val:totalProb, bg:'#fef2f2', cor:'#dc2626' },
                      ].map(k => (
                        <div key={k.label} style={{ padding:'8px 16px', borderRadius:8, background:k.bg, display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:'1.1rem', fontWeight:800, color:k.cor }}>{k.val}</span>
                          <span style={{ fontSize:'.75rem', color:k.cor }}>{k.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <ConferenciaGrid
                    cores={opCores}
                    tamanhos={opTams}
                    conferencia={form.conferencia}
                    onChangeAprov={setAprovada}
                    loading={loadingRefs}
                  />
                </div>
              )}

              {/* Passo 3 */}
              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <p style={{ margin:0, fontSize:'.82rem', color:'#6b7280' }}>
                    Selecione os materiais utilizados e informe as quantidades. O estoque será baixado automaticamente.
                  </p>
                  <ConsumoMateriais
                    materiais={materiais}
                    consumo={form.consumo}
                    onToggle={toggleMaterial}
                    onQty={setQtyMaterial}
                  />

                  {/* Resumo final */}
                  {form.op && (
                    <div style={{ padding:'14px 16px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0', marginTop:4 }}>
                      <p style={{ margin:'0 0 8px', fontSize:'.85rem', fontWeight:700, color:'#111827' }}>Resumo do lançamento</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:'.8rem', color:'#374151' }}>
                        <div><span style={{ color:'#6b7280' }}>OP: </span><b>{form.op.numero}</b></div>
                        <div><span style={{ color:'#6b7280' }}>Cliente: </span>{form.op.cliente_nome}</div>
                        <div><span style={{ color:'#6b7280' }}>Peças recebidas: </span><b>{totalRec}</b></div>
                        <div><span style={{ color:'#6b7280' }}>Peças aprovadas: </span><b style={{ color:'#15803d' }}>{totalAprov}</b></div>
                        {totalProb > 0 && <div style={{ color:'#dc2626' }}><b>⚠ {totalProb} peças com problema</b></div>}
                        {form.responsavel && <div><span style={{ color:'#6b7280' }}>Responsável: </span>{form.responsavel}</div>}
                      </div>
                      <p style={{ margin:'10px 0 0', fontSize:'.78rem', color:'#15803d', fontWeight:600 }}>
                        ✓ A OP será avançada para a fase de Qualidade (Revisão).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* rodapé */}
            <div style={{ padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>{step > 0 && <button onClick={() => setStep(s => s-1)} style={{ padding:'7px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:'.85rem', cursor:'pointer' }}>← Anterior</button>}</div>
              {step < 2
                ? <button onClick={() => setStep(s => s+1)} disabled={step===0 && !form.op}
                    style={{ padding:'7px 22px', borderRadius:8, background:step===0&&!form.op?'#e5e7eb':'#d97706', color:step===0&&!form.op?'#9ca3af':'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:step===0&&!form.op?'not-allowed':'pointer' }}>
                    Próximo →
                  </button>
                : <button onClick={confirmarAcabamento} disabled={saving || !form.op}
                    style={{ padding:'7px 22px', borderRadius:8, background:saving?'#9ca3af':'#16a34a', color:'#fff', border:'none', fontSize:'.85rem', fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
                    {saving ? 'Salvando...' : '✓ Concluir Acabamento'}
                  </button>}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
