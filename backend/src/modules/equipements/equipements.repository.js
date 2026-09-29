// ============================================================
// MODULE: EQUIPEMENTS
// REPOSITORY: equipements.repository
// Couche d'accès aux données — requêtes Prisma uniquement.
// ============================================================

const { prisma } = require('../../config/database');

// ============================================================
// #REGION ateliers
// ============================================================

const findAllAteliers = () =>
  prisma.atelier.findMany({
    where:   { actif: true },
    orderBy: { nom: 'asc' },
    include: {
      machines: {
        where:   { actif: true },
        orderBy: { nom: 'asc' },
        select:  { id: true, nom: true, marque: true, modele: true, photoUrl: true, actif: true },
      },
      _count: { select: { machines: { where: { actif: true } } } },
    },
  });

const findAllAteliersIncludingArchived = () =>
  prisma.atelier.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { machines: true } } },
  });

const findAtelierById = (id) =>
  prisma.atelier.findUnique({
    where:   { id },
    include: {
      machines: {
        where:   { actif: true },
        orderBy: { nom: 'asc' },
        include: { _count: { select: { interventions: true, elements: true } } },
      },
    },
  });

const createAtelier = (data) =>
  prisma.atelier.create({ data });

const updateAtelier = (id, data) =>
  prisma.atelier.update({ where: { id }, data });

// #ENDREGION ateliers

// ============================================================
// #REGION machines
// ============================================================

const findAllMachines = ({ atelierId, actif = true } = {}) =>
  prisma.machine.findMany({
    where:   { ...(atelierId ? { atelierId } : {}), actif },
    orderBy: [{ atelier: { nom: 'asc' } }, { nom: 'asc' }],
    include: {
      atelier: { select: { id: true, nom: true } },
      _count:  { select: { elements: true, interventions: true, documents: true } },
    },
  });

const findMachineById = (id) =>
  prisma.machine.findUnique({
    where:   { id },
    include: {
      atelier:  { select: { id: true, nom: true } },
      elements: { orderBy: [{ chaineFonctionnelle: 'asc' }, { ordre: 'asc' }] },
      pieceMachines: {
        include: {
          piece: {
            include: { fournisseur: { select: { id: true, nom: true } } },
          },
        },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      _count: { select: { interventions: true } },
    },
  });

const findMachineWithInterventions = (id, limit = 20) =>
  prisma.machine.findUnique({
    where:   { id },
    include: {
      interventions: {
        orderBy: { createdAt: 'desc' },
        take:    limit,
        include: {
          technicien: { select: { id: true, nom: true, prenom: true } },
          demandeur:  { select: { id: true, nom: true, prenom: true } },
        },
      },
    },
  });

const createMachine = (data) =>
  prisma.machine.create({ data, include: { atelier: { select: { id: true, nom: true } } } });

const updateMachine = (id, data) =>
  prisma.machine.update({
    where:   { id },
    data,
    include: { atelier: { select: { id: true, nom: true } } },
  });

// #ENDREGION machines

// ============================================================
// #REGION elements
// ============================================================

const findElementsByMachine = (machineId) =>
  prisma.element.findMany({
    where:   { machineId },
    orderBy: [{ chaineFonctionnelle: 'asc' }, { ordre: 'asc' }],
  });

const createElement = (data) =>
  prisma.element.create({ data });

const updateElement = (id, data) =>
  prisma.element.update({ where: { id }, data });

const deleteElement = (id) =>
  prisma.element.delete({ where: { id } });

// #ENDREGION elements

// ============================================================
// #REGION historique-atelier
// ============================================================

const findInterventionsByAtelier = (atelierId, { skip = 0, take = 50 } = {}) =>
  prisma.intervention.findMany({
    where:   { machine: { atelierId } },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      machine:   { select: { id: true, nom: true } },
      technicien: { select: { id: true, nom: true, prenom: true } },
      demandeur:  { select: { id: true, nom: true, prenom: true } },
    },
  });

const countInterventionsByAtelier = (atelierId) =>
  prisma.intervention.count({ where: { machine: { atelierId } } });

// #ENDREGION historique-atelier

module.exports = {
  // ateliers
  findAllAteliers,
  findAllAteliersIncludingArchived,
  findAtelierById,
  createAtelier,
  updateAtelier,
  // machines
  findAllMachines,
  findMachineById,
  findMachineWithInterventions,
  createMachine,
  updateMachine,
  // éléments
  findElementsByMachine,
  createElement,
  updateElement,
  deleteElement,
  // historique
  findInterventionsByAtelier,
  countInterventionsByAtelier,
};
