// ============================================================
// MODULE: ADMIN
// ROUTE: /api/admin/users
// Toutes les routes sont protégées par adminOnly.
// ============================================================

const router     = require('express').Router();
const controller = require('./users.controller');
const { adminOnly }        = require('../../shared/middleware/roleGuard');
const { auditMiddleware }  = require('../../shared/middleware/auditLogger');

router.get  ('/',                    ...adminOnly, controller.getAll);
router.get  ('/:id',                 ...adminOnly, controller.getById);
router.post ('/',                    ...adminOnly, auditMiddleware('USER_CREATE_ATTEMPT', 'ADMIN'), controller.create);
router.patch('/:id',                 ...adminOnly, controller.update);
router.patch('/:id/actif',           ...adminOnly, controller.toggleActif);
router.patch('/:id/reset-password',  ...adminOnly, controller.resetPassword);

module.exports = router;
