const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/fornecedoresController');

router.use(auth);
router.get('/',                             c.listar);
router.get('/:id',                          c.buscar);
router.post('/',                            c.criar);
router.put('/:id',                          c.atualizar);
router.delete('/:id',                       c.remover);
router.get('/:id/servicos',                 c.listarServicos);
router.post('/:id/servicos',                c.criarServico);
router.put('/:id/servicos/:servicoId',      c.atualizarServico);
router.delete('/:id/servicos/:servicoId',   c.removerServico);

module.exports = router;
