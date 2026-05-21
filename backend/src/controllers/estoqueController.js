const db = require('../db');

// ── Materiais ────────────────────────────────────────────────────────────────

async function listarMateriais(req, res) {
  const { categoria, alerta } = req.query;
  let sql = 'SELECT * FROM estoque_materiais WHERE 1=1';
  const params = [];

  if (categoria) { params.push(categoria); sql += ` AND categoria = $${params.length}`; }
  if (alerta === 'true') sql += ' AND quantidade_atual <= quantidade_minima';

  sql += ' ORDER BY nome';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscarMaterial(req, res) {
  const { rows } = await db.query('SELECT * FROM estoque_materiais WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Material não encontrado' });
  return res.json(rows[0]);
}

async function criarMaterial(req, res) {
  const { codigo, nome, categoria, unidade, quantidade_atual, quantidade_minima, custo_unitario, fornecedor } = req.body;
  if (!codigo || !nome) return res.status(400).json({ error: 'codigo e nome são obrigatórios' });

  const { rows } = await db.query(
    `INSERT INTO estoque_materiais (codigo, nome, categoria, unidade, quantidade_atual, quantidade_minima, custo_unitario, fornecedor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [codigo, nome, categoria, unidade, quantidade_atual || 0, quantidade_minima || 0, custo_unitario || 0, fornecedor]
  );
  return res.status(201).json(rows[0]);
}

async function atualizarMaterial(req, res) {
  const { codigo, nome, categoria, unidade, quantidade_minima, custo_unitario, fornecedor } = req.body;
  const { rows } = await db.query(
    `UPDATE estoque_materiais SET
       codigo           = COALESCE($1, codigo),
       nome             = COALESCE($2, nome),
       categoria        = COALESCE($3, categoria),
       unidade          = COALESCE($4, unidade),
       quantidade_minima= COALESCE($5, quantidade_minima),
       custo_unitario   = COALESCE($6, custo_unitario),
       fornecedor       = COALESCE($7, fornecedor),
       updated_at       = NOW()
     WHERE id=$8 RETURNING *`,
    [codigo, nome, categoria, unidade, quantidade_minima, custo_unitario, fornecedor, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Material não encontrado' });
  return res.json(rows[0]);
}

async function removerMaterial(req, res) {
  const { rowCount } = await db.query('DELETE FROM estoque_materiais WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Material não encontrado' });
  return res.status(204).send();
}

// ── Movimentações ────────────────────────────────────────────────────────────

async function listarMovimentacoes(req, res) {
  const { material_id, tipo } = req.query;
  let sql = `
    SELECT m.*, e.nome AS material_nome, e.unidade
    FROM movimentacoes_estoque m
    JOIN estoque_materiais e ON e.id = m.material_id
    WHERE 1=1`;
  const params = [];

  if (material_id) { params.push(material_id); sql += ` AND m.material_id = $${params.length}`; }
  if (tipo)        { params.push(tipo);         sql += ` AND m.tipo = $${params.length}`; }

  sql += ' ORDER BY m.data DESC LIMIT 200';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function registrarMovimentacao(req, res) {
  const { material_id, tipo, quantidade, op_id, observacao } = req.body;
  if (!material_id || !tipo || quantidade === undefined)
    return res.status(400).json({ error: 'material_id, tipo e quantidade são obrigatórios' });

  if (!['entrada', 'saida', 'ajuste'].includes(tipo))
    return res.status(400).json({ error: 'tipo deve ser: entrada, saida ou ajuste' });

  const { rows: mat } = await db.query('SELECT * FROM estoque_materiais WHERE id=$1', [material_id]);
  if (!mat[0]) return res.status(404).json({ error: 'Material não encontrado' });

  const delta = tipo === 'saida' ? -Math.abs(quantidade) : Math.abs(quantidade);
  const novaQtd = parseFloat(mat[0].quantidade_atual) + delta;

  if (novaQtd < 0) return res.status(400).json({ error: 'Quantidade em estoque insuficiente' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, op_id, observacao)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [material_id, tipo, Math.abs(quantidade), op_id, observacao]
    );
    await client.query(
      'UPDATE estoque_materiais SET quantidade_atual=$1, updated_at=NOW() WHERE id=$2',
      [novaQtd, material_id]
    );
    await client.query('COMMIT');

    const alerta = novaQtd <= parseFloat(mat[0].quantidade_minima);
    return res.status(201).json({ movimentacao: rows[0], quantidade_atual: novaQtd, alerta_minimo: alerta });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function alertasMinimo(req, res) {
  const { rows } = await db.query(
    `SELECT * FROM estoque_materiais
     WHERE quantidade_atual <= quantidade_minima
     ORDER BY (quantidade_atual - quantidade_minima) ASC`
  );
  return res.json(rows);
}

module.exports = { listarMateriais, buscarMaterial, criarMaterial, atualizarMaterial, removerMaterial, listarMovimentacoes, registrarMovimentacao, alertasMinimo };
