// ============================================================
// MODULE: AUTH
// MIDDLEWARE: roleGuard
// Authentification JWT et contrôle d'accès par rôle.
//
// Usage :
//   router.get('/route', authenticate, handler)
//   router.post('/route', ...adminOnly, handler)
//   router.delete('/route', ...maintenanceAndAbove, handler)
//   router.get('/route', ...allRoles, handler)
// ============================================================

const authService = require('../../modules/auth/auth.service');

// #REGION authenticate

/**
 * Vérifie le JWT dans l'en-tête Authorization: Bearer <token>.
 * Attache req.user = payload décodé si valide.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification manquant' });
  }

  try {
    req.user = authService.verifyAccessToken(header.slice(7));
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Token invalide';
    res.status(401).json({ error: message });
  }
};

// #ENDREGION authenticate

// #REGION authorize

/**
 * Vérifie que req.user.role est dans la liste des rôles autorisés.
 * À utiliser après authenticate.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Accès réservé aux profils : ${roles.join(', ')}. Votre profil : ${req.user.role}`,
    });
  }
  next();
};

// #ENDREGION authorize

// #REGION role-shortcuts

/**
 * Raccourcis sémantiques — à utiliser avec le spread operator :
 *   router.post('/fondateurs', ...adminOnly, handler)
 */
const adminOnly           = [authenticate, authorize('ADMIN')];
const maintenanceAndAbove = [authenticate, authorize('ADMIN', 'MAINTENANCE')];
const allRoles            = [authenticate, authorize('ADMIN', 'MAINTENANCE', 'PRODUCTION')];

// #ENDREGION role-shortcuts

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  maintenanceAndAbove,
  allRoles,
};
