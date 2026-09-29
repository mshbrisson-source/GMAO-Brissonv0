// ============================================================
// MODULE: EQUIPEMENTS
// CONTROLLER: equipements.controller
// Reçoit les requêtes HTTP, valide les entrées, délègue au service.
// ============================================================

const svc = require('./equipements.service');

// ============================================================
// #REGION arborescence & listes
// ============================================================

/** GET /api/equipements/tree — arborescence complète */
const getTree = async (req, res) => {
  const tree = await svc.getTree();
  res.json(tree);
};

/** GET /api/equipements/machines — liste plate avec filtres */
const getMachines = async (req, res) => {
  const { atelierId, actif } = req.query;
  const machines = await svc.getMachines({
    atelierId: atelierId || undefined,
    actif:     actif === 'false' ? false : actif === 'all' ? undefined : true,
  });
  res.json(machines);
};

// #ENDREGION arborescence & listes

// ============================================================
// #REGION ateliers
// ============================================================

const getAteliers = async (req, res) => {
  const data = await svc.getAteliers();
  res.json(data);
};

const getAtelierById = async (req, res) => {
  try {
    const data = await svc.getAtelierById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getAtelierHistorique = async (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  const data = await svc.getAtelierHistorique(
    req.params.id,
    parseInt(page),
    parseInt(pageSize)
  );
  res.json(data);
};

const createAtelier = async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom de l\'atelier est requis' });

  try {
    const atelier = await svc.createAtelier({ nom, description }, req.user.sub);
    res.status(201).json(atelier);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateAtelier = async (req, res) => {
  try {
    const atelier = await svc.updateAtelier(req.params.id, req.body, req.user.sub);
    res.json(atelier);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const archiveAtelier = async (req, res) => {
  try {
    await svc.archiveAtelier(req.params.id, req.user.sub);
    res.json({ message: 'Atelier et ses machines archivés' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const restoreAtelier = async (req, res) => {
  try {
    const a = await svc.restoreAtelier(req.params.id, req.user.sub);
    res.json(a);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// #ENDREGION ateliers

// ============================================================
// #REGION machines
// ============================================================

const getMachineById = async (req, res) => {
  try {
    const machine = await svc.getMachineDetail(req.params.id);
    res.json(machine);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getMachineInterventions = async (req, res) => {
  const { page = 1 } = req.query;
  try {
    const data = await svc.getMachineInterventions(req.params.id, parseInt(page));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const createMachine = async (req, res) => {
  try {
    const machine = await svc.createMachine(req.body, req.user.sub);
    res.status(201).json(machine);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

const updateMachine = async (req, res) => {
  try {
    const machine = await svc.updateMachine(req.params.id, req.body, req.user.sub);
    res.json(machine);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const archiveMachine = async (req, res) => {
  try {
    await svc.archiveMachine(req.params.id, req.user.sub);
    res.json({ message: 'Machine archivée' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const restoreMachine = async (req, res) => {
  try {
    const m = await svc.restoreMachine(req.params.id, req.user.sub);
    res.json(m);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  try {
    const machine = await svc.uploadMachinePhoto(req.params.id, req.file, req.user.sub);
    res.json({ photoUrl: machine.photoUrl });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// #ENDREGION machines

// ============================================================
// #REGION elements
// ============================================================

const addElement = async (req, res) => {
  const { nom, chaineFonctionnelle, description, ordre } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom de l\'élément est requis' });
  try {
    const el = await svc.addElement(
      req.params.machineId,
      { nom, chaineFonctionnelle, description, ordre },
      req.user.sub
    );
    res.status(201).json(el);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateElement = async (req, res) => {
  try {
    const el = await svc.updateElement(req.params.id, req.body, req.user.sub);
    res.json(el);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteElement = async (req, res) => {
  try {
    await svc.deleteElement(req.params.id, req.user.sub);
    res.json({ message: 'Élément supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// #ENDREGION elements

module.exports = {
  getTree, getMachines,
  getAteliers, getAtelierById, getAtelierHistorique,
  createAtelier, updateAtelier, archiveAtelier, restoreAtelier,
  getMachineById, getMachineInterventions,
  createMachine, updateMachine, archiveMachine, restoreMachine, uploadPhoto,
  addElement, updateElement, deleteElement,
};
