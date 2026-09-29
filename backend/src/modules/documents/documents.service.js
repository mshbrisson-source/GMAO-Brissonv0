// ============================================================
// MODULE: DOCUMENTS
// SERVICE: documents.service
// Logique métier : upload, versionnage, recherche, streaming.
// ============================================================

const path        = require('path');
const fs          = require('fs');
const crypto      = require('crypto');
const repo        = require('./documents.repository');
const { logAction } = require('../../shared/middleware/auditLogger');
const { UPLOADS_DIR } = require('../../config/env');

const DOCS_DIR = path.join(UPLOADS_DIR, 'documents');
fs.mkdirSync(DOCS_DIR, { recursive: true });

// Types de documents acceptés
const VALID_TYPES   = ['MANUEL', 'SCHEMA', 'PROCEDURE', 'FICHE_SECURITE', 'AUTRE'];
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ============================================================
// #REGION lecture
// ============================================================

const getDocuments = (filters) => repo.findDocuments(filters);

const getDocumentById = async (id) => {
  const doc = await repo.findById(id);
  if (!doc) throw Object.assign(new Error('Document introuvable'), { status: 404 });
  return doc;
};

const getVersionHistory = (groupId) => repo.findVersionsByGroupId(groupId);

// ============================================================
// #REGION upload & création
// ============================================================

/**
 * Crée un nouveau document (première version).
 * Génère un groupId unique qui relie toutes les versions futures.
 */
const createDocument = async ({ titre, description, typeDoc, urlExterne, machineId, pieceId, noteVersion }, file, userId) => {
  if (!titre)   throw new Error('Le titre est requis');
  if (!typeDoc || !VALID_TYPES.includes(typeDoc)) throw new Error(`Type invalide. Valeurs : ${VALID_TYPES.join(', ')}`);
  if (!file && !urlExterne) throw new Error('Fichier ou URL externe requis');

  const groupId    = crypto.randomUUID();
  let urlFichier   = null;
  let mimeType     = null;
  let tailleFichier = null;

  if (file) {
    const result = await _saveFile(file, groupId, 1);
    urlFichier    = result.urlFichier;
    mimeType      = result.mimeType;
    tailleFichier = result.taille;
  }

  const doc = await repo.createDocument({
    groupId,
    titre:         titre.trim(),
    description:   description?.trim(),
    typeDoc,
    urlFichier,
    mimeType,
    tailleFichier,
    urlExterne:    urlExterne?.trim() || null,
    machineId:     machineId || null,
    pieceId:       pieceId   || null,
    noteVersion:   noteVersion?.trim() || null,
    version:       1,
    isCurrent:     true,
    createdBy:     userId,
  });

  await logAction({
    action: 'DOCUMENT_CREATED', module: 'DOCUMENTS', userId,
    entiteType: 'document', entiteId: doc.id,
    valeurApres: { titre, typeDoc, machineId, pieceId },
  });

  return doc;
};

/**
 * Crée une nouvelle version d'un document existant.
 * Marque la version précédente comme non-courante.
 */
const createNewVersion = async (groupId, { titre, description, noteVersion, urlExterne }, file, userId) => {
  const current = await repo.findCurrentByGroupId(groupId);
  if (!current) throw Object.assign(new Error('Groupe de documents introuvable'), { status: 404 });

  const newVersion  = current.version + 1;
  let urlFichier    = current.urlFichier;   // hériter du fichier précédent si aucun nouveau
  let mimeType      = current.mimeType;
  let tailleFichier = current.tailleFichier;

  if (file) {
    const result  = await _saveFile(file, groupId, newVersion);
    urlFichier    = result.urlFichier;
    mimeType      = result.mimeType;
    tailleFichier = result.taille;
  }

  const [, newDoc] = await repo.createNewVersion(groupId, {
    machineId:     current.machineId,
    pieceId:       current.pieceId,
    titre:         (titre || current.titre).trim(),
    description:   description?.trim() ?? current.description,
    typeDoc:       current.typeDoc,
    urlFichier,
    mimeType,
    tailleFichier,
    urlExterne:    urlExterne?.trim() || current.urlExterne,
    version:       newVersion,
    noteVersion:   noteVersion?.trim() || null,
    createdBy:     userId,
  });

  // Re-fetcher avec les includes
  const full = await repo.findById(newDoc.id);

  await logAction({
    action: 'DOCUMENT_NEW_VERSION', module: 'DOCUMENTS', userId,
    entiteType: 'document', entiteId: newDoc.id,
    valeurApres: { groupId, version: newVersion, noteVersion },
  });

  return full;
};

/**
 * Restaure une version précédente comme version courante.
 */
const restoreVersion = async (id, userId) => {
  const doc = await repo.findById(id);
  if (!doc) throw Object.assign(new Error('Version introuvable'), { status: 404 });

  await repo.createNewVersion(doc.groupId, {
    machineId:     doc.machineId,
    pieceId:       doc.pieceId,
    titre:         doc.titre,
    description:   doc.description,
    typeDoc:       doc.typeDoc,
    urlFichier:    doc.urlFichier,
    mimeType:      doc.mimeType,
    tailleFichier: doc.tailleFichier,
    urlExterne:    doc.urlExterne,
    version:       (await repo.findVersionsByGroupId(doc.groupId)).length + 1,
    noteVersion:   `Restauration de la version ${doc.version}`,
    createdBy:     userId,
  });

  await logAction({ action: 'DOCUMENT_RESTORED', module: 'DOCUMENTS', userId, entiteType: 'document', entiteId: id });
};

/**
 * Supprime un document (toutes ses versions).
 * Supprime aussi les fichiers physiques.
 */
const deleteDocument = async (groupId, userId) => {
  const versions = await repo.findVersionsByGroupId(groupId);
  if (!versions.length) throw Object.assign(new Error('Document introuvable'), { status: 404 });

  // Supprimer les fichiers physiques
  versions.forEach(v => {
    if (v.urlFichier) {
      const filePath = path.join(UPLOADS_DIR, v.urlFichier);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  await repo.deleteGroup(groupId);
  await logAction({ action: 'DOCUMENT_DELETED', module: 'DOCUMENTS', userId, entiteType: 'document', valeurApres: { groupId } });
};

// ============================================================
// #REGION streaming fichier
// ============================================================

/**
 * Retourne le chemin absolu et les métadonnées d'un fichier pour le streaming.
 * Utilisé par le controller pour servir le fichier inline (pas en pièce jointe).
 */
const getFileInfo = async (id) => {
  const doc = await repo.findById(id);
  if (!doc) throw Object.assign(new Error('Document introuvable'), { status: 404 });

  if (!doc.urlFichier) {
    if (doc.urlExterne) return { isExternal: true, url: doc.urlExterne };
    throw Object.assign(new Error('Ce document n\'a pas de fichier associé'), { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, doc.urlFichier);
  if (!fs.existsSync(filePath)) throw Object.assign(new Error('Fichier introuvable sur le serveur'), { status: 404 });

  return {
    isExternal:   false,
    filePath,
    mimeType:     doc.mimeType || _guessMime(doc.urlFichier),
    titre:        doc.titre,
    taille:       doc.tailleFichier,
  };
};

// ============================================================
// #REGION helpers privés
// ============================================================

/**
 * Déplace un fichier uploadé vers son emplacement permanent.
 * Chemin : /uploads/documents/<groupId>/v<version>_<nom_original>
 */
const _saveFile = async (file, groupId, version) => {
  const groupDir = path.join(DOCS_DIR, groupId);
  fs.mkdirSync(groupDir, { recursive: true });

  // Sanitiser le nom original
  const safeName  = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filename  = `v${version}_${safeName}`;
  const destPath  = path.join(groupDir, filename);

  fs.renameSync(file.path, destPath);

  const stats = fs.statSync(destPath);

  return {
    urlFichier: path.join('documents', groupId, filename).replace(/\\/g, '/'),
    mimeType:   file.mimetype,
    taille:     stats.size,
  };
};

const _guessMime = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.pdf':  'application/pdf',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
  }[ext] || 'application/octet-stream';
};

module.exports = {
  getDocuments,
  getDocumentById,
  getVersionHistory,
  createDocument,
  createNewVersion,
  restoreVersion,
  deleteDocument,
  getFileInfo,
  VALID_TYPES,
  ALLOWED_MIMES,
};
