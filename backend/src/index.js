require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { executeMigrations } = require('./db/migrations');
const authRoutes        = require('./routes/auth');
const usuariosRoutes    = require('./routes/usuarios');
const clientesRoutes    = require('./routes/clientes');
const ordensRoutes      = require('./routes/ordens');
const estoqueRoutes     = require('./routes/estoque');
const entradasRoutes    = require('./routes/entradasMalha');
const fornecedoresRoutes= require('./routes/fornecedores');
const receberRoutes     = require('./routes/receber');
const pagarRoutes       = require('./routes/pagar');
const coletasRoutes     = require('./routes/coletas');
const qualidadeRoutes   = require('./routes/qualidade');
const relatoriosRoutes  = require('./routes/relatorios');

const app = express();
const server = http.createServer(app);

// origens permitidas: env var + produção Vercel + fallbacks para dev local
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://confeccaoerp.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // aceita qualquer subdomínio de vercel.app (previews de PR, branches etc.)
  if (/^https:\/\/[^.]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origin: ${origin}`));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    methods: ['GET', 'POST'],
  },
});

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',              authRoutes);
app.use('/api/usuarios',          usuariosRoutes);
app.use('/api/clientes',          clientesRoutes);
app.use('/api/ordens',            ordensRoutes);
app.use('/api/estoque',           estoqueRoutes);
app.use('/api/entradas-malha',    entradasRoutes);
app.use('/api/fornecedores',      fornecedoresRoutes);
app.use('/api/financeiro/receber', receberRoutes);
app.use('/api/financeiro/pagar',   pagarRoutes);
app.use('/api/coletas',           coletasRoutes);
app.use('/api/qualidade',         qualidadeRoutes);
app.use('/api/relatorios',        relatoriosRoutes);

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 3001;

executeMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao executar migrations:', err);
    process.exit(1);
  });

module.exports = { app, io };
