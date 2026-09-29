// ============================================================
// MODULE: DOCUMENTS
// CONTROLLER: documents.controller
// ============================================================

const fs  = require('fs');
const svc = require('./documents.service');

// ============================================================
// #REGION lecture
// ============================================================

const getDocuments = async (req, res) => {
  const { machineId, pieceId, typeDoc, q } = req.query;
  res.json(await svc.getDocuments({ machineId, pieceId, typeDoc, q }));
};

const getDocumentById = async (req, res) => {
  try { res.json(await svc.getDocumentById(req.params.id)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const getVersionHistory = async (req, res) => {
  res.json(await svc.getVersionHistory(req.params.groupId));
};

// ============================================================
// #REGION fichier inline
// ============================================================

/**
 * GET /api/documents/:id/view
 * Sert le fichier inline (pas de pièce jointe forcée).
 * Supporte les range requests pour PDF (navigation dans le PDF).
 */
const viewFile = async (req, res) => {
  try {
    const info = await svc.getFileInfo(req.params.id);

    if (info.isExternal) {
      return res.redirect(302, info.url);
    }

    const stat = fs.statSync(info.filePath);
    const fileSize = stat.size;
    const range    = req.headers.range;

    res.setHeader('Content-Type', info.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(info.titre)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Range request (PDF pagination dans l'iframe)
    if (range && info.mimeType === 'application/pdf') {
      const parts  = range.replace(/bytes=/, '').split('-');
      const start  = parseInt(parts[0], 10);
      const end    = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.setHeader('Content-Range',  `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges',  'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.status(206);

      fs.createReadStream(info.filePath, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      fs.createReadStream(info.filePath).pipe(res);
    }
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/**
 * GET /api/documents/:id/download
 * Force le téléchargement (Content-Disposition: attachment).
 */
const downloadFile = async (req, res) => {
  try {
    const info = await svc.getFileInfo(req.params.id);
    if (info.isExternal) return res.redirect(302, info.url);

    res.setHeader('Content-Type',        info.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(info.titre)}"`);
    res.setHeader('Content-Length',      info.taille);
    fs.createReadStream(info.filePath).pipe(res);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ============================================================
// #REGION écriture
// ============================================================

const createDocument = async (req, res) => {
  try {
    const doc = await svc.createDocument(req.body, req.file || null, req.user.sub);
    res.status(201).json(doc);
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path); // nettoyage si erreur
    res.status(err.status || 400).json({ error: err.message });
  }
};

const createNewVersion = async (req, res) => {
  try {
    const doc = await svc.createNewVersion(req.params.groupId, req.body, req.file || null, req.user.sub);
    res.status(201).json(doc);
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(err.status || 400).json({ error: err.message });
  }
};

const restoreVersion = async (req, res) => {
  try {
    await svc.restoreVersion(req.params.id, req.user.sub);
    res.json({ message: 'Version restaurée' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    await svc.deleteDocument(req.params.groupId, req.user.sub);
    res.json({ message: 'Document et toutes ses versions supprimés' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = {
  getDocuments, getDocumentById, getVersionHistory,
  viewFile, downloadFile,
  createDocument, createNewVersion, restoreVersion, deleteDocument,
};
