const db = require('../db');

async function listar(req, res) {
  const { op_id, faccao, data_ini, data_fim } = req.query;
  let sql = `
    SELECT rq.*, op.numero AS op_numero
    FROM revisoes_qualidade rq
    LEFT JOIN ordens_producao op ON op.id = rq.op_id
    WHERE 1=1`;
  const params = [];

  if (op_id)   { params.push(op_id);   sql += ` AND rq.op_id = $${params.length}`; }
  if (faccao)  { params.push(`%${faccao}%`); sql += ` AND rq.faccao ILIKE $${params.length}`; }
  if (data_ini){ params.push(data_ini); sql += ` AND rq.data >= $${params.length}`; }
  if (data_fim){ params.push(data_fim); sql += ` AND rq.data <= $${params.length}`; }

  sql += ' ORDER BY rq.data DESC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query(
    `SELECT rq.*, op.numero AS op_numero
     FROM revisoes_qualidade rq
     LEFT JOIN ordens_producao op ON op.id = rq.op_id
     WHERE rq.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Revisão não encontrada' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { op_id, faccao, revisora, data, cores_json, defeitos_json } = req.body;
  if (!op_id) return res.status(400).json({ error: 'op_id é obrigatório' });

  const { rows } = await db.query(
    `INSERT INTO revisoes_qualidade (op_id, faccao, revisora, data, cores_json, defeitos_json)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [op_id, faccao, revisora, data || new Date(), JSON.stringify(cores_json || []), JSON.stringify(defeitos_json || [])]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { faccao, revisora, data, cores_json, defeitos_json } = req.body;
  const { rows } = await db.query(
    `UPDATE revisoes_qualidade SET
       faccao       = COALESCE($1, faccao),
       revisora     = COALESCE($2, revisora),
       data         = COALESCE($3, data),
       cores_json   = COALESCE($4, cores_json),
       defeitos_json= COALESCE($5, defeitos_json),
       updated_at   = NOW()
     WHERE id=$6 RETURNING *`,
    [faccao, revisora, data, cores_json ? JSON.stringify(cores_json) : null, defeitos_json ? JSON.stringify(defeitos_json) : null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Revisão não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM revisoes_qualidade WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Revisão não encontrada' });
  return res.status(204).send();
}

async function resumoDefeitos(req, res) {
  const { rows } = await db.query(
    `SELECT rq.op_id, op.numero, rq.faccao,
            COUNT(*) AS total_revisoes,
            rq.defeitos_json
     FROM revisoes_qualidade rq
     LEFT JOIN ordens_producao op ON op.id = rq.op_id
     GROUP BY rq.op_id, op.numero, rq.faccao, rq.defeitos_json
     ORDER BY total_revisoes DESC`
  );
  return res.json(rows);
}

module.exports = { listar, buscar, criar, atualizar, remover, resumoDefeitos };
