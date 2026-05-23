const bcrypt = require('bcryptjs');
const db = require('./index');

const migrations = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) NOT NULL,
    setores JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    fantasia VARCHAR(255),
    tipo VARCHAR(20) NOT NULL,
    documento VARCHAR(20),
    email VARCHAR(255),
    telefone VARCHAR(30),
    cidade VARCHAR(100),
    limite_credito NUMERIC(12,2) DEFAULT 0,
    forma_pagamento VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS ordens_producao (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    cliente_id INTEGER REFERENCES clientes(id),
    status VARCHAR(50) NOT NULL DEFAULT 'aberta',
    fase_atual VARCHAR(100),
    prioridade VARCHAR(20) DEFAULT 'normal',
    data_entrega DATE,
    observacoes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS referencias_op (
    id SERIAL PRIMARY KEY,
    op_id INTEGER NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
    codigo VARCHAR(100),
    nome VARCHAR(255) NOT NULL,
    cores JSONB DEFAULT '[]',
    grade_json JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS fornecedores_servico (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    setor VARCHAR(100),
    contato VARCHAR(255),
    telefone VARCHAR(30),
    cidade VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS servicos_fornecedor (
    id SERIAL PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores_servico(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    unidade_cobranca VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS entradas_malha (
    id SERIAL PRIMARY KEY,
    tipo_entrada VARCHAR(50) NOT NULL,
    numero_controle VARCHAR(100),
    fornecedor VARCHAR(255),
    data_entrada DATE NOT NULL,
    tipo_malha VARCHAR(100),
    gramatura NUMERIC(8,2),
    valor_total NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS cores_entrada (
    id SERIAL PRIMARY KEY,
    entrada_id INTEGER NOT NULL REFERENCES entradas_malha(id) ON DELETE CASCADE,
    nome_cor VARCHAR(100) NOT NULL,
    hex_cor VARCHAR(7),
    kg_malha NUMERIC(10,3) DEFAULT 0,
    preco_kg_malha NUMERIC(10,2) DEFAULT 0,
    kg_ribana NUMERIC(10,3) DEFAULT 0,
    preco_kg_ribana NUMERIC(10,2) DEFAULT 0,
    lote VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS estoque_materiais (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    unidade VARCHAR(30),
    quantidade_atual NUMERIC(12,3) DEFAULT 0,
    quantidade_minima NUMERIC(12,3) DEFAULT 0,
    custo_unitario NUMERIC(10,2) DEFAULT 0,
    fornecedor VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES estoque_materiais(id),
    tipo VARCHAR(20) NOT NULL,
    quantidade NUMERIC(12,3) NOT NULL,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    op_id INTEGER REFERENCES ordens_producao(id),
    observacao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS contas_receber (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    descricao TEXT,
    valor NUMERIC(12,2) NOT NULL,
    forma_pagamento VARCHAR(100),
    vencimento DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    op_id INTEGER REFERENCES ordens_producao(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS contas_pagar (
    id SERIAL PRIMARY KEY,
    fornecedor VARCHAR(255),
    categoria VARCHAR(100),
    descricao TEXT,
    valor NUMERIC(12,2) NOT NULL,
    forma_pagamento VARCHAR(100),
    vencimento DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    op_id INTEGER REFERENCES ordens_producao(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS coletas_transporte (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    op_id INTEGER REFERENCES ordens_producao(id),
    lote_codigo VARCHAR(100),
    tipo VARCHAR(50),
    origem VARCHAR(255),
    destino VARCHAR(255),
    quantidade_json JSONB DEFAULT '{}',
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    observacao TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS revisoes_qualidade (
    id SERIAL PRIMARY KEY,
    op_id INTEGER REFERENCES ordens_producao(id),
    faccao VARCHAR(255),
    revisora VARCHAR(255),
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    cores_json JSONB DEFAULT '[]',
    defeitos_json JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS op_sequencial (
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ano, mes)
  )`,

  `ALTER TABLE coletas_transporte
     ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'enviado',
     ADD COLUMN IF NOT EXISTS data_retorno_previsto DATE,
     ADD COLUMN IF NOT EXISTS divergencias_json JSONB DEFAULT '[]'`,
];

async function seedAdminUser() {
  const { rows } = await db.query("SELECT id FROM usuarios WHERE login = 'admin'");
  if (rows.length > 0) return;

  const senha_hash = await bcrypt.hash('admin123', 10);
  await db.query(
    `INSERT INTO usuarios (nome, login, senha_hash, perfil, setores, status)
     VALUES ('Administrador', 'admin', $1, 'Administrador', '[]', 'ativo')`,
    [senha_hash]
  );
  console.log('Usuário admin criado (login: admin / senha: admin123)');
}

async function executeMigrations() {
  console.log('Executando migrations...');
  for (const sql of migrations) {
    await db.query(sql);
  }
  await seedAdminUser();
  console.log('Migrations concluídas.');
}

module.exports = { executeMigrations };
