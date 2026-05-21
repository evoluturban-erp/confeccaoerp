const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/qualidadeController');

router.use(auth);
router.get('/resumo-defeitos', c.resumoDefeitos);
router.get('/',       c.listar);
router.get('/:id',    c.buscar);
router.post('/',      c.criar);
router.put('/:id',    c.atualizar);
router.delete('/:id', c.remover);

module.exports = router;
