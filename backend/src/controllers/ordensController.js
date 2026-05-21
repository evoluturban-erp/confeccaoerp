const db = require('../db');

const FASES = ['Cadastrada', 'Corte', 'Costura', 'Acabamento', 'Revisão', 'Expedição', 'Concluída'];

async function listar(req, res) {
  const { status, cliente_id, prioridade } = req.query;
  let sql = `
    SELECT op.*, c.razao_social AS cliente_nome
    FROM ordens_producao op
    LEFT JOIN clientes c ON c.id = op.cliente_id
    WHERE 1=1`;
  const params = [];

  if (status)     { params.push(status);     sql += ` AND op.status = $${params.length}`; }
  if (cliente_id) { params.push(cliente_id); sql += ` AND op.cliente_id = $${params.length}`; }
  if (prioridade) { params.push(prioridade); sql += ` AND op.prioridade = $${params.length}`; }

  sql += ' ORDER BY op.created_at DESC';
  const { rows } = await db.query(sql, params);
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query(
    `SELECT op.*, c.razao_social AS cliente_nome
     FROM ordens_producao op
     LEFT JOIN clientes c ON c.id = op.cliente_id
     WHERE op.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ordem não encontrada' });

  const { rows: refs } = await db.query(
    'SELECT * FROM referencias_op WHERE op_id = $1 ORDER BY id',
    [req.params.id]
  );
  return res.json({ ...rows[0], referencias: refs });
}

async function criar(req, res) {
  const { numero, cliente_id, prioridade, data_entrega, observacoes, referencias } = req.body;
  if (!numero) return res.status(400).json({ error: 'numero é obrigatório' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO ordens_producao (numero, cliente_id, status, fase_atual, prioridade, data_entrega, observacoes)
       VALUES ($1,$2,'Aberta',$3,$4,$5,$6) RETURNING *`,
      [numero, cliente_id, FASES[0], prioridade || 'Normal', data_entrega, observacoes]
    );
    const op = rows[0];

    const refs = [];
    for (const ref of (referencias || [])) {
      const { rows: r } = await client.query(
        `INSERT INTO referencias_op (op_id, codigo, nome, cores, grade_json)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [op.id, ref.codigo, ref.nome, JSON.stringify(ref.cores || []), JSON.stringify(ref.grade_json || {})]
      );
      refs.push(r[0]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ ...op, referencias: refs });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const { cliente_id, prioridade, data_entrega, observacoes, status } = req.body;
  const { rows } = await db.query(
    `UPDATE ordens_producao SET
       cliente_id   = COALESCE($1, cliente_id),
       prioridade   = COALESCE($2, prioridade),
       data_entrega = COALESCE($3, data_entrega),
       observacoes  = COALESCE($4, observacoes),
       status       = COALESCE($5, status),
       updated_at   = NOW()
     WHERE id = $6 RETURNING *`,
    [cliente_id, prioridade, data_entrega, observacoes, status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ordem não encontrada' });
  return res.json(rows[0]);
}

async function remover(req, res) {
  const { rowCount } = await db.query('DELETE FROM ordens_producao WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Ordem não encontrada' });
  return res.status(204).send();
}

async function avancarFase(req, res) {
  const { rows } = await db.query('SELECT * FROM ordens_producao WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Ordem não encontrada' });

  const op = rows[0];
  const idx = FASES.indexOf(op.fase_atual);

  if (idx === -1 || idx === FASES.length - 1)
    return res.status(400).json({ error: 'Ordem já está na fase final ou em estado inválido' });

  const novaFase = FASES[idx + 1];
  const novoStatus = novaFase === 'Concluída' ? 'Concluída' : 'Em andamento';

  const { rows: upd } = await db.query(
    `UPDATE ordens_producao SET fase_atual=$1, status=$2, updated_at=NOW()
     WHERE id=$3 RETURNING *`,
    [novaFase, novoStatus, op.id]
  );

  req.app.get('io').emit('op:fase_atualizada', { op_id: op.id, fase: novaFase, status: novoStatus });
  return res.json(upd[0]);
}

async function listarReferencias(req, res) {
  const { rows } = await db.query(
    'SELECT * FROM referencias_op WHERE op_id = $1 ORDER BY id',
    [req.params.id]
  );
  return res.json(rows);
}

async function salvarReferencia(req, res) {
  const { codigo, nome, cores, grade_json } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  const { rows } = await db.query(
    `INSERT INTO referencias_op (op_id, codigo, nome, cores, grade_json)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, codigo, nome, JSON.stringify(cores || []), JSON.stringify(grade_json || {})]
  );
  return res.status(201).json(rows[0]);
}

async function atualizarReferencia(req, res) {
  const { codigo, nome, cores, grade_json } = req.body;
  const { rows } = await db.query(
    `UPDATE referencias_op SET
       codigo     = COALESCE($1, codigo),
       nome       = COALESCE($2, nome),
       cores      = COALESCE($3, cores),
       grade_json = COALESCE($4, grade_json),
       updated_at = NOW()
     WHERE id=$5 AND op_id=$6 RETURNING *`,
    [codigo, nome, cores ? JSON.stringify(cores) : null, grade_json ? JSON.stringify(grade_json) : null, req.params.refId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Referência não encontrada' });
  return res.json(rows[0]);
}

async function removerReferencia(req, res) {
  const { rowCount } = await db.query(
    'DELETE FROM referencias_op WHERE id=$1 AND op_id=$2',
    [req.params.refId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Referência não encontrada' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover, avancarFase, listarReferencias, salvarReferencia, atualizarReferencia, removerReferencia };
