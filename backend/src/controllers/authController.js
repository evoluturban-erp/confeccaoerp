const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

async function login(req, res) {
  try {
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({ error: 'Login e senha são obrigatórios' });
    }

    const { rows } = await db.query(
      'SELECT id, nome, login, senha_hash, perfil, setores, status FROM usuarios WHERE login = $1',
      [login]
    );

    const usuario = rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (usuario.status !== 'ativo') {
      return res.status(403).json({ error: 'Usuário inativo' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perfil: usuario.perfil,
      setores: usuario.setores,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({ token, usuario: payload });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function register(req, res) {
  try {
    const { nome, login, senha, perfil, setores } = req.body;

    if (!nome || !login || !senha || !perfil) {
      return res.status(400).json({ error: 'nome, login, senha e perfil são obrigatórios' });
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM usuarios WHERE login = $1',
      [login]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Login já está em uso' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, login, senha_hash, perfil, setores, status)
       VALUES ($1, $2, $3, $4, $5, 'ativo')
       RETURNING id, nome, login, perfil, setores, status, created_at`,
      [nome, login, senha_hash, perfil, JSON.stringify(setores || [])]
    );

    return res.status(201).json({ usuario: rows[0] });
  } catch (err) {
    console.error('Erro no register:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function me(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, login, perfil, setores, status, created_at FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({ usuario: rows[0] });
  } catch (err) {
    console.error('Erro no me:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

function logout(req, res) {
  // JWT é stateless — o cliente descarta o token; aqui apenas confirmamos
  return res.json({ message: 'Logout realizado com sucesso' });
}

module.exports = { login, register, me, logout };
