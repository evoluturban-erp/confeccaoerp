const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/entradasMalhaController');

router.use(auth);
router.get('/',                      c.listar);
router.get('/:id',                   c.buscar);
router.post('/',                     c.criar);
router.put('/:id',                   c.atualizar);
router.delete('/:id',                c.remover);
router.post('/:id/cores',            c.adicionarCor);
router.delete('/:id/cores/:corId',   c.removerCor);

module.exports = router;
