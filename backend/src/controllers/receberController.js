const db = require('../db');

async function listar(req, res) {
  const { status, cliente_id, data_ini, data_fim, vencido } = req.query;
  let sql = `
    SELECT cr.*, c.razao_social AS cliente_nome
    FROM contas_receber cr
    LEFT JOIN clientes c ON c.id = cr.cliente_id
    WHERE 1=1`;
  const params = [];

  if (status)     { params.push(status);     sql += ` AND cr.status = $${params.length}`; }
  if (cliente_id) { params.push(cliente_id); sql += ` AND cr.cliente_id = $${params.length}`; }
  if (data_ini)   { params.push(data_ini);   sql += ` AND cr.vencimento >= $${params.length}`; }
  if (data_fim)   { params.push(data_fim);   sql += ` AND cr.vencimento <= $${params.length}`; }
  if (vencido === 'true') sql += ` AND cr.vencimento < NOW() AND cr.status = 'pendente'`;

  sql += ' ORDER BY cr.vencimento ASC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query(
    `SELECT cr.*, c.razao_social AS cliente_nome
     FROM contas_receber cr
     LEFT JOIN clientes c ON c.id = cr.cliente_id
     WHERE cr.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { cliente_id, descricao, valor, forma_pagamento, vencimento, op_id } = req.body;
  if (!valor || !vencimento)
    return res.status(400).json({ error: 'valor e vencimento são obrigatórios' });

  const { rows } = await db.query(
    `INSERT INTO contas_receber (cliente_id, descricao, valor, forma_pagamento, vencimento, status, op_id)
     VALUES ($1,$2,$3,$4,$5,'pendente',$6) RETURNING *`,
    [cliente_id, descricao, valor, forma_pagamento, vencimento, op_id]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { cliente_id, descricao, valor, forma_pagamento, vencimento, status, op_id } = req.body;
  const { rows } = await db.query(
    `UPDATE contas_receber SET
       cliente_id      = COALESCE($1, cliente_id),
       descricao       = COALESCE($2, descricao),
       valor           = COALESCE($3, valor),
       forma_pagamento = COALESCE($4, forma_pagamento),
       vencimento      = COALESCE($5, vencimento),
       status          = COALESCE($6, status),
       op_id           = COALESCE($7, op_id),
       updated_at      = NOW()
     WHERE id=$8 RETURNING *`,
    [cliente_id, descricao, valor, forma_pagamento, vencimento, status, op_id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM contas_receber WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Conta não encontrada' });
  return res.status(204).send();
}

async function baixar(req, res) {
  const { rows } = await db.query(
    `UPDATE contas_receber SET status='pago', updated_at=NOW()
     WHERE id=$1 AND status='pendente' RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conta não encontrada ou já paga' });
  return res.json(rows[0]);
}

module.exports = { listar, buscar, criar, atualizar, remover, baixar };
