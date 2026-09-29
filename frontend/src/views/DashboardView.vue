<template>
  <!-- ====================================================
    MODULE: DASHBOARD — DashboardView
    Tableau de bord principal adapté au rôle connecté.
    Responsive : PC ↔ tablette atelier.
  ==================================================== -->
  <div class="dashboard">

    <!-- ===== BANNIÈRE D'ALERTES CRITIQUES ===== -->
    <transition-group name="slide-down" tag="div" class="alertes-banner">
      <div
        v-for="alerte in alertes"
        :key="alerte.code"
        class="alerte-item"
        :class="`alerte-${alerte.type.toLowerCase()}`"
        role="alert"
      >
        <i :class="`ti ${alerte.type === 'DANGER' ? 'ti-alert-octagon' : 'ti-alert-triangle'}`" aria-hidden="true"></i>
        <span>{{ alerte.message }}</span>
        <router-link :to="alerte.lien" class="alerte-link">
          Voir <i class="ti ti-arrow-right" aria-hidden="true"></i>
        </router-link>
      </div>
    </transition-group>

    <!-- ===== EN-TÊTE ===== -->
    <div class="dash-header">
      <div class="header-left">
        <h1 class="welcome">
          Bonjour, <span class="name">{{ authStore.fullName || 'Technicien' }}</span>
        </h1>
        <p class="date-line">
          <i class="ti ti-calendar" aria-hidden="true"></i>
          {{ dateAujourdhui }}
          <span class="role-chip">{{ roleLabel }}</span>
        </p>
      </div>
      <button class="btn-refresh" @click="loadDashboard" :disabled="loading" title="Actualiser">
        <i :class="loading ? 'ti ti-loader-2 spin' : 'ti ti-refresh'" aria-hidden="true"></i>
        <span class="refresh-label">Actualiser</span>
      </button>
    </div>

    <!-- ===== VUE PRODUCTION ===== -->
    <template v-if="authStore.isProduction">
      <ProductionDashboard :data="data" @nouvelle-demande="$router.push('/interventions')" />
    </template>

    <!-- ===== VUE MAINTENANCE / ADMIN ===== -->
    <template v-else>

      <!-- Grille KPIs -->
      <section class="kpis-grid" aria-label="Indicateurs clés">

        <KpiCard
          icon="ti-alert-octagon"
          label="Urgentes"
          :value="data.kpis?.urgentes ?? 0"
          color="danger"
          :highlight="(data.kpis?.urgentes ?? 0) > 0"
          link="/interventions/kanban?etat=URGENT"
          tooltip="Interventions à l'état URGENT"
        />
        <KpiCard
          icon="ti-player-play"
          label="En cours"
          :value="data.kpis?.enCours ?? 0"
          color="info"
          link="/interventions/kanban?etat=EN_COURS"
          tooltip="Interventions en cours de traitement"
        />
        <KpiCard
          icon="ti-inbox"
          label="Demandes"
          :value="data.kpis?.demandes ?? 0"
          color="primary"
          link="/interventions/kanban?etat=DEMANDE"
          tooltip="Nouvelles demandes en attente"
        />
        <KpiCard
          icon="ti-clock-exclamation"
          label="En retard"
          :value="data.kpis?.enRetard ?? 0"
          color="warning"
          :highlight="(data.kpis?.enRetard ?? 0) > 0"
          link="/interventions"
          tooltip="Interventions ouvertes dépassant leur délai"
        />
        <KpiCard
          icon="ti-file-check"
          label="À clôturer"
          :value="data.kpis?.aCloturer ?? 0"
          color="warning"
          :highlight="(data.kpis?.aCloturer ?? 0) > 0"
          link="/interventions?etat=A_CLOTURER"
          tooltip="Interventions terminées en attente de clôture"
        />
        <KpiCard
          icon="ti-calendar-check"
          label="Préventif 7j"
          :value="data.kpis?.preventif7j ?? 0"
          color="info"
          link="/preventif"
          tooltip="Tâches préventives à échéance dans 7 jours"
          :disabled="true"
          disabled-label="Étape 8"
        />
        <KpiCard
          icon="ti-alert-triangle"
          label="Stock alertes"
          :value="data.kpis?.stockAlertes ?? 0"
          color="warning"
          :highlight="(data.kpis?.stockAlertes ?? 0) > 0"
          link="/stock?alerteOnly=true"
          tooltip="Pièces sous le seuil d'alerte minimum"
        />
        <KpiCard
          icon="ti-check-circle"
          label="Clôturées (7j)"
          :value="data.kpis?.terminees7j ?? 0"
          color="success"
          link="/interventions?etat=TERMINE"
          tooltip="Interventions clôturées durant les 7 derniers jours"
        />

      </section>

      <!-- Zone principale : graphiques + tâches -->
      <div class="dash-main-grid">

        <!-- Colonne gauche : graphiques -->
        <div class="col-charts">

          <!-- Donut : répartition par état -->
          <section class="chart-card" aria-label="Répartition des interventions par état">
            <div class="card-header">
              <h2 class="card-title">
                <i class="ti ti-chart-donut" aria-hidden="true"></i>
                Répartition par état
              </h2>
              <span class="card-sub">{{ data.kpis?.totalOuverts ?? 0 }} ouvertes</span>
            </div>
            <div class="chart-body donut-body">
              <DonutChart
                v-if="data.donutData?.length"
                :segments="data.donutData"
                title="Interventions par état"
                subtitle="ouvertes"
              />
              <div v-else class="chart-empty">
                <i class="ti ti-check-circle" aria-hidden="true"></i>
                <span>Aucune intervention ouverte</span>
              </div>
            </div>
          </section>

          <!-- Barres : disponibilité par atelier -->
          <section class="chart-card" aria-label="Disponibilité des machines par atelier">
            <div class="card-header">
              <h2 class="card-title">
                <i class="ti ti-building-factory-2" aria-hidden="true"></i>
                Disponibilité par atelier
              </h2>
            </div>
            <div class="ateliers-list" v-if="data.disponibiliteParAtelier?.length">
              <div
                v-for="a in data.disponibiliteParAtelier"
                :key="a.id"
                class="atelier-row"
              >
                <div class="atelier-info">
                  <span class="atelier-nom">{{ a.nom }}</span>
                  <span class="atelier-machines">{{ a.total }} machine(s)</span>
                </div>
                <div class="bar-track" :aria-label="`${a.nom} : ${a.disponibilite}% disponible`">
                  <div
                    class="bar-fill"
                    :class="barClass(a.disponibilite)"
                    :style="{ width: a.disponibilite + '%' }"
                  ></div>
                </div>
                <span class="dispo-pct" :class="barClass(a.disponibilite)">
                  {{ a.disponibilite }}%
                </span>
                <span v-if="a.interventionsOuvertes > 0" class="iv-badge">
                  {{ a.interventionsOuvertes }} en cours
                </span>
              </div>
            </div>
            <div v-else class="chart-empty">
              <i class="ti ti-building-factory" aria-hidden="true"></i>
              <span>Aucun atelier enregistré</span>
            </div>
          </section>

        </div><!-- /col-charts -->

        <!-- Colonne droite : tâches + accès rapide -->
        <div class="col-right">

          <!-- Tâches du jour -->
          <section class="chart-card tasks-card" aria-label="Mes tâches du jour">
            <div class="card-header">
              <h2 class="card-title">
                <i class="ti ti-list-check" aria-hidden="true"></i>
                Mes tâches du jour
              </h2>
              <div class="tasks-stats" v-if="data.tachesAujourdhui">
                <span class="tstat urgent">{{ data.tachesAujourdhui.statsPersonnelles?.urgentes ?? 0 }} urgente(s)</span>
                <span class="tstat normal">{{ data.tachesAujourdhui.statsPersonnelles?.enCours ?? 0 }} en cours</span>
              </div>
            </div>

            <div class="tasks-list" v-if="data.tachesAujourdhui?.taches?.length">
              <div
                v-for="tache in data.tachesAujourdhui.taches"
                :key="tache.id"
                class="task-item"
                :class="`prio-${tache.priorite.toLowerCase()}`"
                @click="$router.push(`/interventions/${tache.id}`)"
                role="button"
                tabindex="0"
                @keydown.enter="$router.push(`/interventions/${tache.id}`)"
              >
                <div class="task-prio-bar" :class="`bar-${tache.priorite.toLowerCase()}`"></div>
                <div class="task-body">
                  <div class="task-machine">
                    <i class="ti ti-tools" aria-hidden="true"></i>
                    {{ tache.machine?.atelier?.nom }} / {{ tache.machine?.nom }}
                  </div>
                  <div class="task-etat-row">
                    <span class="task-etat" :class="`etat-${tache.etat.toLowerCase()}`">{{ etatLabel(tache.etat) }}</span>
                    <span class="task-date">{{ formatDate(tache.dateDemande) }}</span>
                  </div>
                </div>
                <i class="ti ti-chevron-right task-arrow" aria-hidden="true"></i>
              </div>
            </div>
            <div v-else class="chart-empty tasks-empty">
              <i class="ti ti-sun" aria-hidden="true"></i>
              <span>Aucune tâche assignée pour aujourd'hui</span>
            </div>
          </section>

          <!-- Accès rapide -->
          <section class="quick-actions" aria-label="Actions rapides">
            <h2 class="card-title quick-title">
              <i class="ti ti-zap" aria-hidden="true"></i>
              Accès rapide
            </h2>
            <div class="actions-grid">
              <router-link to="/interventions?action=nouvelle" class="qa-btn qa-green">
                <i class="ti ti-plus" aria-hidden="true"></i>
                <span>Nouvelle<br>demande</span>
              </router-link>
              <router-link to="/interventions/kanban" class="qa-btn qa-purple">
                <i class="ti ti-layout-columns" aria-hidden="true"></i>
                <span>Kanban</span>
              </router-link>
              <router-link to="/stock?action=entree" class="qa-btn qa-blue">
                <i class="ti ti-arrow-down" aria-hidden="true"></i>
                <span>Entrée<br>stock</span>
              </router-link>
              <router-link to="/stock" class="qa-btn qa-orange">
                <i class="ti ti-alert-triangle" aria-hidden="true"></i>
                <span>Alertes<br>stock</span>
              </router-link>
              <router-link to="/equipements" class="qa-btn qa-teal">
                <i class="ti ti-tools" aria-hidden="true"></i>
                <span>Machines</span>
              </router-link>
              <router-link to="/documents" class="qa-btn qa-gray">
                <i class="ti ti-files" aria-hidden="true"></i>
                <span>Documents</span>
              </router-link>
            </div>
          </section>

        </div><!-- /col-right -->

      </div><!-- /dash-main-grid -->

    </template>

  </div><!-- /dashboard -->
</template>

<script setup>
// MODULE: DASHBOARD — DashboardView script
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/api/api'
import DonutChart from '@/components/DonutChart.vue'
import KpiCard    from '@/components/KpiCard.vue'
import ProductionDashboard from '@/components/ProductionDashboard.vue'

const authStore = useAuthStore()
const router    = useRouter()

// #REGION state

const data     = ref({})
const alertes  = ref([])
const loading  = ref(false)
let   pollTimer = null

const dateAujourdhui = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase())
)

const roleLabel = computed(() => ({
  ADMIN:       'Administrateur',
  MAINTENANCE: 'Maintenance',
  PRODUCTION:  'Production',
}[authStore.role] || authStore.role))

// #ENDREGION state

// #REGION data-fetching

const loadDashboard = async () => {
  loading.value = true
  try {
    const [dash, al] = await Promise.all([
      api.get('/dashboard').then(r => r.data),
      authStore.isMaintenance
        ? api.get('/dashboard/alertes').then(r => r.data)
        : Promise.resolve([]),
    ])
    data.value    = dash
    alertes.value = al
  } catch (err) {
    console.error('[Dashboard]', err)
  } finally {
    loading.value = false
  }
}

// Polling léger toutes les 2 minutes pour les alertes
const startPolling = () => {
  pollTimer = setInterval(async () => {
    if (!authStore.isMaintenance) return
    try {
      alertes.value = await api.get('/dashboard/alertes').then(r => r.data)
    } catch { /* silencieux */ }
  }, 2 * 60 * 1000)
}

// #ENDREGION data-fetching

// #REGION helpers

const barClass = (pct) => {
  if (pct >= 90) return 'dispo-ok'
  if (pct >= 70) return 'dispo-warn'
  return 'dispo-critical'
}

const etatLabel = (e) => ({
  DEMANDE: 'Demande', EN_COURS: 'En cours', PREPARATION: 'Prép.',
  URGENT: 'URGENT', TERMINE: 'Terminé', A_CLOTURER: 'À clôturer', AUTRE: 'Autre',
}[e] || e)

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

// #ENDREGION helpers

onMounted(() => { loadDashboard(); startPolling(); })
onUnmounted(() => { clearInterval(pollTimer); })
</script>

<style scoped>
/* MODULE: DASHBOARD — DashboardView styles */
.dashboard {
  padding: 0;
  background: #0f1117;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

/* ===== Alertes banner ===== */
.alertes-banner { display: flex; flex-direction: column; gap: 0; }
.alerte-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 20px;
  font-size: 13px; font-weight: 500;
}
.alerte-item i { font-size: 15px; flex-shrink: 0; }
.alerte-item span { flex: 1; }
.alerte-danger  { background: rgba(226,75,74,0.15); color: #f09595; border-bottom: 1px solid rgba(226,75,74,0.2); }
.alerte-warning { background: rgba(239,159,39,0.12); color: #EF9F27; border-bottom: 1px solid rgba(239,159,39,0.2); }
.alerte-link {
  display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  padding: 3px 10px; border-radius: 20px; border: 1px solid currentColor;
  text-decoration: none; color: inherit; white-space: nowrap; opacity: 0.8;
}
.alerte-link:hover { opacity: 1; }

/* Transition alertes */
.slide-down-enter-active { animation: slideIn 0.3s ease; }
.slide-down-leave-active  { animation: slideIn 0.2s ease reverse; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

/* ===== Header ===== */
.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 20px 12px; gap: 12px;
}
.header-left { display: flex; flex-direction: column; gap: 4px; }
.welcome { font-size: 20px; font-weight: 600; color: #e8e8e8; margin: 0; }
.name    { color: #1d9e75; }
.date-line { font-size: 13px; color: #9ca3af; margin: 0; display: flex; align-items: center; gap: 8px; }
.date-line i { color: #6b7280; }
.role-chip { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: #1e2030; color: #6b7280; border: 1px solid #2a2d38; }

.btn-refresh {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: #16181f; border: 1px solid #2a2d38;
  border-radius: 8px; color: #9ca3af; font-size: 12px; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
}
.btn-refresh:hover:not(:disabled) { background: #1e2030; color: #e8e8e8; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== Grille KPIs ===== */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 0 20px 16px;
}

/* ===== Layout principal ===== */
.dash-main-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 14px;
  padding: 0 20px 20px;
}

.col-charts { display: flex; flex-direction: column; gap: 14px; }
.col-right  { display: flex; flex-direction: column; gap: 14px; }

/* ===== Carte générique ===== */
.chart-card {
  background: #16181f;
  border: 1px solid #2a2d38;
  border-radius: 12px;
  overflow: hidden;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #2a2d38;
}
.card-title {
  font-size: 13px; font-weight: 500; color: #e8e8e8; margin: 0;
  display: flex; align-items: center; gap: 7px;
}
.card-title i { color: #1d9e75; font-size: 15px; }
.card-sub { font-size: 12px; color: #6b7280; }
.chart-body { padding: 16px; }

/* Donut */
.donut-body { display: flex; gap: 20px; align-items: flex-start; }
.chart-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 2.5rem; color: #6b7280; font-size: 13px;
}
.chart-empty i { font-size: 28px; }

/* Ateliers disponibilité */
.ateliers-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
.atelier-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.atelier-info { display: flex; flex-direction: column; min-width: 100px; }
.atelier-nom  { font-size: 13px; font-weight: 500; color: #e8e8e8; }
.atelier-machines { font-size: 10px; color: #6b7280; }
.bar-track { flex: 1; height: 8px; background: #1e2030; border-radius: 4px; overflow: hidden; min-width: 80px; }
.bar-fill  { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.dispo-ok.bar-fill       { background: #1d9e75; }
.dispo-warn.bar-fill     { background: #EF9F27; }
.dispo-critical.bar-fill { background: #e24b4a; }
.dispo-pct { font-size: 12px; font-weight: 600; min-width: 36px; text-align: right; }
.dispo-ok       { color: #5DCAA5; }
.dispo-warn     { color: #EF9F27; }
.dispo-critical { color: #f09595; }
.iv-badge { font-size: 10px; padding: 1px 6px; border-radius: 10px; background: rgba(226,75,74,0.15); color: #f09595; border: 1px solid rgba(226,75,74,0.3); white-space: nowrap; }

/* Tâches */
.tasks-stats { display: flex; gap: 8px; }
.tstat { font-size: 11px; padding: 2px 7px; border-radius: 10px; }
.tstat.urgent { background: rgba(226,75,74,0.15); color: #f09595; }
.tstat.normal { background: rgba(83,74,183,0.15); color: #AFA9EC; }

.tasks-list { padding: 8px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.task-item {
  display: flex; align-items: center; gap: 0;
  background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px;
  cursor: pointer; overflow: hidden; transition: border-color 0.12s;
}
.task-item:hover, .task-item:focus-visible { border-color: #1d9e75; outline: none; }
.task-prio-bar { width: 4px; flex-shrink: 0; align-self: stretch; }
.bar-urgent   { background: #e24b4a; }
.bar-haute    { background: #EF9F27; }
.bar-normale  { background: #1d9e75; }
.bar-faible   { background: #6b7280; }
.task-body { flex: 1; padding: 8px 10px; }
.task-machine { font-size: 12px; color: #c9cad1; display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.task-machine i { font-size: 12px; color: #6b7280; }
.task-etat-row { display: flex; align-items: center; gap: 6px; }
.task-etat { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
.etat-urgent      { background: rgba(226,75,74,0.2); color: #f09595; }
.etat-en_cours    { background: rgba(83,74,183,0.2); color: #AFA9EC; }
.etat-demande     { background: rgba(29,158,117,0.15); color: #5DCAA5; }
.etat-preparation { background: rgba(239,159,39,0.15); color: #EF9F27; }
.etat-a_cloturer  { background: rgba(239,159,39,0.15); color: #EF9F27; }
.etat-autre       { background: #1e2030; color: #9ca3af; }
.task-date { font-size: 11px; color: #6b7280; margin-left: auto; }
.task-arrow { font-size: 14px; color: #6b7280; padding: 0 8px; flex-shrink: 0; }
.tasks-empty { padding: 2rem !important; }
.tasks-empty i { font-size: 24px; color: #EF9F27; }

/* Accès rapide */
.quick-actions { background: #16181f; border: 1px solid #2a2d38; border-radius: 12px; padding: 14px 16px; }
.quick-title   { font-size: 13px; font-weight: 500; color: #e8e8e8; margin: 0 0 12px; display: flex; align-items: center; gap: 7px; }
.quick-title i { color: #1d9e75; }
.actions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.qa-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 12px 8px; border-radius: 10px; text-decoration: none;
  font-size: 12px; font-weight: 500; text-align: center; line-height: 1.3;
  transition: opacity 0.15s, transform 0.1s; border: 1px solid transparent;
  min-height: 70px; cursor: pointer;
}
.qa-btn i { font-size: 22px; }
.qa-btn:hover  { opacity: 0.85; transform: translateY(-1px); }
.qa-btn:active { transform: scale(0.97); }
.qa-green  { background: rgba(29,158,117,0.15); color: #5DCAA5; border-color: rgba(29,158,117,0.3); }
.qa-purple { background: rgba(83,74,183,0.15); color: #AFA9EC;  border-color: rgba(83,74,183,0.3); }
.qa-blue   { background: rgba(12,68,124,0.2);  color: #B5D4F4;  border-color: rgba(12,68,124,0.3); }
.qa-orange { background: rgba(239,159,39,0.12); color: #EF9F27; border-color: rgba(239,159,39,0.25); }
.qa-teal   { background: rgba(29,158,117,0.1); color: #5DCAA5;  border-color: rgba(29,158,117,0.2); }
.qa-gray   { background: #1e2030; color: #9ca3af; border-color: #2a2d38; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

/* ===== Responsive tablette ===== */
@media (max-width: 1024px) {
  .kpis-grid    { grid-template-columns: repeat(2, 1fr); }
  .dash-main-grid { grid-template-columns: 1fr; }
  .col-right    { flex-direction: row; flex-wrap: wrap; }
  .col-right .chart-card, .col-right .quick-actions { flex: 1 1 300px; }
  .donut-body   { flex-direction: column; align-items: center; }
}

@media (max-width: 640px) {
  .kpis-grid    { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .dash-header  { padding: 14px 12px 10px; }
  .dash-main-grid { padding: 0 12px 16px; }
  .kpis-grid    { padding: 0 12px 12px; }
  .welcome      { font-size: 17px; }
  .actions-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .refresh-label { display: none; }
  .col-right    { flex-direction: column; }
}
</style>
