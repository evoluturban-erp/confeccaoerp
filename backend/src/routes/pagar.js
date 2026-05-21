const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/pagarController');

router.use(auth);
router.get('/categorias',   c.categorias);
router.get('/',             c.listar);
router.get('/:id',          c.buscar);
router.post('/',            c.criar);
router.put('/:id',          c.atualizar);
router.delete('/:id',       c.remover);
router.patch('/:id/baixar', c.baixar);

module.exports = router;
