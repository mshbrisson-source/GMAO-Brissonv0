// ============================================================
// MODULE: STOCK
// CONTROLLER: stock.controller
// Reçoit les requêtes HTTP, valide les entrées, délègue au service.
// ============================================================

const svc       = require('./stock.service');
const { generateBonCommandePDF } = require('../../shared/utils/bonCommande.generator');

// ============================================================
// #REGION fournisseurs
// ============================================================

const getFournisseurs    = async (req, res) => { res.json(await svc.getFournisseurs()); };
const getFournisseurById = async (req, res) => {
  try { res.json(await svc.getFournisseurById(req.params.id)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const createFournisseur = async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom du fournisseur est requis' });
  try { res.status(201).json(await svc.createFournisseur(req.body, req.user.sub)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const updateFournisseur = async (req, res) => {
  try { res.json(await svc.updateFournisseur(req.params.id, req.body, req.user.sub)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const deleteFournisseur = async (req, res) => {
  try { await svc.deleteFournisseur(req.params.id, req.user.sub); res.json({ message: 'Fournisseur supprimé' }); }
  catch (err) { res.status(err.status || 400).json({ error: err.message }); }
};

// #ENDREGION fournisseurs

// ============================================================
// #REGION pieces
// ============================================================

const getPieces = async (req, res) => {
  const { q, fournisseurId, machineId, alerteOnly } = req.query;
  res.json(await svc.getPieces({ q, fournisseurId, machineId, alerteOnly }));
};

const getPiecesAlerte = async (req, res) => {
  res.json(await svc.getPiecesAvecAlerte());
};

const getPieceById = async (req, res) => {
  try { res.json(await svc.getPieceById(req.params.id)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const createPiece = async (req, res) => {
  try { res.status(201).json(await svc.createPiece(req.body, req.user.sub)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

const updatePiece = async (req, res) => {
  try { res.json(await svc.updatePiece(req.params.id, req.body, req.user.sub)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const linkMachine = async (req, res) => {
  const { machineId, notes } = req.body;
  if (!machineId) return res.status(400).json({ error: 'machineId requis' });
  try { res.json(await svc.linkMachine(req.params.id, machineId, notes, req.user.sub)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const unlinkMachine = async (req, res) => {
  try { await svc.unlinkMachine(req.params.id, req.params.machineId, req.user.sub); res.json({ message: 'Lien supprimé' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

// #ENDREGION pieces

// ============================================================
// #REGION mouvements
// ============================================================

const getMouvements = async (req, res) => {
  const { pieceId, type, dateDebut, dateFin, page, pageSize } = req.query;
  res.json(await svc.getMouvements({ pieceId, type, dateDebut, dateFin, page, pageSize }));
};

const entreeStock = async (req, res) => {
  const { pieceId, quantite } = req.body;
  if (!pieceId || !quantite) return res.status(400).json({ error: 'pieceId et quantite requis' });
  try { res.status(201).json(await svc.entreeStock(req.body, req.user.sub)); }
  catch (err) { res.status(err.status || 400).json({ error: err.message }); }
};

const sortieStock = async (req, res) => {
  const { pieceId, quantite } = req.body;
  if (!pieceId || !quantite) return res.status(400).json({ error: 'pieceId et quantite requis' });
  try { res.status(201).json(await svc.sortieStock(req.body, req.user.sub)); }
  catch (err) { res.status(err.status || 400).json({ error: err.message }); }
};

// #ENDREGION mouvements

// ============================================================
// #REGION bon-commande
// ============================================================

/**
 * POST /api/stock/bon-commande/preview
 * Retourne les données du bon de commande (JSON) pour prévisualisation.
 */
const previewBonCommande = async (req, res) => {
  const { lignes, fournisseurId } = req.body;
  try { res.json(await svc.prepareBonCommande(lignes, fournisseurId)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

/**
 * POST /api/stock/bon-commande/pdf
 * Génère et retourne un PDF binaire.
 */
const downloadBonCommande = async (req, res) => {
  const { lignes, fournisseurId, numero } = req.body;
  try {
    const data    = await svc.prepareBonCommande(lignes, fournisseurId);
    const pdfBuf  = await generateBonCommandePDF({
      ...data,
      numero:        numero || `BC-${Date.now()}`,
      etablissement: process.env.ETABLISSEMENT_NOM || 'Établissement',
    });

    const filename = `bon-commande-${Date.now()}.pdf`;
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length',      pdfBuf.length);
    res.send(pdfBuf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// #ENDREGION bon-commande

module.exports = {
  getFournisseurs, getFournisseurById, createFournisseur, updateFournisseur, deleteFournisseur,
  getPieces, getPiecesAlerte, getPieceById, createPiece, updatePiece, linkMachine, unlinkMachine,
  getMouvements, entreeStock, sortieStock,
  previewBonCommande, downloadBonCommande,
};
