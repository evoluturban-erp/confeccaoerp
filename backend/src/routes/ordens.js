const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/ordensController');

router.use(auth);
router.get('/',                          c.listar);
router.get('/:id',                       c.buscar);
router.post('/',                         c.criar);
router.put('/:id',                       c.atualizar);
router.delete('/:id',                    c.remover);
router.post('/:id/avancar-fase',         c.avancarFase);
router.get('/:id/referencias',           c.listarReferencias);
router.post('/:id/referencias',          c.salvarReferencia);
router.put('/:id/referencias/:refId',    c.atualizarReferencia);
router.delete('/:id/referencias/:refId', c.removerReferencia);

module.exports = router;
