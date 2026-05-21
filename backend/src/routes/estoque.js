const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/estoqueController');

router.use(auth);
router.get('/alertas',              c.alertasMinimo);
router.get('/movimentacoes',        c.listarMovimentacoes);
router.post('/movimentacoes',       c.registrarMovimentacao);
router.get('/',                     c.listarMateriais);
router.get('/:id',                  c.buscarMaterial);
router.post('/',                    c.criarMaterial);
router.put('/:id',                  c.atualizarMaterial);
router.delete('/:id',               c.removerMaterial);

module.exports = router;
