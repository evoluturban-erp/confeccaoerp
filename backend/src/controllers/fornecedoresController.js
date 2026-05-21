const db = require('../db');

// ── Fornecedores ─────────────────────────────────────────────────────────────

async function listar(req, res) {
  const { setor, status } = req.query;
  let sql = 'SELECT * FROM fornecedores_servico WHERE 1=1';
  const params = [];
  if (setor)  { params.push(setor);  sql += ` AND setor = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  sql += ' ORDER BY nome';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query('SELECT * FROM fornecedores_servico WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Fornecedor não encontrado' });

  const { rows: servicos } = await db.query(
    'SELECT * FROM servicos_fornecedor WHERE fornecedor_id=$1 ORDER BY nome',
    [req.params.id]
  );
  return res.json({ ...rows[0], servicos });
}

async function criar(req, res) {
  const { nome, setor, contato, telefone, cidade } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  const { rows } = await db.query(
    `INSERT INTO fornecedores_servico (nome, setor, contato, telefone, cidade, status)
     VALUES ($1,$2,$3,$4,$5,'ativo') RETURNING *`,
    [nome, setor, contato, telefone, cidade]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { nome, setor, contato, telefone, cidade, status } = req.body;
  const { rows } = await db.query(
    `UPDATE fornecedores_servico SET
       nome      = COALESCE($1, nome),
       setor     = COALESCE($2, setor),
       contato   = COALESCE($3, contato),
       telefone  = COALESCE($4, telefone),
       cidade    = COALESCE($5, cidade),
       status    = COALESCE($6, status),
       updated_at= NOW()
     WHERE id=$7 RETURNING *`,
    [nome, setor, contato, telefone, cidade, status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM fornecedores_servico WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  return res.status(204).send();
}

// ── Serviços do fornecedor ────────────────────────────────────────────────────

async function listarServicos(req, res) {
  const { rows } = await db.query(
    'SELECT * FROM servicos_fornecedor WHERE fornecedor_id=$1 ORDER BY nome',
    [req.params.id]
  );
  return res.json(rows);
}

async function criarServico(req, res) {
  const { nome, valor, unidade_cobranca } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  const { rows } = await db.query(
    `INSERT INTO servicos_fornecedor (fornecedor_id, nome, valor, unidade_cobranca)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, nome, valor || 0, unidade_cobranca]
  );
  return res.status(201).json(rows[0]);
}

async function atualizarServico(req, res) {
  const { nome, valor, unidade_cobranca } = req.body;
  const { rows } = await db.query(
    `UPDATE servicos_fornecedor SET
       nome             = COALESCE($1, nome),
       valor            = COALESCE($2, valor),
       unidade_cobranca = COALESCE($3, unidade_cobranca),
       updated_at       = NOW()
     WHERE id=$4 AND fornecedor_id=$5 RETURNING *`,
    [nome, valor, unidade_cobranca, req.params.servicoId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Serviço não encontrado' });
  return res.json(rows[0]);
}

async function removerServico(req, res) {
  const { rowCount } = await db.query(
    'DELETE FROM servicos_fornecedor WHERE id=$1 AND fornecedor_id=$2',
    [req.params.servicoId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Serviço não encontrado' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover, listarServicos, criarServico, atualizarServico, removerServico };
