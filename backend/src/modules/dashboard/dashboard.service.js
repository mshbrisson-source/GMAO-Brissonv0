// ============================================================
// MODULE: DASHBOARD
// SERVICE: dashboard.service
// Calcul des KPIs, agrégations, tâches du jour, alertes.
// ============================================================

const { prisma } = require('../../config/database');

// Fenêtre temporelle pour "intervention en retard"
const RETARD_JOURS_URGENT = 1;   // URGENT non terminée en > 1 jour
const RETARD_JOURS_HAUTE  = 3;   // HAUTE non terminée en > 3 jours
const RETARD_JOURS_NORMAL = 7;   // NORMALE non terminée en > 7 jours

// ============================================================
// #REGION kpis-globaux
// ============================================================

/**
 * Retourne tous les KPIs pour ADMIN et MAINTENANCE.
 */
const getKpisGlobaux = async () => {
  const now      = new Date();
  const j7       = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hier     = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Toutes les interventions non-terminées
  const etatsOuverts = ['DEMANDE', 'EN_COURS', 'PREPARATION', 'URGENT', 'A_CLOTURER', 'AUTRE'];

  const [
    countParEtat,
    interventionsOuvertes,
    stockAlertes,
    // planifPreventif7j, // TODO: actif à l'étape 8
    machinesParAtelier,
    interventionsParAtelier,
    recentesTerminees,
  ] = await Promise.all([

    // 1. Comptage par état
    prisma.intervention.groupBy({
      by:      ['etat'],
      _count:  { _all: true },
      where:   { etat: { in: [...etatsOuverts, 'TERMINE'] } },
    }),

    // 2. Interventions ouvertes (pour calcul des retards)
    prisma.intervention.findMany({
      where:   { etat: { in: etatsOuverts } },
      select:  { id:true, etat:true, priorite:true, dateDemande:true, machineId:true },
    }),

    // 3. Pièces sous le seuil d'alerte
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM pieces
      WHERE quantite_stock <= seuil_alerte
    `,

    // 4. Machines + ateliers (pour taux de disponibilité)
    prisma.atelier.findMany({
      where:   { actif: true },
      include: {
        machines: {
          where:  { actif: true },
          select: { id:true, nom:true },
        },
      },
    }),

    // 5. Interventions groupées par atelier (via machine)
    prisma.intervention.groupBy({
      by:     ['machineId'],
      _count: { _all: true },
      where:  { etat: { in: etatsOuverts } },
    }),

    // 6. Interventions terminées dans les 7 derniers jours
    prisma.intervention.count({
      where: { etat: 'TERMINE', dateFin: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Structurer les comptages par état
  const parEtat = {};
  countParEtat.forEach(({ etat, _count }) => { parEtat[etat] = _count._all; });

  // Calcul des interventions en retard
  const enRetard = interventionsOuvertes.filter(iv => {
    const age = (now - new Date(iv.dateDemande)) / (1000 * 60 * 60 * 24);
    if (iv.priorite === 'URGENT') return age > RETARD_JOURS_URGENT;
    if (iv.priorite === 'HAUTE')  return age > RETARD_JOURS_HAUTE;
    return age > RETARD_JOURS_NORMAL;
  }).length;

  // Map machineId → atelierId
  const machineAtelierMap = {};
  machinesParAtelier.forEach(a => {
    a.machines.forEach(m => { machineAtelierMap[m.id] = { atelierId: a.id, atelierNom: a.nom }; });
  });

  // Machines EN intervention ouverte (considérées "indisponibles")
  const machinesEnMaintenance = new Set(interventionsOuvertes.map(iv => iv.machineId));

  // Disponibilité par atelier
  const disponibiliteParAtelier = machinesParAtelier.map(a => {
    const total        = a.machines.length;
    const indispos     = a.machines.filter(m => machinesEnMaintenance.has(m.id)).length;
    const dispo        = total > 0 ? Math.round(((total - indispos) / total) * 100) : 100;
    const interventions = interventionsParAtelier
      .filter(iv => machineAtelierMap[iv.machineId]?.atelierId === a.id)
      .reduce((s, iv) => s + iv._count._all, 0);

    return {
      id: a.id, nom: a.nom, total, indispos,
      disponibilite: dispo,
      interventionsOuvertes: interventions,
    };
  });

  // Répartition par état pour le graphique donut
  const donutData = [
    { label: 'Demande',    etat: 'DEMANDE',     count: parEtat['DEMANDE']     || 0, color: '#1d9e75' },
    { label: 'En cours',   etat: 'EN_COURS',    count: parEtat['EN_COURS']    || 0, color: '#AFA9EC' },
    { label: 'Préparation',etat: 'PREPARATION', count: parEtat['PREPARATION'] || 0, color: '#EF9F27' },
    { label: 'Urgent',     etat: 'URGENT',      count: parEtat['URGENT']      || 0, color: '#e24b4a' },
    { label: 'À clôturer', etat: 'A_CLOTURER',  count: parEtat['A_CLOTURER']  || 0, color: '#f09595' },
    { label: 'Autre',      etat: 'AUTRE',       count: parEtat['AUTRE']       || 0, color: '#6b7280' },
  ].filter(d => d.count > 0);

  const totalOuverts = etatsOuverts.reduce((s, e) => s + (parEtat[e] || 0), 0);

  return {
    kpis: {
      totalOuverts,
      urgentes:      (parEtat['URGENT']     || 0),
      enCours:       (parEtat['EN_COURS']   || 0),
      demandes:      (parEtat['DEMANDE']    || 0),
      aCloturer:     (parEtat['A_CLOTURER'] || 0),
      enRetard,
      preventif7j:   0,          // TODO: étape 8 — module préventif
      stockAlertes:  stockAlertes[0]?.count ?? 0,
      terminees7j:   recentesTerminees,
    },
    disponibiliteParAtelier,
    donutData,
  };
};

// ============================================================
// #REGION taches-du-jour
// ============================================================

/**
 * Tâches du jour pour le technicien connecté.
 * Retourne ses interventions ouvertes + urgentes.
 */
const getTachesAujourdhui = async (technicienId) => {
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [taches, stats] = await Promise.all([
    prisma.intervention.findMany({
      where: {
        technicienId,
        etat: { in: ['DEMANDE', 'EN_COURS', 'URGENT', 'PREPARATION', 'A_CLOTURER'] },
      },
      orderBy: [{ priorite: 'desc' }, { dateDemande: 'asc' }],
      take:    20,
      include: {
        machine: { select: { id:true, nom:true, atelier: { select: { nom:true } } } },
      },
    }),
    prisma.intervention.groupBy({
      by:    ['etat'],
      _count: { _all: true },
      where: { technicienId, etat: { not: 'TERMINE' } },
    }),
  ]);

  return {
    taches,
    statsPersonnelles: {
      total:   stats.reduce((s, e) => s + e._count._all, 0),
      urgentes: stats.find(e => e.etat === 'URGENT')?._count._all  || 0,
      enCours:  stats.find(e => e.etat === 'EN_COURS')?._count._all || 0,
    },
  };
};

// ============================================================
// #REGION kpis-production
// ============================================================

/**
 * Vue limitée pour le profil Production :
 * uniquement ses propres demandes.
 */
const getKpisProduction = async (demandeurId) => {
  const stats = await prisma.intervention.groupBy({
    by:     ['etat'],
    _count: { _all: true },
    where:  { demandeurId },
  });

  const mesDemandes = await prisma.intervention.findMany({
    where:   { demandeurId, etat: { not: 'TERMINE' } },
    orderBy: { dateDemande: 'desc' },
    take:    10,
    include: {
      machine: { select: { id:true, nom:true, atelier: { select: { nom:true } } } },
    },
  });

  return {
    stats: stats.reduce((acc, s) => { acc[s.etat] = s._count._all; return acc; }, {}),
    mesDemandes,
  };
};

// ============================================================
// #REGION alertes
// ============================================================

/**
 * Retourne les alertes critiques pour la bannière du dashboard.
 */
const getAlertes = async () => {
  const alertes = [];

  // Interventions urgentes non assignées
  const urgentesNonAssignees = await prisma.intervention.count({
    where: { etat: 'URGENT', technicienId: null },
  });
  if (urgentesNonAssignees > 0) {
    alertes.push({
      type:    'DANGER',
      code:    'URGENT_NON_ASSIGNE',
      message: `${urgentesNonAssignees} intervention(s) URGENTE(S) sans technicien assigné`,
      lien:    '/interventions/kanban',
    });
  }

  // Stock critique (quantiteStock = 0)
  const stockZero = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM pieces WHERE quantite_stock = 0 AND seuil_alerte > 0
  `;
  if ((stockZero[0]?.count ?? 0) > 0) {
    alertes.push({
      type:    'DANGER',
      code:    'STOCK_ZERO',
      message: `${stockZero[0].count} pièce(s) en rupture de stock totale`,
      lien:    '/stock',
    });
  }

  // À clôturer depuis plus de 3 jours
  const retardCloture = await prisma.intervention.count({
    where: {
      etat:        'A_CLOTURER',
      dateDemande: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    },
  });
  if (retardCloture > 0) {
    alertes.push({
      type:    'WARNING',
      code:    'RETARD_CLOTURE',
      message: `${retardCloture} intervention(s) en attente de clôture depuis plus de 3 jours`,
      lien:    '/interventions',
    });
  }

  return alertes;
};

module.exports = {
  getKpisGlobaux,
  getTachesAujourdhui,
  getKpisProduction,
  getAlertes,
};
