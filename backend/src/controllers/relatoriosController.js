const db = require('../db');

async function dre(req, res) {
  const { data_ini, data_fim } = req.query;
  const ini = data_ini || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fim = data_fim || new Date().toISOString().slice(0, 10);

  const [receitas, despesas] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(valor),0) AS total,
              COUNT(*) FILTER (WHERE status='pago') AS pagas,
              COALESCE(SUM(valor) FILTER (WHERE status='pago'), 0) AS recebido,
              COALESCE(SUM(valor) FILTER (WHERE status='pendente'), 0) AS a_receber
       FROM contas_receber
       WHERE vencimento BETWEEN $1 AND $2`,
      [ini, fim]
    ),
    db.query(
      `SELECT COALESCE(SUM(valor),0) AS total,
              COUNT(*) FILTER (WHERE status='pago') AS pagas,
              COALESCE(SUM(valor) FILTER (WHERE status='pago'), 0) AS pago,
              COALESCE(SUM(valor) FILTER (WHERE status='pendente'), 0) AS a_pagar,
              json_agg(json_build_object('categoria', categoria, 'total', cat_total) ORDER BY cat_total DESC) AS por_categoria
       FROM (
         SELECT categoria, status, valor,
                SUM(valor) OVER (PARTITION BY categoria) AS cat_total
         FROM contas_pagar
         WHERE vencimento BETWEEN $1 AND $2
       ) sub`,
      [ini, fim]
    ),
  ]);

  const totalReceitas = parseFloat(receitas.rows[0].recebido);
  const totalDespesas = parseFloat(despesas.rows[0].pago);

  return res.json({
    periodo: { data_ini: ini, data_fim: fim },
    receitas: receitas.rows[0],
    despesas: despesas.rows[0],
    lucro_bruto: totalReceitas - totalDespesas,
    margem_percent: totalReceitas > 0 ? (((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(2) : '0.00',
  });
}

async function fluxoCaixa(req, res) {
  const { data_ini, data_fim, agrupamento } = req.query;
  const ini = data_ini || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fim = data_fim || new Date().toISOString().slice(0, 10);
  const trunc = agrupamento === 'semana' ? 'week' : agrupamento === 'ano' ? 'year' : 'month';

  const { rows } = await db.query(
    `SELECT
       DATE_TRUNC($1, periodo) AS periodo,
       COALESCE(SUM(entradas), 0) AS entradas,
       COALESCE(SUM(saidas), 0) AS saidas,
       COALESCE(SUM(entradas) - SUM(saidas), 0) AS saldo
     FROM (
       SELECT DATE_TRUNC($1, vencimento) AS periodo, valor AS entradas, 0 AS saidas
       FROM contas_receber WHERE status='pago' AND vencimento BETWEEN $2 AND $3
       UNION ALL
       SELECT DATE_TRUNC($1, vencimento) AS periodo, 0 AS entradas, valor AS saidas
       FROM contas_pagar WHERE status='pago' AND vencimento BETWEEN $2 AND $3
     ) t
     GROUP BY DATE_TRUNC($1, periodo)
     ORDER BY periodo ASC`,
    [trunc, ini, fim]
  );
  return res.json({ periodo: { data_ini: ini, data_fim: fim, agrupamento: trunc }, fluxo: rows });
}

async function rankingClientes(req, res) {
  const { data_ini, data_fim, limite } = req.query;
  const ini = data_ini || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fim = data_fim || new Date().toISOString().slice(0, 10);
  const lim = Math.min(parseInt(limite) || 10, 50);

  const { rows } = await db.query(
    `SELECT c.id, c.razao_social, c.fantasia, c.tipo,
            COUNT(cr.id) AS total_faturas,
            COALESCE(SUM(cr.valor), 0) AS faturamento_total,
            COALESCE(SUM(cr.valor) FILTER (WHERE cr.status='pago'), 0) AS recebido,
            COUNT(op.id) AS total_ops
     FROM clientes c
     LEFT JOIN contas_receber cr ON cr.cliente_id = c.id AND cr.vencimento BETWEEN $1 AND $2
     LEFT JOIN ordens_producao op ON op.cliente_id = c.id
     GROUP BY c.id, c.razao_social, c.fantasia, c.tipo
     ORDER BY faturamento_total DESC
     LIMIT $3`,
    [ini, fim, lim]
  );
  return res.json({ periodo: { data_ini: ini, data_fim: fim }, clientes: rows });
}

async function resumoOPs(req, res) {
  const { rows } = await db.query(
    `SELECT fase_atual, status, COUNT(*) AS total
     FROM ordens_producao
     GROUP BY fase_atual, status
     ORDER BY fase_atual`
  );
  return res.json(rows);
}

module.exports = { dre, fluxoCaixa, rankingClientes, resumoOPs };
