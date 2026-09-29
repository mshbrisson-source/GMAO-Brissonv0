// ============================================================
// MODULE: STOCK
// REPOSITORY: stock.repository
// Couche d'accès aux données — requêtes Prisma uniquement.
// ============================================================

const { prisma } = require('../../config/database');

// ============================================================
// #REGION fournisseurs
// ============================================================

const findAllFournisseurs = () =>
  prisma.fournisseur.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { pieces: true } } },
  });

const findFournisseurById = (id) =>
  prisma.fournisseur.findUnique({
    where:   { id },
    include: { pieces: { orderBy: { nom: 'asc' }, select: { id:true, reference:true, nom:true, quantiteStock:true } } },
  });

const createFournisseur = (data) => prisma.fournisseur.create({ data });
const updateFournisseur = (id, data) => prisma.fournisseur.update({ where: { id }, data });
const deleteFournisseur = (id) => prisma.fournisseur.delete({ where: { id } });

// #ENDREGION fournisseurs

// ============================================================
// #REGION pieces
// ============================================================

const PIECE_INCLUDE = {
  fournisseur:  { select: { id:true, nom:true, email:true, telephone:true, delaiLivraisonJ:true } },
  pieceMachines: {
    include: { machine: { select: { id:true, nom:true, atelier: { select: { id:true, nom:true } } } } },
  },
  _count: { select: { mouvements: true } },
};

const findAllPieces = () =>
  prisma.piece.findMany({ orderBy: { nom: 'asc' }, include: PIECE_INCLUDE });

const findPieceById = (id) =>
  prisma.piece.findUnique({ where: { id }, include: PIECE_INCLUDE });

const searchPieces = ({ q, fournisseurId, machineId, alerteOnly }) => {
  const where = {};

  if (q) {
    where.OR = [
      { nom:       { contains: q, mode: 'insensitive' } },
      { reference: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (fournisseurId) where.fournisseurId = fournisseurId;

  if (machineId) {
    where.pieceMachines = { some: { machineId } };
  }

  // Pièces sous le seuil d'alerte
  if (alerteOnly === 'true' || alerteOnly === true) {
    where.quantiteStock = { lte: prisma.piece.fields.seuilAlerte };
    // Prisma ne supporte pas la comparaison de deux colonnes directement,
    // on utilise une raw query filtrée dans le service
  }

  return prisma.piece.findMany({ where, orderBy: { nom: 'asc' }, include: PIECE_INCLUDE });
};

const createPiece = (data) => prisma.piece.create({ data, include: PIECE_INCLUDE });
const updatePiece = (id, data) => prisma.piece.update({ where: { id }, data, include: PIECE_INCLUDE });

const updatePieceStock = (id, delta) =>
  prisma.piece.update({
    where: { id },
    data:  { quantiteStock: { increment: delta } },
    select: { id:true, quantiteStock:true, seuilAlerte:true, nom:true },
  });

// Associer / dissocier une pièce à une machine
const linkPieceToMachine = (pieceId, machineId, notes) =>
  prisma.pieceMachine.upsert({
    where:  { pieceId_machineId: { pieceId, machineId } },
    update: { notes },
    create: { pieceId, machineId, notes },
  });

const unlinkPieceFromMachine = (pieceId, machineId) =>
  prisma.pieceMachine.delete({ where: { pieceId_machineId: { pieceId, machineId } } });

// Pièces sous le seuil minimum (raw comparison)
const findPiecesSousAlerte = () =>
  prisma.$queryRaw`
    SELECT id, reference, nom, quantite_stock AS "quantiteStock",
           seuil_alerte AS "seuilAlerte", lien_commande AS "lienCommande",
           fournisseur_id AS "fournisseurId"
    FROM pieces
    WHERE quantite_stock <= seuil_alerte
    ORDER BY (seuil_alerte - quantite_stock) DESC
  `;

// #ENDREGION pieces

// ============================================================
// #REGION mouvements
// ============================================================

const MOUVEMENT_INCLUDE = {
  piece:       { select: { id:true, reference:true, nom:true } },
  user:        { select: { id:true, nom:true, prenom:true } },
  intervention: {
    select: { id:true, machine: { select: { id:true, nom:true } } },
  },
};

const findMouvements = ({ pieceId, type, dateDebut, dateFin, skip = 0, take = 100 }) => {
  const where = {};
  if (pieceId)   where.pieceId = pieceId;
  if (type)      where.type    = type;
  if (dateDebut || dateFin) {
    where.dateMouvement = {};
    if (dateDebut) where.dateMouvement.gte = new Date(dateDebut);
    if (dateFin)   where.dateMouvement.lte = new Date(dateFin);
  }
  return prisma.mouvementStock.findMany({
    where,
    orderBy: { dateMouvement: 'desc' },
    skip,
    take,
    include: MOUVEMENT_INCLUDE,
  });
};

const countMouvements = (where = {}) => prisma.mouvementStock.count({ where });

const createMouvement = (data) =>
  prisma.mouvementStock.create({ data, include: MOUVEMENT_INCLUDE });

// #ENDREGION mouvements

module.exports = {
  // fournisseurs
  findAllFournisseurs, findFournisseurById,
  createFournisseur, updateFournisseur, deleteFournisseur,
  // pieces
  findAllPieces, findPieceById, searchPieces,
  createPiece, updatePiece, updatePieceStock,
  linkPieceToMachine, unlinkPieceFromMachine, findPiecesSousAlerte,
  // mouvements
  findMouvements, countMouvements, createMouvement,
};
