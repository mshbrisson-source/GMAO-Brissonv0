// ============================================================
// MODULE: ADMIN
// SERVICE: users.service
// Gestion des utilisateurs — CRUD réservé à l'Administrateur.
// Révoque les sessions actives lors de la désactivation ou du reset mdp.
// ============================================================

const authRepo    = require('../auth/auth.repository');
const { hashPassword } = require('../auth/auth.service');
const { logAction }    = require('../../shared/middleware/auditLogger');

// #REGION read

const getAll  = () => authRepo.findAll();
const getById = (id) => authRepo.findById(id);

// #ENDREGION read

// #REGION write

/**
 * Crée un nouvel utilisateur.
 * Vérifie l'unicité de l'email, hache le mot de passe, journalise.
 */
const create = async ({ email, nom, prenom, role, password }, adminId) => {
  const normalized = email.toLowerCase().trim();
  const existing   = await authRepo.findByEmail(normalized);

  if (existing) throw new Error(`L'adresse ${normalized} est déjà utilisée.`);

  const passwordHash = await hashPassword(password);
  const user = await authRepo.create({ email: normalized, nom, prenom, role, passwordHash });

  await logAction({
    action:      'USER_CREATED',
    module:      'ADMIN',
    userId:      adminId,
    entiteType:  'user',
    entiteId:    user.id,
    valeurApres: { email: normalized, role },
  });

  const { passwordHash: _, ...safe } = user;
  return safe;
};

/**
 * Met à jour les informations d'un utilisateur (pas le mot de passe).
 */
const update = async (id, data, adminId) => {
  // Sécurité : on retire les champs sensibles même s'ils sont passés
  const { password, passwordHash, id: _id, ...safeData } = data;

  const before = await authRepo.findById(id);
  if (!before) throw new Error('Utilisateur introuvable');

  const updated = await authRepo.update(id, safeData);

  await logAction({
    action:      'USER_UPDATED',
    module:      'ADMIN',
    userId:      adminId,
    entiteType:  'user',
    entiteId:    id,
    valeurAvant: before,
    valeurApres: safeData,
  });

  const { passwordHash: _, ...result } = updated;
  return result;
};

/**
 * Active ou désactive un compte.
 * Si désactivé : révoque toutes les sessions actives.
 */
const toggleActif = async (id, adminId) => {
  const user = await authRepo.findById(id);
  if (!user) throw new Error('Utilisateur introuvable');

  const updated = await authRepo.update(id, { actif: !user.actif });

  if (!updated.actif) {
    // Déconnexion forcée de toutes les sessions
    await authRepo.deleteUserRefreshTokens(id);
  }

  await logAction({
    action:      updated.actif ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    module:      'ADMIN',
    userId:      adminId,
    entiteType:  'user',
    entiteId:    id,
    valeurAvant: { actif: user.actif },
    valeurApres: { actif: updated.actif },
  });

  const { passwordHash: _, ...result } = updated;
  return result;
};

/**
 * Réinitialise le mot de passe d'un utilisateur.
 * Révoque toutes ses sessions actives.
 */
const resetPassword = async (id, newPassword, adminId) => {
  const user = await authRepo.findById(id);
  if (!user) throw new Error('Utilisateur introuvable');

  const passwordHash = await hashPassword(newPassword);
  await authRepo.update(id, { passwordHash });
  await authRepo.deleteUserRefreshTokens(id);

  await logAction({
    action:     'USER_PASSWORD_RESET',
    module:     'ADMIN',
    userId:     adminId,
    entiteType: 'user',
    entiteId:   id,
  });
};

// #ENDREGION write

module.exports = { getAll, getById, create, update, toggleActif, resetPassword };
