<template>
  <!-- ====================================================
    MODULE: DASHBOARD — ProductionDashboard
    Vue simplifiée pour le profil Production.
    Affiche uniquement ses propres demandes + bouton créer.
  ==================================================== -->
  <div class="prod-dash">

    <!-- Résumé rapide -->
    <div class="prod-stats">
      <div class="pstat" :class="{ 'pstat-alert': (data.stats?.URGENT ?? 0) > 0 }">
        <span class="pstat-val">{{ data.stats?.URGENT ?? 0 }}</span>
        <span class="pstat-lbl">Urgente(s)</span>
      </div>
      <div class="pstat">
        <span class="pstat-val">{{ data.stats?.EN_COURS ?? 0 }}</span>
        <span class="pstat-lbl">En cours</span>
      </div>
      <div class="pstat">
        <span class="pstat-val">{{ data.stats?.DEMANDE ?? 0 }}</span>
        <span class="pstat-lbl">En attente</span>
      </div>
      <div class="pstat pstat-success">
        <span class="pstat-val">{{ data.stats?.TERMINE ?? 0 }}</span>
        <span class="pstat-lbl">Terminée(s)</span>
      </div>
    </div>

    <!-- Bouton CTA principal -->
    <div class="prod-cta">
      <button class="btn-cta" @click="$emit('nouvelle-demande')">
        <i class="ti ti-plus" aria-hidden="true"></i>
        Soumettre une demande d'intervention
      </button>
    </div>

    <!-- Mes demandes en cours -->
    <div class="prod-card">
      <div class="prod-card-header">
        <h2><i class="ti ti-clipboard-list" aria-hidden="true"></i> Mes demandes en cours</h2>
      </div>

      <div v-if="!data.mesDemandes?.length" class="prod-empty">
        <i class="ti ti-check" aria-hidden="true"></i>
        <p>Aucune demande en cours.</p>
      </div>

      <div v-else class="prod-list">
        <div v-for="iv in data.mesDemandes" :key="iv.id" class="prod-item">
          <div class="prod-prio" :class="`prio-${iv.priorite.toLowerCase()}`">
            {{ prioLabel(iv.priorite) }}
          </div>
          <div class="prod-info">
            <div class="prod-machine">
              <i class="ti ti-tools" aria-hidden="true"></i>
              {{ iv.machine?.atelier?.nom }} / {{ iv.machine?.nom }}
            </div>
            <div class="prod-etat-row">
              <span class="prod-etat" :class="`etat-${iv.etat.toLowerCase()}`">{{ etatLabel(iv.etat) }}</span>
              <span class="prod-date">{{ formatDate(iv.dateDemande) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Accès checklist niveau 1 -->
    <div class="prod-card">
      <div class="prod-card-header">
        <h2><i class="ti ti-list-check" aria-hidden="true"></i> Checklist préventif niveau 1</h2>
      </div>
      <div class="prod-empty">
        <i class="ti ti-calendar-check" aria-hidden="true"></i>
        <p>Module préventif disponible à l'étape 8.</p>
      </div>
    </div>

  </div>
</template>

<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['nouvelle-demande'])

const etatLabel = (e) => ({
  DEMANDE: 'En attente', EN_COURS: 'En cours', URGENT: 'URGENT',
  PREPARATION: 'En préparation', A_CLOTURER: 'Terminé', TERMINE: 'Clôturé',
}[e] || e)

const prioLabel = (p) => ({ URGENT: '🔴 Urgent', HAUTE: '🟠 Haute', NORMALE: '🟢 Normale', FAIBLE: '⚪ Faible' }[p] || p)
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : ''
</script>

<style scoped>
.prod-dash { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; max-width: 720px; }

.prod-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pstat {
  background: #16181f; border: 1px solid #2a2d38; border-radius: 10px;
  padding: 14px; text-align: center;
}
.pstat-alert  { border-color: rgba(226,75,74,0.4); background: rgba(226,75,74,0.06); }
.pstat-success { border-color: rgba(29,158,117,0.3); }
.pstat-val    { font-size: 28px; font-weight: 700; color: #e8e8e8; display: block; }
.pstat-lbl    { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }

.prod-cta { }
.btn-cta {
  width: 100%; padding: 16px; background: #1d9e75; color: #fff;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-cta:hover { background: #17836a; }
.btn-cta i { font-size: 20px; }

.prod-card { background: #16181f; border: 1px solid #2a2d38; border-radius: 12px; overflow: hidden; }
.prod-card-header { padding: 12px 16px; border-bottom: 1px solid #2a2d38; }
.prod-card-header h2 { font-size: 14px; font-weight: 500; color: #e8e8e8; margin: 0; display: flex; align-items: center; gap: 7px; }
.prod-card-header h2 i { color: #1d9e75; }

.prod-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 2rem; color: #6b7280; text-align: center; }
.prod-empty i { font-size: 24px; color: #1d9e75; }
.prod-empty p { font-size: 13px; margin: 0; }

.prod-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.prod-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #0f1117; border-radius: 8px; border: 1px solid #2a2d38; }
.prod-prio { font-size: 11px; white-space: nowrap; min-width: 70px; }
.prod-info { flex: 1; }
.prod-machine { font-size: 12px; color: #c9cad1; display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.prod-machine i { font-size: 12px; color: #6b7280; }
.prod-etat-row { display: flex; align-items: center; gap: 8px; }
.prod-etat { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
.etat-urgent   { background: rgba(226,75,74,0.2); color: #f09595; }
.etat-en_cours { background: rgba(83,74,183,0.2); color: #AFA9EC; }
.etat-demande  { background: rgba(29,158,117,0.15); color: #5DCAA5; }
.etat-preparation { background: rgba(239,159,39,0.15); color: #EF9F27; }
.etat-a_cloturer  { background: rgba(239,159,39,0.15); color: #EF9F27; }
.etat-termine  { background: rgba(107,114,128,0.15); color: #6b7280; }
.prod-date { font-size: 11px; color: #6b7280; margin-left: auto; }

@media (max-width: 480px) { .prod-stats { grid-template-columns: repeat(2, 1fr); } }
</style>
