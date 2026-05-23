const db = require('../db');

async function listar(req, res) {
  const { op_id, tipo, data_ini, data_fim } = req.query;
  let sql = `
    SELECT ct.*, u.nome AS usuario_nome, op.numero AS op_numero
    FROM coletas_transporte ct
    LEFT JOIN usuarios u ON u.id = ct.usuario_id
    LEFT JOIN ordens_producao op ON op.id = ct.op_id
    WHERE 1=1`;
  const params = [];

  if (op_id)   { params.push(op_id);   sql += ` AND ct.op_id = $${params.length}`; }
  if (tipo)    { params.push(tipo);    sql += ` AND ct.tipo = $${params.length}`; }
  if (data_ini){ params.push(data_ini); sql += ` AND ct.data >= $${params.length}`; }
  if (data_fim){ params.push(data_fim); sql += ` AND ct.data <= $${params.length}`; }

  sql += ' ORDER BY ct.data DESC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query(
    `SELECT ct.*, u.nome AS usuario_nome, op.numero AS op_numero
     FROM coletas_transporte ct
     LEFT JOIN usuarios u ON u.id = ct.usuario_id
     LEFT JOIN ordens_producao op ON op.id = ct.op_id
     WHERE ct.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Coleta não encontrada' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { op_id, lote_codigo, tipo, origem, destino, quantidade_json, observacao, status, data_retorno_previsto } = req.body;
  if (!tipo || !origem || !destino)
    return res.status(400).json({ error: 'tipo, origem e destino são obrigatórios' });

  const { rows } = await db.query(
    `INSERT INTO coletas_transporte (usuario_id, op_id, lote_codigo, tipo, origem, destino, quantidade_json, observacao, status, data_retorno_previsto)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, op_id, lote_codigo, tipo, origem, destino, JSON.stringify(quantidade_json || {}), observacao, status || 'enviado', data_retorno_previsto || null]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { op_id, lote_codigo, tipo, origem, destino, quantidade_json, observacao, status, data_retorno_previsto, divergencias_json } = req.body;
  const { rows } = await db.query(
    `UPDATE coletas_transporte SET
       op_id                 = COALESCE($1, op_id),
       lote_codigo           = COALESCE($2, lote_codigo),
       tipo                  = COALESCE($3, tipo),
       origem                = COALESCE($4, origem),
       destino               = COALESCE($5, destino),
       quantidade_json       = COALESCE($6, quantidade_json),
       observacao            = COALESCE($7, observacao),
       status                = COALESCE($8, status),
       data_retorno_previsto = COALESCE($9, data_retorno_previsto),
       divergencias_json     = COALESCE($10, divergencias_json),
       updated_at            = NOW()
     WHERE id=$11 RETURNING *`,
    [op_id, lote_codigo, tipo, origem, destino,
     quantidade_json ? JSON.stringify(quantidade_json) : null,
     observacao, status,
     data_retorno_previsto || null,
     divergencias_json ? JSON.stringify(divergencias_json) : null,
     req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Coleta não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM coletas_transporte WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Coleta não encontrada' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover };
