// ============================================================
// MODULE: DOCUMENTS
// REPOSITORY: documents.repository
// Couche d'accès aux données — requêtes Prisma uniquement.
// ============================================================

const { prisma } = require('../../config/database');

// Champs inclus dans toutes les requêtes
const INCLUDE = {
  machine:  { select: { id:true, nom:true, atelier: { select: { id:true, nom:true } } } },
  piece:    { select: { id:true, reference:true, nom:true } },
  createur: { select: { id:true, nom:true, prenom:true } },
};

// ============================================================
// #REGION lecture
// ============================================================

/**
 * Retourne uniquement les versions courantes (isCurrent = true).
 * Avec filtres optionnels : machineId, pieceId, typeDoc, mot-clé.
 */
const findDocuments = ({ machineId, pieceId, typeDoc, q, skip = 0, take = 200 } = {}) => {
  const where = { isCurrent: true };

  if (machineId) where.machineId = machineId;
  if (pieceId)   where.pieceId   = pieceId;
  if (typeDoc)   where.typeDoc   = typeDoc;
  if (q) {
    where.OR = [
      { titre:       { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { machine:  { nom:       { contains: q, mode: 'insensitive' } } },
      { piece:    { nom:       { contains: q, mode: 'insensitive' } } },
    ];
  }

  return prisma.document.findMany({
    where,
    orderBy: [{ typeDoc: 'asc' }, { titre: 'asc' }],
    skip,
    take,
    include: INCLUDE,
  });
};

/**
 * Retourne toutes les versions d'un groupe (historique).
 */
const findVersionsByGroupId = (groupId) =>
  prisma.document.findMany({
    where:   { groupId },
    orderBy: { version: 'desc' },
    include: INCLUDE,
  });

const findById = (id) =>
  prisma.document.findUnique({ where: { id }, include: INCLUDE });

const findCurrentByGroupId = (groupId) =>
  prisma.document.findFirst({ where: { groupId, isCurrent: true }, include: INCLUDE });

const countDocuments = (where = { isCurrent: true }) =>
  prisma.document.count({ where });

// #ENDREGION lecture

// ============================================================
// #REGION écriture
// ============================================================

const createDocument = (data) =>
  prisma.document.create({ data, include: INCLUDE });

const updateDocument = (id, data) =>
  prisma.document.update({ where: { id }, data, include: INCLUDE });

/**
 * Lors de la création d'une nouvelle version :
 * 1. Marquer toutes les versions existantes comme non-courantes.
 * 2. Créer la nouvelle version avec isCurrent = true.
 */
const createNewVersion = async (groupId, newDocData) => {
  return prisma.$transaction([
    // Archiver toutes les versions précédentes
    prisma.document.updateMany({
      where: { groupId, isCurrent: true },
      data:  { isCurrent: false },
    }),
    // Créer la nouvelle version
    prisma.document.create({
      data: { ...newDocData, groupId, isCurrent: true },
    }),
  ]);
};

const deleteDocument = (id) =>
  prisma.document.delete({ where: { id } });

// Supprimer tout un groupe de versions
const deleteGroup = (groupId) =>
  prisma.document.deleteMany({ where: { groupId } });

// #ENDREGION écriture

module.exports = {
  findDocuments,
  findVersionsByGroupId,
  findById,
  findCurrentByGroupId,
  countDocuments,
  createDocument,
  updateDocument,
  createNewVersion,
  deleteDocument,
  deleteGroup,
};
