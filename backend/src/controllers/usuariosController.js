const bcrypt = require('bcryptjs');
const db = require('../db');

async function listar(req, res) {
  const { rows } = await db.query(
    'SELECT id, nome, login, perfil, setores, status, created_at FROM usuarios ORDER BY nome'
  );
  return res.json(rows);
}

async function buscar(req, res) {
  const { rows } = await db.query(
    'SELECT id, nome, login, perfil, setores, status, created_at FROM usuarios WHERE id = $1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(rows[0]);
}

async function criar(req, res) {
  const { nome, login, senha, perfil, setores } = req.body;
  if (!nome || !login || !senha || !perfil)
    return res.status(400).json({ error: 'nome, login, senha e perfil são obrigatórios' });

  const { rows: ex } = await db.query('SELECT id FROM usuarios WHERE login = $1', [login]);
  if (ex.length) return res.status(409).json({ error: 'Login já está em uso' });

  const senha_hash = await bcrypt.hash(senha, 10);
  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, login, senha_hash, perfil, setores, status)
     VALUES ($1, $2, $3, $4, $5, 'ativo')
     RETURNING id, nome, login, perfil, setores, status, created_at`,
    [nome, login, senha_hash, perfil, JSON.stringify(setores || [])]
  );
  return res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { nome, login, senha, perfil, setores, status } = req.body;
  const { id } = req.params;

  const { rows: ex } = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
  if (!ex.length) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (login) {
    const { rows: dup } = await db.query(
      'SELECT id FROM usuarios WHERE login = $1 AND id <> $2', [login, id]
    );
    if (dup.length) return res.status(409).json({ error: 'Login já está em uso' });
  }

  let senha_hash;
  if (senha) senha_hash = await bcrypt.hash(senha, 10);

  const { rows } = await db.query(
    `UPDATE usuarios SET
       nome        = COALESCE($1, nome),
       login       = COALESCE($2, login),
       senha_hash  = COALESCE($3, senha_hash),
       perfil      = COALESCE($4, perfil),
       setores     = COALESCE($5, setores),
       status      = COALESCE($6, status),
       updated_at  = NOW()
     WHERE id = $7
     RETURNING id, nome, login, perfil, setores, status, updated_at`,
    [nome, login, senha_hash, perfil, setores ? JSON.stringify(setores) : null, status, id]
  );
  return res.json(rows[0]);
}

async function remover(req, res) {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Não é possível remover o próprio usuário' });

  const { rowCount } = await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover };
