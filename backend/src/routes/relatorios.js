const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/relatoriosController');

router.use(auth);
router.get('/dre',              c.dre);
router.get('/fluxo-caixa',      c.fluxoCaixa);
router.get('/ranking-clientes', c.rankingClientes);
router.get('/resumo-ops',       c.resumoOPs);

module.exports = router;
