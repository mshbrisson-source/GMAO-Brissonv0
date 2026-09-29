// ============================================================
// MODULE: STOCK
// SERVICE: stock.service
// Logique métier : gestion des pièces, fournisseurs,
// mouvements de stock, alertes, génération PDF.
// ============================================================

const repo        = require('./stock.repository');
const { logAction } = require('../../shared/middleware/auditLogger');
const { prisma }  = require('../../config/database');

// ============================================================
// #REGION fournisseurs
// ============================================================

const getFournisseurs   = () => repo.findAllFournisseurs();
const getFournisseurById = async (id) => {
  const f = await repo.findFournisseurById(id);
  if (!f) throw Object.assign(new Error('Fournisseur introuvable'), { status: 404 });
  return f;
};

const createFournisseur = async (data, userId) => {
  const f = await repo.createFournisseur({
    nom:            data.nom?.trim(),
    contact:        data.contact?.trim(),
    email:          data.email?.toLowerCase().trim(),
    telephone:      data.telephone?.trim(),
    delaiLivraisonJ: data.delaiLivraisonJ ? parseInt(data.delaiLivraisonJ) : null,
    conditions:     data.conditions?.trim(),
  });
  await logAction({ action: 'FOURNISSEUR_CREATED', module: 'STOCK', userId, entiteType: 'fournisseur', entiteId: f.id, valeurApres: { nom: f.nom } });
  return f;
};

const updateFournisseur = async (id, data, userId) => {
  const f = await repo.updateFournisseur(id, {
    ...(data.nom            ? { nom: data.nom.trim() }            : {}),
    ...(data.contact        !== undefined ? { contact: data.contact?.trim() }        : {}),
    ...(data.email          !== undefined ? { email: data.email?.toLowerCase().trim() } : {}),
    ...(data.telephone      !== undefined ? { telephone: data.telephone?.trim() }    : {}),
    ...(data.delaiLivraisonJ !== undefined ? { delaiLivraisonJ: data.delaiLivraisonJ ? parseInt(data.delaiLivraisonJ) : null } : {}),
    ...(data.conditions     !== undefined ? { conditions: data.conditions?.trim() }  : {}),
  });
  await logAction({ action: 'FOURNISSEUR_UPDATED', module: 'STOCK', userId, entiteType: 'fournisseur', entiteId: id });
  return f;
};

const deleteFournisseur = async (id, userId) => {
  const count = await prisma.piece.count({ where: { fournisseurId: id } });
  if (count > 0) throw new Error(`Ce fournisseur est lié à ${count} pièce(s). Réassignez-les avant de le supprimer.`);
  await repo.deleteFournisseur(id);
  await logAction({ action: 'FOURNISSEUR_DELETED', module: 'STOCK', userId, entiteType: 'fournisseur', entiteId: id });
};

// #ENDREGION fournisseurs

// ============================================================
// #REGION pieces
// ============================================================

const getPieces = (filters) => repo.searchPieces(filters || {});

const getPiecesAvecAlerte = async () => {
  // Retourne toutes les pièces où quantiteStock <= seuilAlerte
  return repo.findPiecesSousAlerte();
};

const getPieceById = async (id) => {
  const p = await repo.findPieceById(id);
  if (!p) throw Object.assign(new Error('Pièce introuvable'), { status: 404 });
  return p;
};

const createPiece = async (data, userId) => {
  if (!data.reference || !data.nom) throw new Error('Référence et nom sont requis');

  const piece = await repo.createPiece({
    reference:          data.reference.trim(),
    nom:                data.nom.trim(),
    description:        data.description?.trim(),
    quantiteStock:      parseInt(data.quantiteStock) || 0,
    seuilAlerte:        parseInt(data.seuilAlerte) || 0,
    prixUnitaire:       parseFloat(data.prixUnitaire) || 0,
    emplacementPhysique: data.emplacementPhysique?.trim(),
    lienCommande:       data.lienCommande?.trim(),
    fournisseurId:      data.fournisseurId || null,
  });

  await logAction({
    action: 'PIECE_CREATED', module: 'STOCK', userId,
    entiteType: 'piece', entiteId: piece.id,
    valeurApres: { reference: piece.reference, nom: piece.nom },
  });

  return piece;
};

const updatePiece = async (id, data, userId) => {
  const before = await repo.findPieceById(id);
  if (!before) throw Object.assign(new Error('Pièce introuvable'), { status: 404 });

  const { quantiteStock: _qs, ...updateData } = data; // stock ne se modifie que via mouvements
  const updated = await repo.updatePiece(id, {
    ...(updateData.reference    ? { reference: updateData.reference.trim() }       : {}),
    ...(updateData.nom          ? { nom: updateData.nom.trim() }                    : {}),
    ...(updateData.description  !== undefined ? { description: updateData.description?.trim() } : {}),
    ...(updateData.seuilAlerte  !== undefined ? { seuilAlerte: parseInt(updateData.seuilAlerte) } : {}),
    ...(updateData.prixUnitaire !== undefined ? { prixUnitaire: parseFloat(updateData.prixUnitaire) } : {}),
    ...(updateData.emplacementPhysique !== undefined ? { emplacementPhysique: updateData.emplacementPhysique?.trim() } : {}),
    ...(updateData.lienCommande !== undefined ? { lienCommande: updateData.lienCommande?.trim() } : {}),
    ...(updateData.fournisseurId !== undefined ? { fournisseurId: updateData.fournisseurId || null } : {}),
  });

  await logAction({
    action: 'PIECE_UPDATED', module: 'STOCK', userId,
    entiteType: 'piece', entiteId: id,
    valeurAvant: { nom: before.nom, prixUnitaire: before.prixUnitaire },
    valeurApres: updateData,
  });

  return updated;
};

const linkMachine = async (pieceId, machineId, notes, userId) => {
  const pm = await repo.linkPieceToMachine(pieceId, machineId, notes);
  await logAction({ action: 'PIECE_MACHINE_LINKED', module: 'STOCK', userId, entiteType: 'piece', entiteId: pieceId, valeurApres: { machineId } });
  return pm;
};

const unlinkMachine = async (pieceId, machineId, userId) => {
  await repo.unlinkPieceFromMachine(pieceId, machineId);
  await logAction({ action: 'PIECE_MACHINE_UNLINKED', module: 'STOCK', userId, entiteType: 'piece', entiteId: pieceId, valeurApres: { machineId } });
};

// #ENDREGION pieces

// ============================================================
// #REGION mouvements
// ============================================================

/**
 * Enregistre une ENTRÉE de stock (réception commande).
 * Incrémente quantiteStock de la pièce.
 */
const entreeStock = async ({ pieceId, quantite, notes, prixUnitaire }, userId) => {
  if (!pieceId || !quantite || quantite <= 0) throw new Error('pieceId et quantité > 0 requis');

  const piece    = await repo.findPieceById(pieceId);
  if (!piece) throw Object.assign(new Error('Pièce introuvable'), { status: 404 });

  const snapshot = prixUnitaire !== undefined ? parseFloat(prixUnitaire) : piece.prixUnitaire;

  // Transaction atomique : mouvement + mise à jour stock
  const [mouvement] = await prisma.$transaction([
    prisma.mouvementStock.create({
      data: {
        pieceId, type: 'ENTREE', quantite: parseInt(quantite),
        prixUnitaireSnapshot: snapshot, notes: notes?.trim(),
        userId,
      },
    }),
    prisma.piece.update({
      where: { id: pieceId },
      data:  { quantiteStock: { increment: parseInt(quantite) } },
    }),
  ]);

  await logAction({
    action: 'STOCK_ENTREE', module: 'STOCK', userId,
    entiteType: 'piece', entiteId: pieceId,
    valeurApres: { quantite, prixUnitaire: snapshot, notes },
  });

  return mouvement;
};

/**
 * Enregistre une SORTIE de stock (usage en intervention ou sortie manuelle).
 * Décrémente quantiteStock et vérifie le stock disponible.
 */
const sortieStock = async ({ pieceId, quantite, interventionId, notes }, userId) => {
  if (!pieceId || !quantite || quantite <= 0) throw new Error('pieceId et quantité > 0 requis');

  const piece = await repo.findPieceById(pieceId);
  if (!piece) throw Object.assign(new Error('Pièce introuvable'), { status: 404 });
  if (piece.quantiteStock < parseInt(quantite)) {
    throw new Error(`Stock insuffisant. Disponible : ${piece.quantiteStock}, demandé : ${quantite}`);
  }

  const [mouvement] = await prisma.$transaction([
    prisma.mouvementStock.create({
      data: {
        pieceId, type: 'SORTIE', quantite: parseInt(quantite),
        prixUnitaireSnapshot: piece.prixUnitaire,
        interventionId: interventionId || null,
        notes: notes?.trim(),
        userId,
      },
    }),
    prisma.piece.update({
      where: { id: pieceId },
      data:  { quantiteStock: { decrement: parseInt(quantite) } },
    }),
  ]);

  await logAction({
    action: 'STOCK_SORTIE', module: 'STOCK', userId,
    entiteType: 'piece', entiteId: pieceId,
    valeurApres: { quantite, interventionId },
  });

  return mouvement;
};

const getMouvements = async ({ pieceId, type, dateDebut, dateFin, page = 1, pageSize = 100 }) => {
  const skip  = (page - 1) * pageSize;
  const where = {};
  if (pieceId)   where.pieceId = pieceId;
  if (type)      where.type    = type;
  if (dateDebut || dateFin) {
    where.dateMouvement = {};
    if (dateDebut) where.dateMouvement.gte = new Date(dateDebut);
    if (dateFin)   where.dateMouvement.lte = new Date(dateFin);
  }

  const [data, total] = await Promise.all([
    repo.findMouvements({ pieceId, type, dateDebut, dateFin, skip, take: pageSize }),
    repo.countMouvements(where),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// #ENDREGION mouvements

// ============================================================
// #REGION bon-commande-pdf
// ============================================================

/**
 * Génère le contenu du bon de commande.
 * La mise en page PDF est gérée par bonCommande.generator.js.
 */
const prepareBonCommande = async (lignes, fournisseurId) => {
  if (!lignes?.length) throw new Error('Aucune ligne de commande fournie');

  const fournisseur = fournisseurId ? await repo.findFournisseurById(fournisseurId) : null;

  // Enrichir les lignes avec les données de la pièce
  const lignesEnrichies = await Promise.all(
    lignes.map(async ({ pieceId, quantite }) => {
      const piece = await repo.findPieceById(pieceId);
      if (!piece) throw new Error(`Pièce ${pieceId} introuvable`);
      return {
        reference:    piece.reference,
        nom:          piece.nom,
        prixUnitaire: piece.prixUnitaire,
        lienCommande: piece.lienCommande,
        quantite:     parseInt(quantite),
        total:        piece.prixUnitaire * parseInt(quantite),
      };
    })
  );

  const totalHT = lignesEnrichies.reduce((s, l) => s + l.total, 0);

  return { fournisseur, lignes: lignesEnrichies, totalHT };
};

// #ENDREGION bon-commande-pdf

module.exports = {
  // fournisseurs
  getFournisseurs, getFournisseurById, createFournisseur, updateFournisseur, deleteFournisseur,
  // pieces
  getPieces, getPiecesAvecAlerte, getPieceById, createPiece, updatePiece, linkMachine, unlinkMachine,
  // mouvements
  entreeStock, sortieStock, getMouvements,
  // bon commande
  prepareBonCommande,
};
