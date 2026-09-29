// ============================================================
// MODULE: DOCUMENTS
// ROUTE: /api/documents
// ============================================================

const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const ctrl   = require('./documents.controller');
const { maintenanceAndAbove, allRoles } = require('../../shared/middleware/roleGuard');
const { UPLOADS_DIR, MAX_FILE_SIZE_MB } = require('../../config/env');
const { ALLOWED_MIMES } = require('./documents.service');

// Config multer — stockage temporaire avant déplacement par le service
const upload = multer({
  dest:    path.join(UPLOADS_DIR, 'tmp'),
  limits:  { fileSize: (MAX_FILE_SIZE_MB || 20) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIMES.includes(file.mimetype));
  },
});

// #REGION lecture (tous rôles connectés)

router.get('/',                              ...allRoles, ctrl.getDocuments);
router.get('/:id',                           ...allRoles, ctrl.getDocumentById);
router.get('/groupe/:groupId/versions',      ...allRoles, ctrl.getVersionHistory);

// #ENDREGION lecture

// #REGION streaming fichier (tous rôles connectés)

router.get('/:id/view',     ...allRoles, ctrl.viewFile);
router.get('/:id/download', ...allRoles, ctrl.downloadFile);

// #ENDREGION streaming

// #REGION écriture (ADMIN + MAINTENANCE)

router.post  ('/',                         ...maintenanceAndAbove, upload.single('fichier'), ctrl.createDocument);
router.post  ('/groupe/:groupId/versions', ...maintenanceAndAbove, upload.single('fichier'), ctrl.createNewVersion);
router.patch ('/versions/:id/restaurer',   ...maintenanceAndAbove, ctrl.restoreVersion);
router.delete('/groupe/:groupId',          ...maintenanceAndAbove, ctrl.deleteDocument);

// #ENDREGION écriture

module.exports = router;
