// ============================================================
// MODULE: AUTH
// SERVICE: auth.service
// Logique métier : login, refresh, logout, tokens JWT
// ============================================================

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const authRepo = require('./auth.repository');
const { logAction } = require('../../shared/middleware/auditLogger');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SALT_ROUNDS,
} = require('../../config/env');

// Durée de vie du refresh token : 7 jours
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// #REGION token-generation

/**
 * Génère un access token JWT (courte durée : 15 min).
 * Le payload embarque le rôle pour éviter un aller-retour BDD
 * à chaque requête protégée.
 */
const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub:    user.id,
      email:  user.email,
      role:   user.role,
      nom:    user.nom,
      prenom: user.prenom,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

/**
 * Génère un refresh token opaque (64 bytes hex).
 * Stocké hashé en base, échangé contre un nouvel access token.
 */
const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// #ENDREGION token-generation

// #REGION auth-operations

/**
 * Authentifie un utilisateur.
 * Retourne accessToken + refreshToken + user public.
 * Journalise succès et échecs (sans détail du mot de passe).
 */
const login = async (email, password, ipAddress) => {
  const user = await authRepo.findByEmail(email);

  // Même délai si l'utilisateur n'existe pas → protection timing attack
  const dummyHash = '$2a$12$invalidhashfortimingatk000000000000000000000000000';
  const passwordToCheck = user ? user.passwordHash : dummyHash;
  const isValid = await bcrypt.compare(password, passwordToCheck);

  if (!user || !isValid) {
    await logAction({
      action:     'LOGIN_ECHEC',
      module:     'AUTH',
      userId:     user?.id ?? null,
      valeurApres: { email, raison: !user ? 'utilisateur_inexistant' : 'mot_de_passe_incorrect' },
      ipAddress,
    });
    throw new Error('Identifiants invalides');
  }

  if (!user.actif) {
    await logAction({ action: 'LOGIN_ECHEC', module: 'AUTH', userId: user.id, valeurApres: { raison: 'compte_inactif' }, ipAddress });
    throw new Error('Ce compte est désactivé. Contactez l\'administrateur.');
  }

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepo.saveRefreshToken(user.id, refreshToken, expiresAt);
  await logAction({ action: 'LOGIN_SUCCES', module: 'AUTH', userId: user.id, ipAddress });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role },
  };
};

/**
 * Échange un refresh token contre de nouveaux tokens (rotation).
 * L'ancien token est invalidé immédiatement (prévient le rejeu).
 */
const refresh = async (refreshToken) => {
  const stored = await authRepo.findRefreshToken(refreshToken);

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await authRepo.deleteRefreshToken(refreshToken);
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const { user } = stored;
  if (!user.actif) {
    await authRepo.deleteRefreshToken(refreshToken);
    throw new Error('Compte désactivé');
  }

  const newAccessToken  = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const expiresAt       = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Rotation : supprime l'ancien, crée le nouveau
  await authRepo.deleteRefreshToken(refreshToken);
  await authRepo.saveRefreshToken(user.id, newRefreshToken, expiresAt);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Déconnecte : invalide le refresh token et journalise.
 */
const logout = async (refreshToken, userId) => {
  if (refreshToken) {
    await authRepo.deleteRefreshToken(refreshToken).catch(() => {
      // Token déjà supprimé ou invalide — pas bloquant
    });
  }
  if (userId) {
    await logAction({ action: 'LOGOUT', module: 'AUTH', userId });
  }
};

// #ENDREGION auth-operations

module.exports = {
  login,
  refresh,
  logout,
  hashPassword,
  verifyAccessToken,
};
