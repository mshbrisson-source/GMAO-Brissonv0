// ============================================================
// MODULE: EQUIPEMENTS
// SERVICE: equipements.service
// Logique métier : arborescence, création, archivage, historique.
// ============================================================

const repo        = require('./equipements.repository');
const { logAction } = require('../../shared/middleware/auditLogger');
const path        = require('path');
const fs          = require('fs');
const { UPLOADS_DIR } = require('../../config/env');

// ============================================================
// #REGION arborescence
// ============================================================

/**
 * Retourne l'arborescence complète Atelier → Machines.
 * Utilisé par le panneau latéral de la vue arborescente.
 */
const getTree = () => repo.findAllAteliers();

/**
 * Retourne la liste plate de toutes les machines avec leur atelier.
 * Utilisé par la vue liste avec filtres.
 */
const getMachines = ({ atelierId, actif } = {}) =>
  repo.findAllMachines({ atelierId, actif });

// #ENDREGION arborescence

// ============================================================
// #REGION fiche-machine
// ============================================================

/**
 * Retourne la fiche machine complète avec :
 * éléments, pièces, documents, compteurs d'interventions.
 */
const getMachineDetail = async (id) => {
  const machine = await repo.findMachineById(id);
  if (!machine) throw Object.assign(new Error('Machine introuvable'), { status: 404 });

  // Regrouper les éléments par chaîne fonctionnelle
  machine.elementsByChaine = groupByChaine(machine.elements);
  return machine;
};

/**
 * Retourne les interventions paginées d'une machine.
 */
const getMachineInterventions = async (id, page = 1, pageSize = 20) => {
  const machine = await repo.findMachineWithInterventions(id, pageSize * page);
  if (!machine) throw Object.assign(new Error('Machine introuvable'), { status: 404 });
  return machine.interventions;
};

const groupByChaine = (elements) => {
  return elements.reduce((acc, el) => {
    const key = el.chaineFonctionnelle || 'Sans chaîne';
    if (!acc[key]) acc[key] = [];
    acc[key].push(el);
    return acc;
  }, {});
};

// #ENDREGION fiche-machine

// ============================================================
// #REGION ateliers-crud
// ============================================================

const getAteliers = () => repo.findAllAteliersIncludingArchived();

const getAtelierById = async (id) => {
  const a = await repo.findAtelierById(id);
  if (!a) throw Object.assign(new Error('Atelier introuvable'), { status: 404 });
  return a;
};

const createAtelier = async ({ nom, description }, adminId) => {
  const atelier = await repo.createAtelier({ nom: nom.trim(), description: description?.trim() });

  await logAction({
    action:      'ATELIER_CREATED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'atelier',
    entiteId:    atelier.id,
    valeurApres: { nom: atelier.nom },
  });

  return atelier;
};

const updateAtelier = async (id, data, adminId) => {
  const before  = await repo.findAtelierById(id);
  if (!before) throw Object.assign(new Error('Atelier introuvable'), { status: 404 });

  const { nom, description } = data;
  const updated = await repo.updateAtelier(id, {
    ...(nom         ? { nom: nom.trim() }             : {}),
    ...(description !== undefined ? { description: description?.trim() } : {}),
  });

  await logAction({
    action:      'ATELIER_UPDATED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'atelier',
    entiteId:    id,
    valeurAvant: { nom: before.nom, description: before.description },
    valeurApres: { nom: updated.nom, description: updated.description },
  });

  return updated;
};

const archiveAtelier = async (id, adminId) => {
  const atelier = await repo.findAtelierById(id);
  if (!atelier) throw Object.assign(new Error('Atelier introuvable'), { status: 404 });

  // Archiver aussi toutes les machines de l'atelier
  const { prisma } = require('../../config/database');
  await prisma.machine.updateMany({ where: { atelierId: id }, data: { actif: false } });

  const updated = await repo.updateAtelier(id, { actif: false });

  await logAction({
    action:      'ATELIER_ARCHIVED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'atelier',
    entiteId:    id,
    valeurAvant: { actif: true, nom: atelier.nom },
  });

  return updated;
};

const restoreAtelier = async (id, adminId) => {
  const updated = await repo.updateAtelier(id, { actif: true });
  await logAction({ action: 'ATELIER_RESTORED', module: 'EQUIPEMENTS', userId: adminId, entiteType: 'atelier', entiteId: id });
  return updated;
};

// #ENDREGION ateliers-crud

// ============================================================
// #REGION machines-crud
// ============================================================

const createMachine = async (data, adminId) => {
  const { atelierId, nom, marque, modele, referenceFournisseur,
          numeroSerie, localisation, informationsTechniques } = data;

  if (!atelierId || !nom) throw new Error('atelierId et nom sont requis');

  const machine = await repo.createMachine({
    atelierId,
    nom: nom.trim(),
    marque:                  marque?.trim(),
    modele:                  modele?.trim(),
    referenceFournisseur:    referenceFournisseur?.trim(),
    numeroSerie:             numeroSerie?.trim(),
    localisation:            localisation?.trim(),
    informationsTechniques:  informationsTechniques?.trim(),
  });

  await logAction({
    action:      'MACHINE_CREATED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'machine',
    entiteId:    machine.id,
    valeurApres: { nom: machine.nom, atelierId },
  });

  return machine;
};

const updateMachine = async (id, data, adminId) => {
  const before = await repo.findMachineById(id);
  if (!before) throw Object.assign(new Error('Machine introuvable'), { status: 404 });

  // On n'accepte pas atelierId en update (déplacer une machine = opération admin distincte)
  const { atelierId: _ignored, photoUrl: _photo, ...safeData } = data;

  const trimmed = Object.fromEntries(
    Object.entries(safeData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  );

  const updated = await repo.updateMachine(id, trimmed);

  await logAction({
    action:      'MACHINE_UPDATED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'machine',
    entiteId:    id,
    valeurAvant: { nom: before.nom },
    valeurApres: trimmed,
  });

  return updated;
};

const archiveMachine = async (id, adminId) => {
  const machine = await repo.findMachineById(id);
  if (!machine) throw Object.assign(new Error('Machine introuvable'), { status: 404 });

  const updated = await repo.updateMachine(id, { actif: false });

  await logAction({
    action:      'MACHINE_ARCHIVED',
    module:      'EQUIPEMENTS',
    userId:      adminId,
    entiteType:  'machine',
    entiteId:    id,
    valeurAvant: { actif: true, nom: machine.nom },
  });

  return updated;
};

const restoreMachine = async (id, adminId) => {
  const updated = await repo.updateMachine(id, { actif: true });
  await logAction({ action: 'MACHINE_RESTORED', module: 'EQUIPEMENTS', userId: adminId, entiteType: 'machine', entiteId: id });
  return updated;
};

/**
 * Upload d'une photo de machine.
 * Le fichier est stocké dans /uploads/machines/<machineId>.<ext>
 */
const uploadMachinePhoto = async (id, file, adminId) => {
  const machine = await repo.findMachineById(id);
  if (!machine) throw Object.assign(new Error('Machine introuvable'), { status: 404 });

  // Supprimer l'ancienne photo si elle existe
  if (machine.photoUrl) {
    const oldPath = path.join(UPLOADS_DIR, machine.photoUrl);
    fs.existsSync(oldPath) && fs.unlinkSync(oldPath);
  }

  const ext      = path.extname(file.originalname).toLowerCase();
  const filename = `machines/${id}${ext}`;
  const destPath = path.join(UPLOADS_DIR, filename);

  // Créer le dossier machines si besoin
  fs.mkdirSync(path.join(UPLOADS_DIR, 'machines'), { recursive: true });
  fs.renameSync(file.path, destPath);

  const updated = await repo.updateMachine(id, { photoUrl: filename });

  await logAction({ action: 'MACHINE_PHOTO_UPDATED', module: 'EQUIPEMENTS', userId: adminId, entiteType: 'machine', entiteId: id });

  return updated;
};

// #ENDREGION machines-crud

// ============================================================
// #REGION elements-crud
// ============================================================

const addElement = async (machineId, data, userId) => {
  const element = await repo.createElement({
    machineId,
    nom:                data.nom?.trim(),
    chaineFonctionnelle: data.chaineFonctionnelle?.trim(),
    description:        data.description?.trim(),
    ordre:              data.ordre ?? 0,
  });

  await logAction({ action: 'ELEMENT_CREATED', module: 'EQUIPEMENTS', userId, entiteType: 'element', entiteId: element.id });
  return element;
};

const updateElement = async (id, data, userId) => {
  const updated = await repo.updateElement(id, {
    nom:                data.nom?.trim(),
    chaineFonctionnelle: data.chaineFonctionnelle?.trim(),
    description:        data.description?.trim(),
    ordre:              data.ordre,
  });
  await logAction({ action: 'ELEMENT_UPDATED', module: 'EQUIPEMENTS', userId, entiteType: 'element', entiteId: id });
  return updated;
};

const deleteElement = async (id, userId) => {
  await repo.deleteElement(id);
  await logAction({ action: 'ELEMENT_DELETED', module: 'EQUIPEMENTS', userId, entiteType: 'element', entiteId: id });
};

// #ENDREGION elements-crud

// ============================================================
// #REGION historique
// ============================================================

const getAtelierHistorique = async (atelierId, page = 1, pageSize = 50) => {
  const skip  = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    repo.findInterventionsByAtelier(atelierId, { skip, take: pageSize }),
    repo.countInterventionsByAtelier(atelierId),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// #ENDREGION historique

module.exports = {
  getTree,
  getMachines,
  getMachineDetail,
  getMachineInterventions,
  getAteliers,
  getAtelierById,
  createAtelier,
  updateAtelier,
  archiveAtelier,
  restoreAtelier,
  createMachine,
  updateMachine,
  archiveMachine,
  restoreMachine,
  uploadMachinePhoto,
  addElement,
  updateElement,
  deleteElement,
  getAtelierHistorique,
};
