// ============================================================
// MODULE: AUTH
// REPOSITORY: auth.repository
// Couche d'accès aux données — requêtes Prisma uniquement
// Aucune logique métier ici.
// ============================================================

const { prisma } = require('../../config/database');

// Champs publics sans passwordHash
const PUBLIC_FIELDS = {
  id: true, email: true, nom: true, prenom: true,
  role: true, actif: true, createdAt: true,
};

// #REGION user-queries

const findByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

const findById = (id) =>
  prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });

const findByIdWithHash = (id) =>
  prisma.user.findUnique({ where: { id } });

const findAll = () =>
  prisma.user.findMany({
    select: PUBLIC_FIELDS,
    orderBy: [{ role: 'asc' }, { nom: 'asc' }],
  });

const create = (data) =>
  prisma.user.create({ data });

const update = (id, data) =>
  prisma.user.update({ where: { id }, data });

// #ENDREGION user-queries

// #REGION refresh-tokens

const saveRefreshToken = (userId, token, expiresAt) =>
  prisma.refreshToken.create({ data: { userId, token, expiresAt } });

const findRefreshToken = (token) =>
  prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

const deleteRefreshToken = (token) =>
  prisma.refreshToken.delete({ where: { token } });

// Révoque toutes les sessions d'un utilisateur (désactivation, reset mdp)
const deleteUserRefreshTokens = (userId) =>
  prisma.refreshToken.deleteMany({ where: { userId } });

// Nettoyage périodique des tokens expirés
const deleteExpiredTokens = () =>
  prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

// #ENDREGION refresh-tokens

module.exports = {
  findByEmail,
  findById,
  findByIdWithHash,
  findAll,
  create,
  update,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteUserRefreshTokens,
  deleteExpiredTokens,
};
