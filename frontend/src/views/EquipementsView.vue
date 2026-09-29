<template>
  <!-- ====================================================
    MODULE: EQUIPEMENTS — EquipementsView
    Vue principale : panneau latéral + contenu central.
    Deux modes : arborescence (défaut) et liste plate.
  ==================================================== -->
  <div class="equip-layout">

    <!-- ===== PANNEAU LATÉRAL ===== -->
    <AtelierTree
      :ateliers="store.tree"
      :loading="store.loadingTree"
      :selected-atelier-id="store.selectedAtelierId"
      :selected-machine-id="selectedMachineId"
      @select-machine="openMachine"
      @create-atelier="openCreateAtelier"
      @create-machine="openCreateMachine"
    />

    <!-- ===== CONTENU PRINCIPAL ===== -->
    <div class="equip-main">

      <!-- Barre d'outils principale -->
      <div class="equip-topbar">
        <div class="topbar-left">
          <button
            v-if="selectedMachineId"
            class="btn-back"
            @click="closeMachine"
            aria-label="Retour à la liste"
          >
            <i class="ti ti-arrow-left" aria-hidden="true"></i>
          </button>
          <h1 class="topbar-title">
            <template v-if="store.selectedMachine">
              <span class="breadcrumb-atelier">{{ store.selectedMachine.atelier?.nom }}</span>
              <i class="ti ti-chevron-right bc-sep" aria-hidden="true"></i>
              {{ store.selectedMachine.nom }}
            </template>
            <template v-else>
              Équipements
              <span class="equip-count" v-if="store.machines.length">
                {{ store.machines.length }} machines
              </span>
            </template>
          </h1>
        </div>

        <div class="topbar-actions">
          <!-- Vue liste / arborescence -->
          <div class="view-toggle" v-if="!selectedMachineId">
            <button
              :class="['toggle-btn', { active: viewMode === 'list' }]"
              @click="viewMode = 'list'"
              aria-label="Vue liste"
              title="Vue liste"
            >
              <i class="ti ti-list" aria-hidden="true"></i>
            </button>
            <button
              :class="['toggle-btn', { active: viewMode === 'grid' }]"
              @click="viewMode = 'grid'"
              aria-label="Vue grille"
              title="Vue grille"
            >
              <i class="ti ti-layout-grid" aria-hidden="true"></i>
            </button>
          </div>

          <!-- Actions machine (quand une machine est sélectionnée) -->
          <template v-if="store.selectedMachine && isAdmin">
            <button class="btn-secondary" @click="openEditMachine(store.selectedMachine)">
              <i class="ti ti-edit" aria-hidden="true"></i> Modifier
            </button>
            <button
              v-if="store.selectedMachine.actif"
              class="btn-danger-sm"
              @click="handleArchiveMachine(store.selectedMachine)"
            >
              <i class="ti ti-archive" aria-hidden="true"></i> Archiver
            </button>
          </template>
        </div>
      </div>

      <!-- ——— Vue machine sélectionnée ——— -->
      <MachineDetailView v-if="selectedMachineId" :machine-id="selectedMachineId" />

      <!-- ——— Vue liste des machines ——— -->
      <div v-else class="machines-content">

        <!-- Filtres -->
        <div class="list-filters">
          <div class="search-box">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input v-model="searchQ" type="search" placeholder="Rechercher une machine…" />
          </div>
          <label class="filter-check">
            <input type="checkbox" v-model="showArchived" />
            Afficher les archivées
          </label>
        </div>

        <!-- Grille de cartes -->
        <div v-if="viewMode === 'grid'" class="machines-grid">
          <div
            v-for="m in filteredMachines"
            :key="m.id"
            class="machine-card"
            :class="{ archived: !m.actif }"
            @click="openMachine(m.id)"
            tabindex="0"
            @keydown.enter="openMachine(m.id)"
            role="button"
          >
            <div class="card-photo">
              <img
                v-if="m.photoUrl"
                :src="`/uploads/${m.photoUrl}`"
                :alt="`Photo de ${m.nom}`"
                loading="lazy"
              />
              <i v-else class="ti ti-tools card-no-photo" aria-hidden="true"></i>
            </div>
            <div class="card-body">
              <div class="card-atelier">{{ m.atelier?.nom }}</div>
              <div class="card-nom">{{ m.nom }}</div>
              <div class="card-meta">
                <span v-if="m.marque">{{ m.marque }}</span>
                <span v-if="m.modele" class="meta-sep">·</span>
                <span v-if="m.modele">{{ m.modele }}</span>
              </div>
              <div class="card-stats">
                <span class="stat-chip">
                  <i class="ti ti-components" aria-hidden="true"></i>
                  {{ m._count?.elements ?? 0 }} éléments
                </span>
                <span class="stat-chip">
                  <i class="ti ti-tool" aria-hidden="true"></i>
                  {{ m._count?.interventions ?? 0 }} interventions
                </span>
              </div>
              <span v-if="!m.actif" class="archived-badge">Archivée</span>
            </div>
          </div>

          <div v-if="filteredMachines.length === 0" class="empty-state">
            <i class="ti ti-mood-empty" aria-hidden="true"></i>
            <p>Aucune machine trouvée.</p>
          </div>
        </div>

        <!-- Vue liste -->
        <div v-else class="table-wrapper">
          <table class="machines-table" aria-label="Liste des machines">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Atelier</th>
                <th>Marque / Modèle</th>
                <th>Localisation</th>
                <th>Éléments</th>
                <th>Interventions</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loadingTree">
                <td colspan="7" class="table-loading">
                  <i class="ti ti-loader-2 spin" aria-hidden="true"></i> Chargement…
                </td>
              </tr>
              <tr
                v-for="m in filteredMachines"
                :key="m.id"
                @click="openMachine(m.id)"
                class="machine-row"
                :class="{ archived: !m.actif }"
                tabindex="0"
                @keydown.enter="openMachine(m.id)"
              >
                <td>
                  <div class="row-machine">
                    <div class="row-thumb">
                      <img v-if="m.photoUrl" :src="`/uploads/${m.photoUrl}`" :alt="m.nom" />
                      <i v-else class="ti ti-tools" aria-hidden="true"></i>
                    </div>
                    <span>{{ m.nom }}</span>
                  </div>
                </td>
                <td>{{ m.atelier?.nom }}</td>
                <td class="text-muted">{{ [m.marque, m.modele].filter(Boolean).join(' / ') || '—' }}</td>
                <td class="text-muted">{{ m.localisation || '—' }}</td>
                <td class="text-center">{{ m._count?.elements ?? 0 }}</td>
                <td class="text-center">{{ m._count?.interventions ?? 0 }}</td>
                <td>
                  <span :class="m.actif ? 'badge-active' : 'badge-archived'">
                    {{ m.actif ? 'Active' : 'Archivée' }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredMachines.length === 0 && !store.loadingTree">
                <td colspan="7" class="table-loading">Aucune machine trouvée.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div><!-- /equip-main -->

    <!-- ====================================================
      MODALES CRUD (Atelier / Machine) avec code de confirmation
    ==================================================== -->

    <!-- Modal Atelier -->
    <Teleport to="body">
      <ConfirmCodeModal
        v-if="showAtelierModal"
        :title="editingAtelier ? 'Modifier l\'atelier' : 'Nouvel atelier'"
        :saving="saving"
        :error="modalError"
        @confirm="handleSaveAtelier"
        @cancel="showAtelierModal = false"
      >
        <div class="form-stack">
          <div class="field-group">
            <label>Nom de l'atelier *</label>
            <input v-model="atelierForm.nom" type="text" placeholder="ex: Atelier Usinage" />
          </div>
          <div class="field-group">
            <label>Description</label>
            <textarea v-model="atelierForm.description" rows="3" placeholder="Description optionnelle…"></textarea>
          </div>
        </div>
      </ConfirmCodeModal>
    </Teleport>

    <!-- Modal Machine -->
    <Teleport to="body">
      <ConfirmCodeModal
        v-if="showMachineModal"
        :title="editingMachine ? 'Modifier la machine' : 'Nouvelle machine'"
        :saving="saving"
        :error="modalError"
        @confirm="handleSaveMachine"
        @cancel="showMachineModal = false"
      >
        <div class="form-grid-2">
          <div class="field-group full">
            <label>Atelier *</label>
            <select v-model="machineForm.atelierId" :disabled="!!editingMachine">
              <option value="">— Sélectionner —</option>
              <option v-for="a in store.tree" :key="a.id" :value="a.id">{{ a.nom }}</option>
            </select>
          </div>
          <div class="field-group full">
            <label>Nom de la machine *</label>
            <input v-model="machineForm.nom" type="text" placeholder="ex: Tour CN MAZAK" />
          </div>
          <div class="field-group">
            <label>Marque</label>
            <input v-model="machineForm.marque" type="text" placeholder="ex: MAZAK" />
          </div>
          <div class="field-group">
            <label>Modèle</label>
            <input v-model="machineForm.modele" type="text" placeholder="ex: QT-200" />
          </div>
          <div class="field-group">
            <label>Réf. fournisseur</label>
            <input v-model="machineForm.referenceFournisseur" type="text" />
          </div>
          <div class="field-group">
            <label>N° de série</label>
            <input v-model="machineForm.numeroSerie" type="text" />
          </div>
          <div class="field-group full">
            <label>Localisation</label>
            <input v-model="machineForm.localisation" type="text" placeholder="ex: Allée B, poste 3" />
          </div>
          <div class="field-group full">
            <label>Informations techniques</label>
            <textarea v-model="machineForm.informationsTechniques" rows="3" placeholder="Puissance, vitesse, caractéristiques…"></textarea>
          </div>
        </div>
      </ConfirmCodeModal>
    </Teleport>

  </div>
</template>

<script setup>
// MODULE: EQUIPEMENTS — EquipementsView script
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useEquipementsStore } from '@/stores/equipements.store'
import { useAuthStore }        from '@/stores/auth.store'
import AtelierTree             from '@/components/AtelierTree.vue'
import MachineDetailView       from './MachineDetailView.vue'
import ConfirmCodeModal        from '@/components/ConfirmCodeModal.vue'
import * as equipApi           from '@/api/equipements.api'

const store     = useEquipementsStore()
const authStore = useAuthStore()
const isAdmin   = computed(() => authStore.isAdmin)

// #REGION view-state

const viewMode          = ref('grid')
const searchQ           = ref('')
const showArchived      = ref(false)
const selectedMachineId = ref(null)

const filteredMachines = computed(() => {
  return store.machines.filter(m => {
    if (!showArchived.value && !m.actif) return false
    if (!searchQ.value) return true
    const q = searchQ.value.toLowerCase()
    return m.nom.toLowerCase().includes(q) ||
      m.marque?.toLowerCase().includes(q) ||
      m.modele?.toLowerCase().includes(q) ||
      m.atelier?.nom.toLowerCase().includes(q)
  })
})

// #ENDREGION view-state

// #REGION machine-navigation

const openMachine = async (id) => {
  selectedMachineId.value = id
  await store.fetchMachine(id)
}

const closeMachine = () => {
  selectedMachineId.value = null
  store.selectedMachine   = null
}

// #ENDREGION machine-navigation

// #REGION modales

const saving      = ref(false)
const modalError  = ref('')
const showAtelierModal = ref(false)
const showMachineModal = ref(false)
const editingAtelier   = ref(null)
const editingMachine   = ref(null)

const atelierForm  = reactive({ nom: '', description: '' })
const machineForm  = reactive({
  atelierId: '', nom: '', marque: '', modele: '',
  referenceFournisseur: '', numeroSerie: '', localisation: '', informationsTechniques: '',
})

const openCreateAtelier = () => {
  editingAtelier.value = null
  Object.assign(atelierForm, { nom: '', description: '' })
  modalError.value = ''
  showAtelierModal.value = true
}

const openEditAtelier = (a) => {
  editingAtelier.value = a
  Object.assign(atelierForm, { nom: a.nom, description: a.description || '' })
  modalError.value = ''
  showAtelierModal.value = true
}

const openCreateMachine = (atelierId) => {
  editingMachine.value = null
  Object.assign(machineForm, { atelierId: atelierId || '', nom: '', marque: '', modele: '',
    referenceFournisseur: '', numeroSerie: '', localisation: '', informationsTechniques: '' })
  modalError.value = ''
  showMachineModal.value = true
}

const openEditMachine = (m) => {
  editingMachine.value = m
  Object.assign(machineForm, {
    atelierId:            m.atelierId,
    nom:                  m.nom,
    marque:               m.marque || '',
    modele:               m.modele || '',
    referenceFournisseur: m.referenceFournisseur || '',
    numeroSerie:          m.numeroSerie || '',
    localisation:         m.localisation || '',
    informationsTechniques: m.informationsTechniques || '',
  })
  modalError.value = ''
  showMachineModal.value = true
}

// #ENDREGION modales

// #REGION handlers-crud

const handleSaveAtelier = async (code) => {
  if (!atelierForm.nom.trim()) { modalError.value = 'Le nom est requis.'; return }
  saving.value = true
  modalError.value = ''
  try {
    if (editingAtelier.value) {
      await equipApi.updateAtelier(editingAtelier.value.id, atelierForm, code)
    } else {
      await equipApi.createAtelier(atelierForm, code)
    }
    await store.fetchTree()
    await store.fetchMachines()
    showAtelierModal.value = false
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Erreur lors de l\'enregistrement.'
  } finally {
    saving.value = false
  }
}

const handleSaveMachine = async (code) => {
  if (!machineForm.nom.trim() || !machineForm.atelierId) {
    modalError.value = 'Atelier et nom de machine sont requis.'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    if (editingMachine.value) {
      const updated = await equipApi.updateMachine(editingMachine.value.id, machineForm, code)
      store.patchMachineInTree(updated.data)
    } else {
      await equipApi.createMachine(machineForm, code)
    }
    await store.fetchTree()
    await store.fetchMachines()
    showMachineModal.value = false
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Erreur lors de l\'enregistrement.'
  } finally {
    saving.value = false
  }
}

const handleArchiveMachine = async (machine) => {
  const code = prompt('Code administrateur requis pour archiver cette machine :')
  if (!code) return
  try {
    await equipApi.archiveMachine(machine.id, code)
    store.removeMachineFromTree(machine.id, machine.atelierId)
    closeMachine()
    await store.fetchMachines()
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de l\'archivage.')
  }
}

// #ENDREGION handlers-crud

// #REGION init

onMounted(async () => {
  await store.fetchTree()
  await store.fetchMachines()
})

// #ENDREGION init
</script>

<style scoped>
/* MODULE: EQUIPEMENTS — EquipementsView styles */
.equip-layout {
  display: flex;
  height: calc(100vh - 60px); /* hauteur = viewport - navbar */
  overflow: hidden;
}

.equip-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f1117;
}

/* Topbar */
.equip-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #2a2d38;
  background: #16181f;
  gap: 12px;
  flex-shrink: 0;
}

.topbar-left  { display: flex; align-items: center; gap: 10px; }
.topbar-title { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; display: flex; align-items: center; gap: 6px; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }

.breadcrumb-atelier { color: #6b7280; font-weight: 400; }
.bc-sep { font-size: 12px; color: #3d4151; }

.equip-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
  background: #1e2030;
  padding: 2px 8px;
  border-radius: 20px;
}

.btn-back {
  background: none;
  border: 1px solid #2a2d38;
  border-radius: 7px;
  padding: 6px 10px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
}
.btn-back:hover { background: #1e2030; color: #e8e8e8; }

/* View toggle */
.view-toggle { display: flex; border: 1px solid #2a2d38; border-radius: 7px; overflow: hidden; }
.toggle-btn { background: none; border: none; padding: 6px 10px; color: #6b7280; cursor: pointer; font-size: 15px; }
.toggle-btn.active { background: #1e2030; color: #1d9e75; }

/* Boutons d'action */
.btn-secondary {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; background: #1e2030; color: #c9cad1;
  border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.btn-secondary:hover { background: #252840; }

.btn-danger-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; background: rgba(226,75,74,0.1); color: #f09595;
  border: 1px solid rgba(226,75,74,0.3); border-radius: 8px; font-size: 13px; cursor: pointer;
}
.btn-danger-sm:hover { background: rgba(226,75,74,0.2); }

/* Contenu machines */
.machines-content { flex: 1; overflow-y: auto; padding: 20px; }

/* Filtres */
.list-filters {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
}
.search-box {
  display: flex; align-items: center; gap: 8px; background: #16181f;
  border: 1px solid #2a2d38; border-radius: 8px; padding: 0 12px; flex: 1; min-width: 200px;
}
.search-box i { color: #6b7280; }
.search-box input { background: none; border: none; outline: none; color: #e8e8e8; font-size: 13px; padding: 8px 0; width: 100%; }
.filter-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; cursor: pointer; }

/* Grille cartes */
.machines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.machine-card {
  background: #16181f;
  border: 1px solid #2a2d38;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
  position: relative;
}
.machine-card:hover { border-color: #1d9e75; transform: translateY(-1px); }
.machine-card:focus-visible { outline: 2px solid #1d9e75; }
.machine-card.archived { opacity: 0.55; }

.card-photo {
  height: 120px;
  background: #0f1117;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.card-photo img { width: 100%; height: 100%; object-fit: cover; }
.card-no-photo { font-size: 36px; color: #2a2d38; }

.card-body { padding: 12px; }
.card-atelier { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.card-nom     { font-size: 14px; font-weight: 500; color: #e8e8e8; margin-bottom: 3px; }
.card-meta    { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
.meta-sep     { margin: 0 4px; }
.card-stats   { display: flex; gap: 6px; flex-wrap: wrap; }
.stat-chip    { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #6b7280; background: #0f1117; border-radius: 4px; padding: 2px 6px; }
.stat-chip i  { font-size: 11px; }

.archived-badge {
  position: absolute; top: 8px; right: 8px;
  font-size: 9px; background: rgba(226,75,74,0.2); color: #f09595;
  border: 1px solid rgba(226,75,74,0.3); border-radius: 4px; padding: 2px 6px;
}

.empty-state {
  grid-column: 1/-1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 4rem; color: #6b7280;
}
.empty-state i { font-size: 40px; }
.empty-state p { font-size: 14px; margin: 0; }

/* Table liste */
.table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #2a2d38; }
.machines-table { width: 100%; border-collapse: collapse; background: #16181f; }
.machines-table thead tr { background: #0f1117; }
.machines-table th { padding: 10px 14px; font-size: 11px; font-weight: 500; color: #6b7280; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.machines-table td { padding: 10px 14px; font-size: 13px; color: #c9cad1; border-top: 1px solid #1e2030; vertical-align: middle; }
.machine-row { cursor: pointer; }
.machine-row:hover td { background: #1a1d2a; }
.machine-row.archived td { opacity: 0.55; }
.text-muted { color: #6b7280; }
.text-center { text-align: center; }
.table-loading { text-align: center; padding: 2rem !important; color: #6b7280; }

.row-machine { display: flex; align-items: center; gap: 10px; }
.row-thumb {
  width: 36px; height: 36px; border-radius: 6px; background: #0f1117;
  border: 1px solid #2a2d38; display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.row-thumb img { width: 100%; height: 100%; object-fit: cover; }
.row-thumb i { font-size: 16px; color: #3d4151; }

.badge-active   { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(29,158,117,0.15); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.badge-archived { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(107,114,128,0.15); color: #6b7280; border: 1px solid rgba(107,114,128,0.3); }

/* Formulaires modales */
.form-stack  { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.full { grid-column: 1 / -1; }
.field-group label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.field-group input,
.field-group select,
.field-group textarea {
  background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px;
  padding: 9px 12px; font-size: 13px; color: #e8e8e8; outline: none;
  font-family: inherit; resize: vertical;
}
.field-group input:focus,
.field-group select:focus,
.field-group textarea:focus { border-color: #1d9e75; }
.field-group select option { background: #16181f; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .equip-layout  { flex-direction: column; height: auto; }
  .equip-main    { height: auto; overflow: auto; }
  .machines-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .form-grid-2   { grid-template-columns: 1fr; }
  .full          { grid-column: 1; }
}
</style>
