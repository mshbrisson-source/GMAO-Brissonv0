// ============================================================
// MODULE: AUTH
// MIDDLEWARE: codeConfirm
// Protection des données fondatrices : exige un code de confirmation
// dans l'en-tête X-Admin-Code pour les actions sensibles ADMIN.
//
// Usage :
//   router.put('/eleves/:id', ...adminOnly, requireConfirmCode, handler)
//   router.delete('/machines/:id', ...adminOnly, requireConfirmCode, handler)
// ============================================================

const { ADMIN_CONFIRM_CODE } = require('../../config/env');
const { logAction }          = require('./auditLogger');

const requireConfirmCode = async (req, res, next) => {
  const code = req.headers['x-admin-code'];

  if (!code) {
    return res.status(403).json({
      error: 'Cette action requiert un code de confirmation administrateur.',
      hint:  'Fournissez le code dans l\'en-tête X-Admin-Code.',
    });
  }

  // Comparaison en temps constant pour éviter les timing attacks
  const expected = Buffer.from(ADMIN_CONFIRM_CODE);
  const received = Buffer.from(code);
  const valid    = expected.length === received.length &&
                   require('crypto').timingSafeEqual(expected, received);

  if (!valid) {
    await logAction({
      action:      'CODE_CONFIRM_ECHEC',
      module:      'ADMIN',
      userId:      req.user?.sub,
      ipAddress:   req.ip,
      valeurApres: { route: req.path, method: req.method },
    });
    return res.status(403).json({ error: 'Code de confirmation incorrect' });
  }

  await logAction({
    action:     'CODE_CONFIRM_SUCCES',
    module:     'ADMIN',
    userId:     req.user?.sub,
    ipAddress:  req.ip,
    valeurApres: { route: req.path, method: req.method },
  });

  next();
};

module.exports = { requireConfirmCode };
