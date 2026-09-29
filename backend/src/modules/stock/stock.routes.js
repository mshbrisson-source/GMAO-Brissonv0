// ============================================================
// MODULE: STOCK
// ROUTE: /api/stock
// Lecture : ADMIN + MAINTENANCE
// Écriture : ADMIN + MAINTENANCE (avec codeConfirm pour les données fondatrices)
// ============================================================

const router = require('express').Router();
const ctrl   = require('./stock.controller');
const { maintenanceAndAbove, adminOnly } = require('../../shared/middleware/roleGuard');
const { requireConfirmCode }             = require('../../shared/middleware/codeConfirm');

// #REGION fournisseurs

router.get   ('/fournisseurs',      ...maintenanceAndAbove, ctrl.getFournisseurs);
router.get   ('/fournisseurs/:id',  ...maintenanceAndAbove, ctrl.getFournisseurById);
router.post  ('/fournisseurs',      ...adminOnly, requireConfirmCode, ctrl.createFournisseur);
router.patch ('/fournisseurs/:id',  ...adminOnly, requireConfirmCode, ctrl.updateFournisseur);
router.delete('/fournisseurs/:id',  ...adminOnly, requireConfirmCode, ctrl.deleteFournisseur);

// #ENDREGION fournisseurs

// #REGION pieces

router.get   ('/pieces',                          ...maintenanceAndAbove, ctrl.getPieces);
router.get   ('/pieces/alertes',                  ...maintenanceAndAbove, ctrl.getPiecesAlerte);
router.get   ('/pieces/:id',                      ...maintenanceAndAbove, ctrl.getPieceById);
router.post  ('/pieces',                          ...adminOnly, requireConfirmCode, ctrl.createPiece);
router.patch ('/pieces/:id',                      ...adminOnly, requireConfirmCode, ctrl.updatePiece);
router.post  ('/pieces/:id/machines',             ...maintenanceAndAbove, ctrl.linkMachine);
router.delete('/pieces/:id/machines/:machineId',  ...adminOnly, requireConfirmCode, ctrl.unlinkMachine);

// #ENDREGION pieces

// #REGION mouvements

router.get ('/mouvements', ...maintenanceAndAbove, ctrl.getMouvements);
router.post('/mouvements/entree', ...maintenanceAndAbove, ctrl.entreeStock);
router.post('/mouvements/sortie', ...maintenanceAndAbove, ctrl.sortieStock);

// #ENDREGION mouvements

// #REGION bon-commande

router.post('/bon-commande/preview', ...maintenanceAndAbove, ctrl.previewBonCommande);
router.post('/bon-commande/pdf',     ...maintenanceAndAbove, ctrl.downloadBonCommande);

// #ENDREGION bon-commande

module.exports = router;
