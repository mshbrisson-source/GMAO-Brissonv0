// ============================================================
// MODULE: AUTH
// MIDDLEWARE: auditLogger
// Journalisation des actions sensibles dans la table journal_actions.
// Ne bloque JAMAIS l'application si l'écriture échoue.
// ============================================================

const { prisma } = require('../../config/database');

// #REGION core-logger

/**
 * Enregistre une action dans journal_actions.
 * Appel asynchrone non-bloquant : on n'attend pas la résolution.
 *
 * @param {Object} params
 * @param {string}  params.action      - Code d'action ex: LOGIN_SUCCES, USER_CREATED
 * @param {string}  params.module      - Module concerné ex: AUTH, ADMIN, STOCK
 * @param {string}  [params.userId]    - UUID de l'auteur de l'action
 * @param {string}  [params.entiteType]- Type d'entité concernée ex: user, machine
 * @param {string}  [params.entiteId]  - UUID de l'entité concernée
 * @param {*}       [params.valeurAvant]
 * @param {*}       [params.valeurApres]
 * @param {string}  [params.ipAddress]
 */
const logAction = async ({
  action,
  module,
  userId     = null,
  entiteType = null,
  entiteId   = null,
  valeurAvant,
  valeurApres,
  ipAddress  = null,
}) => {
  try {
    await prisma.journalAction.create({
      data: {
        action,
        module,
        userId,
        entiteType,
        entiteId,
        valeurAvant: valeurAvant !== undefined ? valeurAvant : undefined,
        valeurApres: valeurApres !== undefined ? valeurApres : undefined,
        ipAddress,
      },
    });
  } catch (err) {
    // Journal non-critique : on logue en console mais on ne bloque pas
    console.error('[AUDIT] Échec journalisation :', action, err.message);
  }
};

// #ENDREGION core-logger

// #REGION express-middleware

/**
 * Middleware Express qui journalise automatiquement une action
 * si la réponse est un succès (status < 400).
 *
 * @example
 * router.post('/users', ...adminOnly, auditMiddleware('USER_CREATE_ATTEMPT', 'ADMIN'), controller.create)
 */
const auditMiddleware = (action, module) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode < 400) {
      // Sanitiser le corps : ne pas logger les mots de passe
      const { password, passwordHash, ...safeBody } = req.body || {};
      logAction({
        action,
        module,
        userId:     req.user?.sub,
        entiteType: req.params?.id ? 'record' : undefined,
        entiteId:   req.params?.id,
        valeurApres: safeBody,
        ipAddress:  req.ip,
      });
    }
    return originalJson(body);
  };

  next();
};

// #ENDREGION express-middleware

module.exports = { logAction, auditMiddleware };
