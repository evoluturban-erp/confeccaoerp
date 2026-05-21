const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { login, register, me } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/me', authMiddleware, me);

module.exports = router;
