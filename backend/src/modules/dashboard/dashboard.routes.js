// ============================================================
// MODULE: DASHBOARD
// CONTROLLER + ROUTES
// ============================================================

const svc    = require('./dashboard.service');
const router = require('express').Router();
const { authenticate, authorize } = require('../../shared/middleware/roleGuard');

// ============================================================
// #REGION controller
// ============================================================

/**
 * GET /api/dashboard
 * Réponse adaptée au rôle de l'utilisateur connecté.
 */
const getDashboard = async (req, res) => {
  try {
    const { role, sub: userId } = req.user;

    if (role === 'PRODUCTION') {
      const data = await svc.getKpisProduction(userId);
      return res.json({ role: 'PRODUCTION', ...data });
    }

    // ADMIN + MAINTENANCE
    const [kpisGlobaux, taches, alertes] = await Promise.all([
      svc.getKpisGlobaux(),
      svc.getTachesAujourdhui(userId),
      svc.getAlertes(),
    ]);

    res.json({
      role: role,
      ...kpisGlobaux,
      tachesAujourdhui: taches,
      alertes,
    });
  } catch (err) {
    console.error('[DASHBOARD]', err);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord' });
  }
};

/**
 * GET /api/dashboard/alertes
 * Alertes critiques uniquement (polling léger).
 */
const getAlertes = async (req, res) => {
  try {
    const alertes = await svc.getAlertes();
    res.json(alertes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// #REGION routes
// ============================================================

router.get('/',        authenticate, authorize('ADMIN', 'MAINTENANCE', 'PRODUCTION'), getDashboard);
router.get('/alertes', authenticate, authorize('ADMIN', 'MAINTENANCE'), getAlertes);

module.exports = router;
