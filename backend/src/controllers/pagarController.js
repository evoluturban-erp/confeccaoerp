const db = require('../db');

async function listar(req, res) {
  const { status, categoria, data_ini, data_fim, vencido } = req.query;
  let sql = 'SELECT * FROM contas_pagar WHERE 1=1';
  const params = [];

  if (status)    { params.push(status);    sql += ` AND status = $${params.length}`; }
  if (categoria) { params.push(categoria); sql += ` AND categoria = $${params.length}`; }
  if (data_ini)  { params.push(data_ini);  sql += ` AND vencimento >= $${params.length}`; }
  if (data_fim)  { params.push(data_fim);  sql += ` AND vencimento <= $${params.length}`; }
  if (vencido === 'true') sql += ` AND vencimento < NOW() AND status = 'pendente'`;

  sql += ' ORDER BY vencimento ASC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query('SELECT * FROM contas_pagar WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { fornecedor, categoria, descricao, valor, forma_pagamento, vencimento, op_id } = req.body;
  if (!valor || !vencimento)
    return res.status(400).json({ error: 'valor e vencimento são obrigatórios' });

  const { rows } = await db.query(
    `INSERT INTO contas_pagar (fornecedor, categoria, descricao, valor, forma_pagamento, vencimento, status, op_id)
     VALUES ($1,$2,$3,$4,$5,$6,'pendente',$7) RETURNING *`,
    [fornecedor, categoria, descricao, valor, forma_pagamento, vencimento, op_id]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { fornecedor, categoria, descricao, valor, forma_pagamento, vencimento, status, op_id } = req.body;
  const { rows } = await db.query(
    `UPDATE contas_pagar SET
       fornecedor      = COALESCE($1, fornecedor),
       categoria       = COALESCE($2, categoria),
       descricao       = COALESCE($3, descricao),
       valor           = COALESCE($4, valor),
       forma_pagamento = COALESCE($5, forma_pagamento),
       vencimento      = COALESCE($6, vencimento),
       status          = COALESCE($7, status),
       op_id           = COALESCE($8, op_id),
       updated_at      = NOW()
     WHERE id=$9 RETURNING *`,
    [fornecedor, categoria, descricao, valor, forma_pagamento, vencimento, status, op_id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM contas_pagar WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.status(204).send();
}

async function baixar(req, res) {
  const { rows } = await db.query(
    `UPDATE contas_pagar SET status='pago', updated_at=NOW()
     WHERE id=$1 AND status='pendente' RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada ou já paga' });
  return res.json(rows[0]);
}

async function categorias(req, res) {
  const { rows } = await db.query(
    `SELECT categoria, COUNT(*) AS total, SUM(valor) AS valor_total
     FROM contas_pagar
     WHERE categoria IS NOT NULL
     GROUP BY categoria ORDER BY valor_total DESC`
  );
  return res.json(rows);
}

module.exports = { listar, buscar, criar, atualizar, remover, baixar, categorias };
