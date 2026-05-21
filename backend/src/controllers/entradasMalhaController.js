const db = require('../db');

async function listar(req, res) {
  const { tipo_entrada, data_ini, data_fim } = req.query;
  let sql = 'SELECT * FROM entradas_malha WHERE 1=1';
  const params = [];

  if (tipo_entrada) { params.push(tipo_entrada); sql += ` AND tipo_entrada = $${params.length}`; }
  if (data_ini)     { params.push(data_ini);     sql += ` AND data_entrada >= $${params.length}`; }
  if (data_fim)     { params.push(data_fim);     sql += ` AND data_entrada <= $${params.length}`; }

  sql += ' ORDER BY data_entrada DESC, id DESC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query('SELECT * FROM entradas_malha WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Entrada não encontrada' });

  const { rows: cores } = await db.query(
    'SELECT * FROM cores_entrada WHERE entrada_id=$1 ORDER BY id',
    [req.params.id]
  );
  return res.json({ ...rows[0], cores });
}

async function criar(req, res) {
  const { tipo_entrada, numero_controle, fornecedor, data_entrada, tipo_malha, gramatura, valor_total, cores } = req.body;
  if (!tipo_entrada || !data_entrada)
    return res.status(400).json({ error: 'tipo_entrada e data_entrada são obrigatórios' });

  // tipo_entrada: 'com_nf' | 'sem_nf'
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO entradas_malha (tipo_entrada, numero_controle, fornecedor, data_entrada, tipo_malha, gramatura, valor_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tipo_entrada, numero_controle, fornecedor, data_entrada, tipo_malha, gramatura, valor_total || 0]
    );
    const entrada = rows[0];

    const coresInseridas = [];
    for (const cor of (cores || [])) {
      const { rows: c } = await client.query(
        `INSERT INTO cores_entrada (entrada_id, nome_cor, hex_cor, kg_malha, preco_kg_malha, kg_ribana, preco_kg_ribana, lote)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [entrada.id, cor.nome_cor, cor.hex_cor, cor.kg_malha || 0, cor.preco_kg_malha || 0, cor.kg_ribana || 0, cor.preco_kg_ribana || 0, cor.lote]
      );
      coresInseridas.push(c[0]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ ...entrada, cores: coresInseridas });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const { tipo_entrada, numero_controle, fornecedor, data_entrada, tipo_malha, gramatura, valor_total } = req.body;
  const { rows } = await db.query(
    `UPDATE entradas_malha SET
       tipo_entrada    = COALESCE($1, tipo_entrada),
       numero_controle = COALESCE($2, numero_controle),
       fornecedor      = COALESCE($3, fornecedor),
       data_entrada    = COALESCE($4, data_entrada),
       tipo_malha      = COALESCE($5, tipo_malha),
       gramatura       = COALESCE($6, gramatura),
       valor_total     = COALESCE($7, valor_total),
       updated_at      = NOW()
     WHERE id=$8 RETURNING *`,
    [tipo_entrada, numero_controle, fornecedor, data_entrada, tipo_malha, gramatura, valor_total, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Entrada não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM entradas_malha WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Entrada não encontrada' });
  return res.status(204).send();
}

async function adicionarCor(req, res) {
  const { nome_cor, hex_cor, kg_malha, preco_kg_malha, kg_ribana, preco_kg_ribana, lote } = req.body;
  if (!nome_cor) return res.status(400).json({ error: 'nome_cor é obrigatório' });

  const { rows } = await db.query(
    `INSERT INTO cores_entrada (entrada_id, nome_cor, hex_cor, kg_malha, preco_kg_malha, kg_ribana, preco_kg_ribana, lote)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, nome_cor, hex_cor, kg_malha || 0, preco_kg_malha || 0, kg_ribana || 0, preco_kg_ribana || 0, lote]
  );
  return res.status(201).json(rows[0]);
}

async function removerCor(req, res) {
  const { rowCount } = await db.query(
    'DELETE FROM cores_entrada WHERE id=$1 AND entrada_id=$2',
    [req.params.corId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Cor não encontrada' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover, adicionarCor, removerCor };
