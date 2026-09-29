// ============================================================
// MODULE: EQUIPEMENTS
// ROUTE: /api/equipements
// Lecture : ADMIN + MAINTENANCE
// Écriture (CRUD) : ADMIN + codeConfirm
// ============================================================

const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('./equipements.controller');
const { adminOnly, maintenanceAndAbove } = require('../../shared/middleware/roleGuard');
const { requireConfirmCode }             = require('../../shared/middleware/codeConfirm');
const { UPLOADS_DIR }                    = require('../../config/env');

// Config multer — upload photo machine (tmp avant déplacement par le service)
const upload = multer({
  dest: path.join(UPLOADS_DIR, 'tmp'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// #REGION lecture

router.get('/tree',                      ...maintenanceAndAbove, ctrl.getTree);
router.get('/machines',                  ...maintenanceAndAbove, ctrl.getMachines);
router.get('/ateliers',                  ...maintenanceAndAbove, ctrl.getAteliers);
router.get('/ateliers/:id',              ...maintenanceAndAbove, ctrl.getAtelierById);
router.get('/ateliers/:id/historique',   ...maintenanceAndAbove, ctrl.getAtelierHistorique);
router.get('/machines/:id',              ...maintenanceAndAbove, ctrl.getMachineById);
router.get('/machines/:id/interventions',...maintenanceAndAbove, ctrl.getMachineInterventions);

// #ENDREGION lecture

// #REGION ecriture-ateliers (ADMIN + code de confirmation)

router.post  ('/ateliers',          ...adminOnly, requireConfirmCode, ctrl.createAtelier);
router.patch ('/ateliers/:id',      ...adminOnly, requireConfirmCode, ctrl.updateAtelier);
router.delete('/ateliers/:id',      ...adminOnly, requireConfirmCode, ctrl.archiveAtelier);
router.patch ('/ateliers/:id/restore',...adminOnly, requireConfirmCode, ctrl.restoreAtelier);

// #ENDREGION ecriture-ateliers

// #REGION ecriture-machines (ADMIN + code de confirmation)

router.post  ('/machines',              ...adminOnly, requireConfirmCode, ctrl.createMachine);
router.patch ('/machines/:id',          ...adminOnly, requireConfirmCode, ctrl.updateMachine);
router.delete('/machines/:id',          ...adminOnly, requireConfirmCode, ctrl.archiveMachine);
router.patch ('/machines/:id/restore',  ...adminOnly, requireConfirmCode, ctrl.restoreMachine);
router.post  ('/machines/:id/photo',    ...adminOnly, requireConfirmCode, upload.single('photo'), ctrl.uploadPhoto);

// #ENDREGION ecriture-machines

// #REGION elements (ADMIN + MAINTENANCE peuvent gérer les éléments)

router.post  ('/machines/:machineId/elements', ...maintenanceAndAbove, ctrl.addElement);
router.patch ('/elements/:id',                 ...maintenanceAndAbove, ctrl.updateElement);
router.delete('/elements/:id',                 ...adminOnly, requireConfirmCode, ctrl.deleteElement);

// #ENDREGION elements

module.exports = router;
