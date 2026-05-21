import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApiQuery } from '../hooks/useApi';
import { dashboardService, estoqueService, ordensProducaoService } from '../services/api';
import { useTopbar } from '../context/TopbarContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const G = '#1D9E75';

const FASES = [
  { id: 'Aguardando', cor: '#6b7280', bgCol: '#f3f4f6', bgCard: '#f9fafb' },
  { id: 'Corte',      cor: '#7c3aed', bgCol: '#f5f3ff', bgCard: '#faf5ff' },
  { id: 'Costura',    cor: G,         bgCol: '#ecfdf5', bgCard: '#f0fdf8' },
  { id: 'Acabamento', cor: '#d97706', bgCol: '#fefce8', bgCard: '#fffbeb' },
  { id: 'Qualidade',  cor: '#0891b2', bgCol: '#e0f2fe', bgCard: '#f0f9ff' },
  { id: 'Expedição',  cor: '#16a34a', bgCol: '#dcfce7', bgCard: '#f0fdf4' },
];

const KPI_DEFS = [
  { key: 'opsAtivas',       label: 'OPs Ativas',       icon: '📋', cor: G         },
  { key: 'pecasEmProducao', label: 'Peças em Produção', icon: '🧵', cor: '#0891b2' },
  { key: 'aReceber',        label: 'A Receber',         icon: '💰', cor: '#16a34a', moeda: true },
  { key: 'alertasCriticos', label: 'Alertas Críticos',  icon: '🚨', cor: '#dc2626' },
  { key: 'cortadasHoje',    label: 'Cortadas Hoje',     icon: '✂',  cor: '#7c3aed' },
  { key: 'aPagar7dias',     label: 'A Pagar 7 dias',    icon: '💸', cor: '#ea580c', moeda: true },
  { key: 'rendimentoCorte', label: 'Rendimento Corte',  icon: '📊', cor: '#0891b2', pct: true },
  { key: 'entregasHoje',    label: 'Entregas Hoje',     icon: '🚚', cor: '#4f46e5' },
];

const TIMELINE_CORES = {
  producao:   G,
  estoque:    '#7c3aed',
  financeiro: '#16a34a',
  alerta:     '#dc2626',
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK (usado enquanto API não responde)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK = {
  kpis: {
    opsAtivas: 42, pecasEmProducao: 1840, aReceber: 48500,
    alertasCriticos: 3, cortadasHoje: 320, aPagar7dias: 12300,
    rendimentoCorte: 94.2, entregasHoje: 7,
  },
  alertas: [
    { id: 1, tipo: 'critico', mensagem: 'OP #1042 — atraso de 3 dias na entrega', modulo: 'Produção' },
    { id: 2, tipo: 'critico', mensagem: 'Tecido Jersey Branco — estoque zerado', modulo: 'Estoque' },
    { id: 3, tipo: 'critico', mensagem: 'Fatura #892 venceu ontem — R$ 3.200', modulo: 'Financeiro' },
    { id: 4, tipo: 'aviso',   mensagem: '5 OPs aguardando corte há 2 dias', modulo: 'Produção' },
    { id: 5, tipo: 'aviso',   mensagem: 'Conta a pagar vence em 2 dias — R$ 5.800', modulo: 'Financeiro' },
  ],
  producaoSemanal: [
    { dia: 'Seg', cortadas: 280, costuradas: 240, finalizadas: 200 },
    { dia: 'Ter', cortadas: 320, costuradas: 290, finalizadas: 260 },
    { dia: 'Qua', cortadas: 310, costuradas: 280, finalizadas: 250 },
    { dia: 'Qui', cortadas: 350, costuradas: 310, finalizadas: 290 },
    { dia: 'Sex', cortadas: 320, costuradas: 300, finalizadas: 280 },
    { dia: 'Sáb', cortadas: 180, costuradas: 160, finalizadas: 140 },
    { dia: 'Dom', cortadas: 60,  costuradas: 50,  finalizadas: 40  },
  ],
  ops: [
    { id: 'OP-1042', cliente: 'Atacado Sul',   pecas: 480, prestador: 'Costureiras Norte', fase: 'Aguardando', prioridade: 'alta',   produto: 'Camiseta Lisa'   },
    { id: 'OP-1047', cliente: 'Lojas Rápida',  pecas: 200, prestador: 'Grupo Delta',       fase: 'Aguardando', prioridade: 'normal', produto: 'Bermuda Jeans'  },
    { id: 'OP-1041', cliente: 'ModaFácil',     pecas: 320, prestador: 'Grupo Alfa',        fase: 'Corte',      prioridade: 'normal', produto: 'Vestido Floral' },
    { id: 'OP-1040', cliente: 'Varejo SP',     pecas: 600, prestador: 'Atelier Central',   fase: 'Corte',      prioridade: 'alta',   produto: 'Calça Social'   },
    { id: 'OP-1039', cliente: 'FastModa',      pecas: 240, prestador: 'Costureiras Sul',   fase: 'Costura',    prioridade: 'normal', produto: 'Shorts Verão'   },
    { id: 'OP-1038', cliente: 'Atacado Norte', pecas: 360, prestador: 'Grupo Alfa',        fase: 'Costura',    prioridade: 'alta',   produto: 'Blusa Manga'    },
    { id: 'OP-1045', cliente: 'MegaStore',     pecas: 420, prestador: 'Atelier Premium',   fase: 'Costura',    prioridade: 'normal', produto: 'Regata Dry-Fit' },
    { id: 'OP-1036', cliente: 'ModaFácil',     pecas: 180, prestador: 'Costureiras Norte', fase: 'Acabamento', prioridade: 'normal', produto: 'Camiseta Polo'  },
    { id: 'OP-1044', cliente: 'Sul Moda',      pecas: 210, prestador: 'Grupo Beta',        fase: 'Acabamento', prioridade: 'alta',   produto: 'Calça Jeans'    },
    { id: 'OP-1035', cliente: 'Varejo SP',     pecas: 290, prestador: 'Grupo Beta',        fase: 'Qualidade',  prioridade: 'alta',   produto: 'Vestido Festa'  },
    { id: 'OP-1034', cliente: 'FastModa',      pecas: 400, prestador: 'Atelier Central',   fase: 'Qualidade',  prioridade: 'normal', produto: 'Macacão Linen'  },
    { id: 'OP-1033', cliente: 'Atacado Sul',   pecas: 320, prestador: 'Costureiras Sul',   fase: 'Expedição',  prioridade: 'alta',   produto: 'Camiseta Lisa'  },
    { id: 'OP-1032', cliente: 'MegaStore',     pecas: 280, prestador: 'Grupo Alfa',        fase: 'Expedição',  prioridade: 'normal', produto: 'Shorts Esporte' },
  ],
  financeiro: {
    aReceber: { total: 48500, vencido: 8200, aVencer: 40300 },
    aPagar:   { total: 23800, vencido: 4100, aVencer: 19700 },
  },
  estoque: [
    { produto: 'Tecido Jersey Branco', atual: 0,  minimo: 50,  unidade: 'kg' },
    { produto: 'Linha 120 Preta',      atual: 5,  minimo: 20,  unidade: 'un' },
    { produto: 'Elástico 2cm',         atual: 12, minimo: 30,  unidade: 'm'  },
    { produto: 'Botão 12mm Caqui',     atual: 80, minimo: 200, unidade: 'un' },
  ],
  timeline: [
    { hora: '08:42', tipo: 'producao',   descricao: 'OP-1040 iniciou corte',            usuario: 'João Silva'    },
    { hora: '09:15', tipo: 'estoque',    descricao: 'Entrada: 200 kg Malha Algodão',    usuario: 'Maria Santos'  },
    { hora: '10:03', tipo: 'financeiro', descricao: 'Recebimento R$ 4.800 — FastModa',  usuario: 'Carlos Lima'   },
    { hora: '11:30', tipo: 'producao',   descricao: 'OP-1036 aprovada na qualidade',    usuario: 'Ana Costa'     },
    { hora: '13:22', tipo: 'alerta',     descricao: 'Estoque crítico: Tecido Jersey',   usuario: 'Sistema'       },
    { hora: '14:50', tipo: 'producao',   descricao: 'OP-1033 enviada para expedição',   usuario: 'Pedro Alves'   },
    { hora: '15:18', tipo: 'financeiro', descricao: 'NF #1093 emitida — Atacado Sul',   usuario: 'Carlos Lima'   },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtKPI(def, v) {
  if (v == null) return '--';
  if (def.pct)   return `${Number(v).toFixed(1)}%`;
  if (def.moeda) return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  return Number(v).toLocaleString('pt-BR');
}

function fmtBRL(v) {
  return `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

function card(extra = {}) {
  return {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────────────────────────────────────

function KPICard({ def, valor }) {
  return (
    <div style={{
      ...card(),
      padding: '1rem 1.125rem',
      borderTop: `3px solid ${def.cor}`,
      display: 'flex', flexDirection: 'column', gap: '0.625rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: '700', color: '#6b7280',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {def.label}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '30px', height: '30px', borderRadius: '8px',
          background: `${def.cor}18`, fontSize: '14px',
        }}>
          {def.icon}
        </span>
      </div>
      <p style={{
        margin: 0, fontSize: '1.6rem', fontWeight: '800',
        color: def.cor === '#dc2626' && valor > 0 ? '#dc2626' : '#111827',
        lineHeight: 1,
      }}>
        {fmtKPI(def, valor)}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS CRÍTICOS
// ─────────────────────────────────────────────────────────────────────────────

function AlertasPanel({ alertas }) {
  return (
    <div style={{ ...card(), padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        🚨 Alertas Críticos
      </h3>
      {alertas.length === 0 && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Nenhum alerta no momento.</p>
      )}
      {alertas.map((a) => {
        const critico = a.tipo === 'critico';
        return (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            padding: '0.5rem 0.625rem', borderRadius: '8px',
            background: critico ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${critico ? '#fecaca' : '#fed7aa'}`,
          }}>
            <span style={{ fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>
              {critico ? '🔴' : '🟡'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: critico ? '#991b1b' : '#92400e', fontWeight: '500' }}>
                {a.mensagem}
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#9ca3af', marginTop: '1px' }}>
                {a.modulo}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO PRODUÇÃO SEMANAL
// ─────────────────────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: '#fff', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

function GraficoProducao({ dados }) {
  return (
    <div style={{ ...card(), padding: '1.125rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        📈 Produção Semanal (peças)
      </h3>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={dados} barGap={2} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
          <Bar dataKey="cortadas"    name="Cortadas"    fill="#7c3aed" radius={[4, 4, 0, 0]} />
          <Bar dataKey="costuradas"  name="Costuradas"  fill={G}       radius={[4, 4, 0, 0]} />
          <Bar dataKey="finalizadas" name="Finalizadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KANBAN RESUMIDO
// ─────────────────────────────────────────────────────────────────────────────

function KanbanCard({ op, bgCard }) {
  const cor = op.prioridade === 'alta' ? '#dc2626' : '#6b7280';
  return (
    <div style={{
      background: bgCard, border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: '8px', padding: '0.5rem 0.625rem', marginBottom: '0.375rem',
      borderLeft: `3px solid ${cor}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.73rem', fontWeight: '700', color: '#374151' }}>{op.id}</span>
        {op.prioridade === 'alta' && (
          <span style={{ fontSize: '9px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '0 4px', fontWeight: '700' }}>
            URGENTE
          </span>
        )}
      </div>
      <p style={{ margin: '0 0 1px', fontSize: '0.75rem', color: '#111827', fontWeight: '500' }}>{op.cliente}</p>
      <p style={{ margin: '0 0 2px', fontSize: '0.68rem', color: '#6b7280' }}>{op.produto}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{op.pecas?.toLocaleString('pt-BR')} pçs</span>
        <span style={{
          fontSize: '0.62rem', background: 'rgba(0,0,0,0.06)',
          color: '#4b5563', borderRadius: '4px', padding: '1px 5px',
          maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {op.prestador}
        </span>
      </div>
    </div>
  );
}

function KanbanResumido({ ops }) {
  return (
    <div style={{ ...card(), padding: '1.125rem' }}>
      <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        🗂 Kanban de Produção
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.625rem', overflowX: 'auto' }}>
        {FASES.map((fase) => {
          const itens = ops.filter((op) => (op.fase || op.status) === fase.id);
          return (
            <div key={fase.id} style={{ background: fase.bgCol, borderRadius: '10px', padding: '0.625rem', minWidth: '150px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: fase.cor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {fase.id}
                </span>
                <span style={{
                  background: fase.cor, color: '#fff', borderRadius: '999px',
                  fontSize: '0.65rem', fontWeight: '700', padding: '1px 7px',
                }}>
                  {itens.length}
                </span>
              </div>
              {itens.length === 0 ? (
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center', margin: '1rem 0' }}>—</p>
              ) : (
                itens.map((op) => <KanbanCard key={op.id} op={op} bgCard={fase.bgCard} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL FINANCEIRO
// ─────────────────────────────────────────────────────────────────────────────

function BarraProgresso({ label, valor, total, cor }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#111827' }}>
          {fmtBRL(valor)} <span style={{ color: '#9ca3af', fontWeight: '400' }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: '7px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function PainelFinanceiro({ fin }) {
  const rec = fin.aReceber;
  const pag = fin.aPagar;
  return (
    <div style={{ ...card(), padding: '1.125rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        💵 Painel Financeiro
      </h3>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#16a34a' }}>A RECEBER</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>{fmtBRL(rec.total)}</span>
        </div>
        <BarraProgresso label="Vencido"  valor={rec.vencido}  total={rec.total} cor="#dc2626" />
        <BarraProgresso label="A vencer" valor={rec.aVencer}  total={rec.total} cor="#16a34a" />
      </div>

      <div style={{ height: '1px', background: '#f3f4f6', margin: '0 0 1rem' }} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ea580c' }}>A PAGAR</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>{fmtBRL(pag.total)}</span>
        </div>
        <BarraProgresso label="Vencido"  valor={pag.vencido}  total={pag.total} cor="#dc2626" />
        <BarraProgresso label="A vencer" valor={pag.aVencer}  total={pag.total} cor="#ea580c" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTOQUE CRÍTICO
// ─────────────────────────────────────────────────────────────────────────────

function EstoqueCritico({ itens }) {
  return (
    <div style={{ ...card(), padding: '1.125rem' }}>
      <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        📦 Estoque Crítico
      </h3>
      {itens.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Nenhum item crítico.</p>
      )}
      {itens.map((item, i) => {
        const pct = item.minimo > 0 ? Math.round((item.atual / item.minimo) * 100) : 0;
        const zerado = item.atual === 0;
        return (
          <div key={i} style={{ marginBottom: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', flex: 1 }}>{item.produto}</span>
              <span style={{
                fontSize: '0.68rem', fontWeight: '700', marginLeft: '0.5rem', flexShrink: 0,
                color: zerado ? '#dc2626' : '#ea580c',
                background: zerado ? '#fef2f2' : '#fff7ed',
                border: `1px solid ${zerado ? '#fecaca' : '#fed7aa'}`,
                borderRadius: '4px', padding: '1px 6px',
              }}>
                {item.atual === 0 ? 'ZERADO' : `${pct}%`}
              </span>
            </div>
            <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
              <div style={{
                height: '100%', width: `${Math.min(pct, 100)}%`,
                background: zerado ? '#dc2626' : '#ea580c',
                borderRadius: '3px',
              }} />
            </div>
            <span style={{ fontSize: '0.67rem', color: '#9ca3af' }}>
              {item.atual} / {item.minimo} {item.unidade} (mínimo)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE DO DIA
// ─────────────────────────────────────────────────────────────────────────────

function TimelineDia({ eventos }) {
  return (
    <div style={{ ...card(), padding: '1.125rem' }}>
      <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827' }}>
        🕐 Timeline do Dia
      </h3>
      <div style={{ position: 'relative', paddingLeft: '20px' }}>
        <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: '#e5e7eb' }} />
        {eventos.map((e, i) => {
          const cor = TIMELINE_CORES[e.tipo] ?? '#9ca3af';
          return (
            <div key={i} style={{ position: 'relative', marginBottom: '0.875rem' }}>
              <div style={{
                position: 'absolute', left: '-16px', top: '3px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: cor, border: '2px solid #fff',
                boxShadow: `0 0 0 2px ${cor}40`,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#374151', fontWeight: '500' }}>{e.descricao}</p>
                  <p style={{ margin: 0, fontSize: '0.67rem', color: '#9ca3af' }}>{e.usuario}</p>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {e.hora}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RELÓGIO (para TV)
// ─────────────────────────────────────────────────────────────────────────────

function Relogio({ tamanho = '4rem', cor = '#fff' }) {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hms = hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const data = hora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: tamanho, fontWeight: '800', color: cor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {hms}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
        {data}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TV — KANBAN
// ─────────────────────────────────────────────────────────────────────────────

function TVKanbanCard({ op, fase }) {
  const prio = op.prioridade === 'alta';
  return (
    <div style={{
      background: '#1a2e20', border: `1px solid ${fase.cor}30`,
      borderLeft: `3px solid ${prio ? '#dc2626' : fase.cor}`,
      borderRadius: '10px', padding: '0.75rem',
      marginBottom: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: fase.cor }}>{op.id}</span>
        {prio && <span style={{ fontSize: '0.6rem', background: '#7f1d1d', color: '#fca5a5', borderRadius: '4px', padding: '1px 6px', fontWeight: '700' }}>URGENTE</span>}
      </div>
      <p style={{ margin: '0 0 2px', fontSize: '0.85rem', color: '#f9fafb', fontWeight: '600' }}>{op.cliente}</p>
      <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{op.produto}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#86efac' }}>{op.pecas?.toLocaleString('pt-BR')} peças</span>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
        {op.prestador}
      </p>
    </div>
  );
}

function TVKanban({ kpis, ops, onSair }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#040d07',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* header */}
      <div style={{
        background: 'linear-gradient(90deg, #071e0f 0%, #0a2e16 100%)',
        borderBottom: `2px solid ${G}30`,
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', gap: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${G}, #15803d)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          }}>🧵</div>
          <div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#fff' }}>ConfecçãoERP</p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: G }}>PRODUÇÃO EM TEMPO REAL</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ flex: 1, display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {[
            { label: 'OPs Ativas',  val: kpis?.opsAtivas,       cor: G         },
            { label: 'Em Produção', val: kpis?.pecasEmProducao,  cor: '#0891b2' },
            { label: 'Cortadas',    val: kpis?.cortadasHoje,     cor: '#7c3aed' },
            { label: 'Entregas',    val: kpis?.entregasHoje,     cor: '#16a34a' },
          ].map((k) => (
            <div key={k.label} style={{
              background: '#0d1f14', borderRadius: '10px', padding: '0.5rem 1rem',
              border: `1px solid ${k.cor}25`, textAlign: 'center', minWidth: '100px',
            }}>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: k.cor }}>
                {k.val?.toLocaleString('pt-BR') ?? '--'}
              </p>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {k.label}
              </p>
            </div>
          ))}
        </div>

        {/* relógio */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <Relogio tamanho="2.2rem" />
        </div>

        <button onClick={onSair} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '0.4rem 0.875rem',
          cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0,
        }}>
          ✕ Sair
        </button>
      </div>

      {/* kanban */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1px', overflow: 'hidden' }}>
        {FASES.map((fase) => {
          const itens = ops.filter((op) => (op.fase || op.status) === fase.id);
          return (
            <div key={fase.id} style={{ background: '#071209', overflowY: 'auto', padding: '1rem 0.75rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.75rem', paddingBottom: '0.625rem',
                borderBottom: `2px solid ${fase.cor}`,
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: fase.cor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {fase.id}
                </span>
                <span style={{
                  background: fase.cor, color: '#fff', borderRadius: '999px',
                  fontSize: '0.75rem', fontWeight: '800', padding: '1px 8px',
                }}>
                  {itens.length}
                </span>
              </div>
              {itens.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '2rem' }}>—</p>
              ) : (
                itens.map((op) => <TVKanbanCard key={op.id} op={op} fase={fase} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TV — FINANCEIRO
// ─────────────────────────────────────────────────────────────────────────────

function TVFinanceiro({ fin, kpis, onSair }) {
  const rec = fin.aReceber;
  const pag = fin.aPagar;
  const saldo = rec.total - pag.total;

  const TVBarra = ({ label, valor, total, cor }) => {
    const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{label}</span>
          <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}>{fmtBRL(valor)} ({pct}%)</span>
        </div>
        <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: '6px', transition: 'width 0.6s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#040d07',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '2rem',
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', left: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `linear-gradient(135deg, ${G}, #15803d)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🧵</div>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>ConfecçãoERP — Financeiro</p>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Relogio tamanho="2rem" />
        <button onClick={onSair} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.78rem' }}>
          ✕ Sair
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '900px' }}>
        {/* saldo */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ margin: '0 0 0.25rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Líquido</p>
          <p style={{ margin: 0, fontSize: '4rem', fontWeight: '900', color: saldo >= 0 ? G : '#dc2626', lineHeight: 1 }}>
            {fmtBRL(saldo)}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          <div style={{ background: '#0d1f14', borderRadius: '16px', padding: '1.75rem', border: `1px solid ${G}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: G, textTransform: 'uppercase', letterSpacing: '0.5px' }}>A Receber</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff' }}>{fmtBRL(rec.total)}</span>
            </div>
            <TVBarra label="Vencido"  valor={rec.vencido}  total={rec.total} cor="#dc2626" />
            <TVBarra label="A vencer" valor={rec.aVencer}  total={rec.total} cor={G} />
          </div>

          <div style={{ background: '#1f0d0d', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(234,88,12,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>A Pagar</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff' }}>{fmtBRL(pag.total)}</span>
            </div>
            <TVBarra label="Vencido"  valor={pag.vencido}  total={pag.total} cor="#dc2626" />
            <TVBarra label="A vencer" valor={pag.aVencer}  total={pag.total} cor="#ea580c" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TV — ALERTAS
// ─────────────────────────────────────────────────────────────────────────────

function TVAlertas({ alertas, kpis, onSair }) {
  const criticos = alertas.filter((a) => a.tipo === 'critico');
  const avisos   = alertas.filter((a) => a.tipo === 'aviso');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0303',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', padding: '2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚨</div>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#fff' }}>Central de Alertas — ConfecçãoERP</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Relogio tamanho="1.75rem" />
          <button onClick={onSair} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.78rem' }}>
            ✕ Sair
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>
        <div style={{ background: '#1a0505', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(220,38,38,0.3)', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: '800', color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🔴 Críticos ({criticos.length})
          </p>
          {criticos.map((a) => (
            <div key={a.id} style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px', padding: '1rem 1.125rem', marginBottom: '0.75rem' }}>
              <p style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{a.mensagem}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{a.modulo}</p>
            </div>
          ))}
          {criticos.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Nenhum alerta crítico.</p>}
        </div>

        <div style={{ background: '#1a1205', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(234,179,8,0.3)', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: '800', color: '#fde047', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🟡 Avisos ({avisos.length})
          </p>
          {avisos.map((a) => (
            <div key={a.id} style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '10px', padding: '1rem 1.125rem', marginBottom: '0.75rem' }}>
              <p style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{a.mensagem}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{a.modulo}</p>
            </div>
          ))}
          {avisos.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Nenhum aviso.</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const BTN_TV = {
  padding: '0.45rem 0.875rem',
  borderRadius: '8px',
  border: `1px solid ${G}40`,
  background: `${G}10`,
  color: G,
  fontSize: '0.78rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { setAction } = useTopbar();
  const [tvMode, setTvMode] = useState(null);

  // ── Dados da API ──────────────────────────────────────────────────
  const { data: resumoApi } = useApiQuery(
    'dashboard-resumo',
    dashboardService.resumo,
    { refetchInterval: 60_000, retry: 1 }
  );
  const { data: alertasApi } = useApiQuery(
    'dashboard-alertas',
    dashboardService.alertas,
    { refetchInterval: 60_000, retry: 1 }
  );
  const { data: opsApi } = useApiQuery(
    'ordens-kanban',
    () => ordensProducaoService.listar({ limite: 50 }),
    { refetchInterval: 60_000, retry: 1 }
  );
  const { data: estoqueApi } = useApiQuery(
    'estoque-alertas',
    estoqueService.alertasMinimo,
    { refetchInterval: 120_000, retry: 1 }
  );

  // fallback para mock quando API não responde
  const kpis    = resumoApi   ?? MOCK.kpis;
  const alertas = alertasApi  ?? MOCK.alertas;
  const ops     = opsApi      ?? MOCK.ops;
  const estoque = estoqueApi  ?? MOCK.estoque;
  const fin     = MOCK.financeiro; // endpoint de resumo financeiro ainda não existe

  // ── Topbar: botão Atualizar ───────────────────────────────────────
  useEffect(() => {
    setAction({
      label: 'Atualizar',
      onClick: () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-resumo'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-alertas'] });
        queryClient.invalidateQueries({ queryKey: ['ordens-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['estoque-alertas'] });
      },
    });
    return () => setAction(null);
  }, [setAction, queryClient]);

  // ── Fullscreen ────────────────────────────────────────────────────
  const entrarTV = useCallback((modo) => {
    setTvMode(modo);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const sairTV = useCallback(() => {
    setTvMode(null);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setTvMode(null); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── TV views ──────────────────────────────────────────────────────
  if (tvMode === 'kanban')    return <TVKanban    kpis={kpis} ops={ops}   onSair={sairTV} />;
  if (tvMode === 'financeiro') return <TVFinanceiro fin={fin}  kpis={kpis} onSair={sairTV} />;
  if (tvMode === 'alertas')   return <TVAlertas   alertas={alertas} kpis={kpis} onSair={sairTV} />;

  // ── Layout principal ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* ── KPI Cards: 2 linhas de 4 ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
        {KPI_DEFS.map((def) => (
          <KPICard key={def.key} def={def} valor={kpis?.[def.key]} />
        ))}
      </div>

      {/* ── Linha 2: Alertas + Gráfico ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0.875rem' }}>
        <AlertasPanel alertas={alertas} />
        <GraficoProducao dados={MOCK.producaoSemanal} />
      </div>

      {/* ── Linha 3: Kanban (largura total) ──────────────────────── */}
      <KanbanResumido ops={ops} />

      {/* ── Linha 4: Financeiro + Estoque + Timeline ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
        <PainelFinanceiro fin={fin} />
        <EstoqueCritico itens={estoque} />
        <TimelineDia eventos={MOCK.timeline} />
      </div>

      {/* ── Botões TV ─────────────────────────────────────────────── */}
      <div style={{ ...card(), padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: '#6b7280', marginRight: '0.25rem' }}>
          📺 Expandir para TV:
        </span>
        <button style={BTN_TV} onClick={() => entrarTV('kanban')}>
          🗂 Kanban na TV
        </button>
        <button style={BTN_TV} onClick={() => entrarTV('financeiro')}>
          💵 Financeiro na TV
        </button>
        <button style={BTN_TV} onClick={() => entrarTV('alertas')}>
          🚨 Alertas na TV
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#d1d5db' }}>
          Pressione ESC para sair
        </span>
      </div>
    </div>
  );
}
