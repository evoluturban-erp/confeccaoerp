const db = require('../db');

async function listar(req, res) {
  const { status, tipo, search } = req.query;
  let sql = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];

  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  if (tipo)   { params.push(tipo);   sql += ` AND tipo = $${params.length}`; }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (razao_social ILIKE $${params.length} OR fantasia ILIKE $${params.length} OR documento ILIKE $${params.length})`;
  }
  sql += ' ORDER BY razao_social';

  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { razao_social, fantasia, tipo, documento, email, telefone, cidade, limite_credito, forma_pagamento } = req.body;
  if (!razao_social || !tipo)
    return res.status(400).json({ error: 'razao_social e tipo são obrigatórios' });

  const { rows } = await db.query(
    `INSERT INTO clientes (razao_social, fantasia, tipo, documento, email, telefone, cidade, limite_credito, forma_pagamento, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ativo') RETURNING *`,
    [razao_social, fantasia, tipo, documento, email, telefone, cidade, limite_credito || 0, forma_pagamento]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { razao_social, fantasia, tipo, documento, email, telefone, cidade, limite_credito, forma_pagamento, status } = req.body;
  const { rows } = await db.query(
    `UPDATE clientes SET
       razao_social   = COALESCE($1, razao_social),
       fantasia       = COALESCE($2, fantasia),
       tipo           = COALESCE($3, tipo),
       documento      = COALESCE($4, documento),
       email          = COALESCE($5, email),
       telefone       = COALESCE($6, telefone),
       cidade         = COALESCE($7, cidade),
       limite_credito = COALESCE($8, limite_credito),
       forma_pagamento= COALESCE($9, forma_pagamento),
       status         = COALESCE($10, status),
       updated_at     = NOW()
     WHERE id = $11 RETURNING *`,
    [razao_social, fantasia, tipo, documento, email, telefone, cidade, limite_credito, forma_pagamento, status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover };
