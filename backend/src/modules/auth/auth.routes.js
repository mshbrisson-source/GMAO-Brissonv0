// ============================================================
// MODULE: AUTH
// ROUTE: /api/auth
// ============================================================

const router     = require('express').Router();
const controller = require('./auth.controller');
const { authenticate } = require('../../shared/middleware/roleGuard');

// Routes publiques
router.post('/login',   controller.login);
router.post('/refresh', controller.refresh);

// Routes protégées (token requis)
router.post('/logout', authenticate, controller.logout);
router.get('/me',      authenticate, controller.me);

module.exports = router;
