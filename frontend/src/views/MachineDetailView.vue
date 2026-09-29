<template>
  <!-- ====================================================
    MODULE: EQUIPEMENTS — MachineDetailView
    Fiche machine avec onglets : Infos | Éléments | Pièces
    Interventions | Préventif | Documents
  ==================================================== -->
  <div class="machine-detail">

    <!-- Chargement -->
    <div v-if="store.loadingMachine" class="detail-loading">
      <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
      Chargement de la fiche…
    </div>

    <template v-else-if="machine">

      <!-- En-tête fiche machine -->
      <div class="machine-header">
        <div class="header-photo">
          <img
            v-if="machine.photoUrl"
            :src="`/uploads/${machine.photoUrl}`"
            :alt="`Photo de ${machine.nom}`"
          />
          <div v-else class="photo-placeholder">
            <i class="ti ti-tools" aria-hidden="true"></i>
          </div>
          <label v-if="isAdmin" class="photo-upload-btn" :for="`photo-input-${machineId}`" title="Changer la photo">
            <i class="ti ti-camera" aria-hidden="true"></i>
          </label>
          <input
            :id="`photo-input-${machineId}`"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="handlePhotoUpload"
          />
        </div>

        <div class="header-info">
          <div class="header-row1">
            <h2 class="machine-nom">{{ machine.nom }}</h2>
            <span :class="machine.actif ? 'badge-active' : 'badge-archived'">
              {{ machine.actif ? 'Active' : 'Archivée' }}
            </span>
          </div>
          <div class="header-atelier">
            <i class="ti ti-building-factory-2" aria-hidden="true"></i>
            {{ machine.atelier?.nom }}
          </div>
          <div class="header-meta">
            <span v-if="machine.marque"><i class="ti ti-tag" aria-hidden="true"></i>{{ machine.marque }}</span>
            <span v-if="machine.modele"><i class="ti ti-barcode" aria-hidden="true"></i>{{ machine.modele }}</span>
            <span v-if="machine.numeroSerie"><i class="ti ti-fingerprint" aria-hidden="true"></i>N° {{ machine.numeroSerie }}</span>
            <span v-if="machine.localisation"><i class="ti ti-map-pin" aria-hidden="true"></i>{{ machine.localisation }}</span>
          </div>
        </div>

        <!-- Compteurs rapides -->
        <div class="header-counters">
          <div class="counter-item">
            <span class="counter-val">{{ machine._count?.interventions ?? 0 }}</span>
            <span class="counter-lbl">Interventions</span>
          </div>
          <div class="counter-item">
            <span class="counter-val">{{ machine.elements?.length ?? 0 }}</span>
            <span class="counter-lbl">Éléments</span>
          </div>
          <div class="counter-item">
            <span class="counter-val">{{ machine.pieceMachines?.length ?? 0 }}</span>
            <span class="counter-lbl">Pièces</span>
          </div>
          <div class="counter-item">
            <span class="counter-val">{{ machine.documents?.length ?? 0 }}</span>
            <span class="counter-lbl">Documents</span>
          </div>
        </div>
      </div>

      <!-- Navigation par onglets -->
      <nav class="tabs-nav" role="tablist" aria-label="Sections de la fiche machine">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          <i :class="`ti ${tab.icon}`" aria-hidden="true"></i>
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
        </button>
      </nav>

      <!-- ===== ONGLET : Informations générales ===== -->
      <div v-if="activeTab === 'infos'" class="tab-content" role="tabpanel">
        <div class="info-grid">
          <div class="info-section">
            <h3>Identification</h3>
            <dl class="info-dl">
              <div><dt>Nom</dt><dd>{{ machine.nom }}</dd></div>
              <div><dt>Marque</dt><dd>{{ machine.marque || '—' }}</dd></div>
              <div><dt>Modèle</dt><dd>{{ machine.modele || '—' }}</dd></div>
              <div><dt>Réf. fournisseur</dt><dd>{{ machine.referenceFournisseur || '—' }}</dd></div>
              <div><dt>N° de série</dt><dd>{{ machine.numeroSerie || '—' }}</dd></div>
              <div><dt>Localisation</dt><dd>{{ machine.localisation || '—' }}</dd></div>
            </dl>
          </div>
          <div class="info-section">
            <h3>Informations techniques</h3>
            <p class="info-tech">{{ machine.informationsTechniques || 'Aucune information technique renseignée.' }}</p>
          </div>
        </div>
      </div>

      <!-- ===== ONGLET : Éléments ===== -->
      <div v-if="activeTab === 'elements'" class="tab-content" role="tabpanel">
        <div class="tab-toolbar">
          <h3 class="tab-section-title">
            Éléments par chaîne fonctionnelle
          </h3>
          <button v-if="isMaintenance" class="btn-add" @click="showElementModal = true">
            <i class="ti ti-plus" aria-hidden="true"></i> Ajouter
          </button>
        </div>

        <div v-if="!machine.elements?.length" class="empty-tab">
          <i class="ti ti-components" aria-hidden="true"></i>
          <p>Aucun élément enregistré pour cette machine.</p>
        </div>

        <div v-else>
          <div
            v-for="(items, chaine) in machine.elementsByChaine"
            :key="chaine"
            class="chaine-group"
          >
            <div class="chaine-header">
              <i class="ti ti-circuit-diode" aria-hidden="true"></i>
              {{ chaine }}
              <span class="chaine-count">{{ items.length }}</span>
            </div>
            <div class="elements-list">
              <div
                v-for="el in items"
                :key="el.id"
                class="element-item"
              >
                <div class="el-info">
                  <span class="el-nom">{{ el.nom }}</span>
                  <span v-if="el.description" class="el-desc">{{ el.description }}</span>
                </div>
                <div class="el-actions" v-if="isMaintenance">
                  <button class="action-icon" title="Modifier" @click="openEditElement(el)">
                    <i class="ti ti-edit" aria-hidden="true"></i>
                  </button>
                  <button v-if="isAdmin" class="action-icon danger" title="Supprimer" @click="handleDeleteElement(el)">
                    <i class="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== ONGLET : Pièces détachées ===== -->
      <div v-if="activeTab === 'pieces'" class="tab-content" role="tabpanel">
        <div v-if="!machine.pieceMachines?.length" class="empty-tab">
          <i class="ti ti-tools" aria-hidden="true"></i>
          <p>Aucune pièce détachée associée à cette machine.</p>
          <span class="empty-hint">Les associations sont gérées depuis le module Stock.</span>
        </div>
        <div v-else class="pieces-table-wrapper">
          <table class="pieces-table" aria-label="Pièces détachées associées">
            <thead>
              <tr><th>Référence</th><th>Désignation</th><th>Stock</th><th>Seuil</th><th>Fournisseur</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr v-for="pm in machine.pieceMachines" :key="pm.pieceId">
                <td class="ref-cell">{{ pm.piece.reference }}</td>
                <td>{{ pm.piece.nom }}</td>
                <td :class="pm.piece.quantiteStock <= pm.piece.seuilAlerte ? 'stock-alert' : ''">
                  {{ pm.piece.quantiteStock }}
                </td>
                <td class="text-muted">{{ pm.piece.seuilAlerte }}</td>
                <td class="text-muted">{{ pm.piece.fournisseur?.nom || '—' }}</td>
                <td class="text-muted">{{ pm.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== ONGLET : Interventions ===== -->
      <div v-if="activeTab === 'interventions'" class="tab-content" role="tabpanel">
        <div v-if="loadingInterventions" class="empty-tab">
          <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
        </div>
        <div v-else-if="!interventions.length" class="empty-tab">
          <i class="ti ti-clipboard-list" aria-hidden="true"></i>
          <p>Aucune intervention enregistrée pour cette machine.</p>
        </div>
        <div v-else>
          <div class="interventions-list">
            <div
              v-for="iv in interventions"
              :key="iv.id"
              class="iv-card"
            >
              <div class="iv-left">
                <span class="iv-etat" :class="`etat-${iv.etat.toLowerCase()}`">
                  {{ etatLabel(iv.etat) }}
                </span>
                <span class="iv-date">{{ formatDate(iv.dateDemande) }}</span>
              </div>
              <div class="iv-center">
                <span class="iv-type">{{ iv.typeTravaux || 'Intervention' }}</span>
                <span v-if="iv.constat" class="iv-constat">{{ iv.constat }}</span>
              </div>
              <div class="iv-right">
                <span v-if="iv.technicien" class="iv-tech">
                  <i class="ti ti-user" aria-hidden="true"></i>
                  {{ iv.technicien.prenom }} {{ iv.technicien.nom }}
                </span>
                <span v-if="iv.tempsInterventionH" class="iv-time">
                  <i class="ti ti-clock" aria-hidden="true"></i>
                  {{ iv.tempsInterventionH }}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== ONGLET : Préventif ===== -->
      <div v-if="activeTab === 'preventif'" class="tab-content" role="tabpanel">
        <div class="empty-tab">
          <i class="ti ti-calendar-check" aria-hidden="true"></i>
          <p>Module Préventif — disponible à l'étape 8.</p>
          <span class="empty-hint">Le planning préventif de cette machine s'affichera ici.</span>
        </div>
      </div>

      <!-- ===== ONGLET : Documents ===== -->
      <div v-if="activeTab === 'documents'" class="tab-content" role="tabpanel">
        <div v-if="!machine.documents?.length" class="empty-tab">
          <i class="ti ti-file-description" aria-hidden="true"></i>
          <p>Aucun document technique associé à cette machine.</p>
          <span class="empty-hint">Les documents sont gérés depuis le module Documentation (étape 6).</span>
        </div>
        <div v-else class="documents-list">
          <div v-for="doc in machine.documents" :key="doc.id" class="doc-item">
            <i :class="`ti ${docIcon(doc.typeDoc)}`" aria-hidden="true"></i>
            <div class="doc-info">
              <span class="doc-titre">{{ doc.titre }}</span>
              <span class="doc-type">{{ doc.typeDoc }}</span>
            </div>
            <div class="doc-actions">
              <a v-if="doc.urlFichier" :href="`/uploads/${doc.urlFichier}`" target="_blank" class="doc-btn">
                <i class="ti ti-eye" aria-hidden="true"></i>
              </a>
              <a v-if="doc.urlExterne" :href="doc.urlExterne" target="_blank" class="doc-btn">
                <i class="ti ti-external-link" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

    </template><!-- /template v-else-if machine -->

    <!-- ===== MODAL Élément ===== -->
    <Teleport to="body">
      <div v-if="showElementModal" class="modal-overlay" @click.self="showElementModal = false">
        <div class="modal" role="dialog">
          <div class="modal-header">
            <h2>{{ editingElement ? 'Modifier l\'élément' : 'Nouvel élément' }}</h2>
            <button class="modal-close" @click="showElementModal = false"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-stack">
              <div class="field-group">
                <label>Nom *</label>
                <input v-model="elForm.nom" type="text" placeholder="ex: Moteur principal" />
              </div>
              <div class="field-group">
                <label>Chaîne fonctionnelle</label>
                <input v-model="elForm.chaineFonctionnelle" type="text" placeholder="ex: Transmission" />
              </div>
              <div class="field-group">
                <label>Description</label>
                <textarea v-model="elForm.description" rows="2" placeholder="Description optionnelle…"></textarea>
              </div>
              <div class="field-group">
                <label>Ordre d'affichage</label>
                <input v-model.number="elForm.ordre" type="number" min="0" />
              </div>
            </div>
            <p v-if="elError" class="modal-error"><i class="ti ti-alert-circle" aria-hidden="true"></i> {{ elError }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showElementModal = false">Annuler</button>
            <button class="btn-primary" @click="handleSaveElement" :disabled="elSaving">
              {{ elSaving ? 'Enregistrement…' : (editingElement ? 'Mettre à jour' : 'Ajouter') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div><!-- /machine-detail -->
</template>

<script setup>
// MODULE: EQUIPEMENTS — MachineDetailView script
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useEquipementsStore } from '@/stores/equipements.store'
import { useAuthStore }        from '@/stores/auth.store'
import * as equipApi           from '@/api/equipements.api'

const props = defineProps({ machineId: { type: String, required: true } })

const store     = useEquipementsStore()
const authStore = useAuthStore()
const isAdmin   = computed(() => authStore.isAdmin)
const isMaintenance = computed(() => authStore.isMaintenance)

const machine = computed(() => store.selectedMachine)
const activeTab  = ref('infos')

// #REGION tabs

const tabs = computed(() => [
  { id: 'infos',         label: 'Informations',  icon: 'ti-info-circle',    count: undefined },
  { id: 'elements',      label: 'Éléments',      icon: 'ti-components',     count: machine.value?.elements?.length },
  { id: 'pieces',        label: 'Pièces',         icon: 'ti-tools',          count: machine.value?.pieceMachines?.length },
  { id: 'interventions', label: 'Interventions',  icon: 'ti-clipboard-list', count: machine.value?._count?.interventions },
  { id: 'preventif',     label: 'Préventif',      icon: 'ti-calendar-check', count: undefined },
  { id: 'documents',     label: 'Documents',      icon: 'ti-files',          count: machine.value?.documents?.length },
])

// #ENDREGION tabs

// #REGION interventions

const interventions       = ref([])
const loadingInterventions = ref(false)

watch(activeTab, async (tab) => {
  if (tab === 'interventions' && !interventions.value.length) {
    loadingInterventions.value = true
    try {
      interventions.value = await equipApi.getMachineInterventions(props.machineId)
    } finally {
      loadingInterventions.value = false
    }
  }
})

// #ENDREGION interventions

// #REGION elements-crud

const showElementModal = ref(false)
const editingElement   = ref(null)
const elError          = ref('')
const elSaving         = ref(false)
const elForm           = reactive({ nom: '', chaineFonctionnelle: '', description: '', ordre: 0 })

const openEditElement = (el) => {
  editingElement.value = el
  Object.assign(elForm, { nom: el.nom, chaineFonctionnelle: el.chaineFonctionnelle || '', description: el.description || '', ordre: el.ordre })
  elError.value = ''
  showElementModal.value = true
}

const handleSaveElement = async () => {
  if (!elForm.nom.trim()) { elError.value = 'Le nom est requis.'; return }
  elSaving.value = true
  elError.value  = ''
  try {
    if (editingElement.value) {
      await equipApi.updateElement(editingElement.value.id, elForm)
    } else {
      await equipApi.addElement(props.machineId, elForm)
    }
    await store.fetchMachine(props.machineId)
    showElementModal.value = false
    editingElement.value   = null
  } catch (err) {
    elError.value = err.response?.data?.error || 'Erreur.'
  } finally {
    elSaving.value = false
  }
}

const handleDeleteElement = async (el) => {
  const code = prompt('Code administrateur requis pour supprimer cet élément :')
  if (!code) return
  try {
    await equipApi.deleteElement(el.id, code)
    await store.fetchMachine(props.machineId)
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de la suppression.')
  }
}

// #ENDREGION elements-crud

// #REGION photo-upload

const handlePhotoUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const code = prompt('Code administrateur requis pour changer la photo :')
  if (!code) return
  try {
    await equipApi.uploadMachinePhoto(props.machineId, file, code)
    await store.fetchMachine(props.machineId)
  } catch (err) {
    alert('Erreur lors de l\'upload de la photo.')
  }
}

// #ENDREGION photo-upload

// #REGION helpers

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const etatLabel = (e) => ({
  DEMANDE: 'Demande', EN_COURS: 'En cours', PREPARATION: 'Préparation',
  URGENT: 'Urgent', TERMINE: 'Terminé', A_CLOTURER: 'À clôturer', AUTRE: 'Autre',
}[e] || e)

const docIcon = (type) => ({
  MANUEL: 'ti-book', SCHEMA: 'ti-blueprint', PROCEDURE: 'ti-list-check',
  SECURITE: 'ti-shield', AUTRE: 'ti-file',
}[type] || 'ti-file')

// #ENDREGION helpers
</script>

<style scoped>
/* MODULE: EQUIPEMENTS — MachineDetailView styles */
.machine-detail { height: 100%; overflow-y: auto; }

.detail-loading { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 4rem; color: #6b7280; font-size: 14px; }

/* En-tête machine */
.machine-header {
  display: flex; gap: 20px; padding: 20px;
  border-bottom: 1px solid #2a2d38; background: #16181f;
  align-items: flex-start; flex-wrap: wrap;
}

.header-photo {
  position: relative;
  width: 100px; height: 100px; border-radius: 10px;
  overflow: hidden; background: #0f1117; border: 1px solid #2a2d38;
  flex-shrink: 0;
}
.header-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.photo-placeholder i { font-size: 36px; color: #2a2d38; }
.photo-upload-btn {
  position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7);
  color: #fff; padding: 5px 6px; cursor: pointer; font-size: 14px; line-height: 1;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; }

.header-info { flex: 1; min-width: 200px; }
.header-row1 { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
.machine-nom { font-size: 20px; font-weight: 600; color: #e8e8e8; margin: 0; }
.badge-active   { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(29,158,117,0.15); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.badge-archived { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(107,114,128,0.15); color: #6b7280; border: 1px solid rgba(107,114,128,0.3); }
.header-atelier { font-size: 13px; color: #9ca3af; display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
.header-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.header-meta span { font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 5px; }
.header-meta i { font-size: 13px; color: #6b7280; }

.header-counters { display: flex; gap: 20px; flex-wrap: wrap; }
.counter-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px; background: #0f1117; border-radius: 8px; border: 1px solid #2a2d38; }
.counter-val { font-size: 22px; font-weight: 600; color: #e8e8e8; }
.counter-lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }

/* Onglets */
.tabs-nav {
  display: flex; gap: 2px; padding: 0 20px;
  border-bottom: 1px solid #2a2d38; background: #16181f;
  overflow-x: auto; flex-shrink: 0;
}

.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent;
  color: #9ca3af; font-size: 13px; cursor: pointer; white-space: nowrap;
  transition: color 0.1s;
}
.tab-btn i { font-size: 14px; }
.tab-btn:hover { color: #e8e8e8; }
.tab-btn.active { color: #1d9e75; border-bottom-color: #1d9e75; }
.tab-count {
  font-size: 10px; background: #1e2030; color: #6b7280;
  border-radius: 10px; padding: 1px 6px; min-width: 18px; text-align: center;
}

/* Contenu onglets */
.tab-content { padding: 20px; }

.empty-tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 4rem; color: #6b7280; text-align: center;
}
.empty-tab i { font-size: 36px; }
.empty-tab p { font-size: 14px; margin: 0; }
.empty-hint { font-size: 12px; color: #3d4151; }

/* Onglet infos */
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.info-section h3 { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; }
.info-dl { display: flex; flex-direction: column; gap: 8px; }
.info-dl > div { display: flex; gap: 8px; }
.info-dl dt { font-size: 12px; color: #6b7280; min-width: 130px; flex-shrink: 0; }
.info-dl dd { font-size: 13px; color: #e8e8e8; margin: 0; }
.info-tech { font-size: 13px; color: #c9cad1; line-height: 1.7; margin: 0; white-space: pre-wrap; }

/* Onglet éléments */
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tab-section-title { font-size: 14px; font-weight: 500; color: #e8e8e8; margin: 0; }
.btn-add { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: #1d9e75; color: #fff; border: none; border-radius: 7px; font-size: 12px; cursor: pointer; }
.btn-add:hover { background: #17836a; }

.chaine-group { margin-bottom: 20px; }
.chaine-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 8px; padding: 6px 0;
  border-bottom: 1px solid #2a2d38;
}
.chaine-header i { color: #1d9e75; }
.chaine-count {
  margin-left: auto; font-size: 10px; background: #1e2030;
  color: #6b7280; border-radius: 10px; padding: 1px 6px;
}

.elements-list { display: flex; flex-direction: column; gap: 4px; }
.element-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #16181f; border: 1px solid #2a2d38;
  border-radius: 8px;
}
.el-info  { display: flex; align-items: baseline; gap: 10px; }
.el-nom   { font-size: 13px; color: #e8e8e8; font-weight: 500; }
.el-desc  { font-size: 12px; color: #6b7280; }
.el-actions { display: flex; gap: 4px; }
.action-icon { background: none; border: 1px solid #2a2d38; border-radius: 6px; padding: 4px 6px; cursor: pointer; color: #9ca3af; font-size: 13px; }
.action-icon:hover { background: #1e2030; color: #e8e8e8; }
.action-icon.danger:hover { color: #f09595; border-color: rgba(226,75,74,0.3); }

/* Onglet pièces */
.pieces-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #2a2d38; }
.pieces-table { width: 100%; border-collapse: collapse; background: #16181f; }
.pieces-table thead tr { background: #0f1117; }
.pieces-table th { padding: 8px 12px; font-size: 11px; color: #6b7280; text-align: left; text-transform: uppercase; }
.pieces-table td { padding: 9px 12px; font-size: 13px; color: #c9cad1; border-top: 1px solid #1e2030; }
.ref-cell { font-family: var(--font-mono, monospace); color: #9ca3af; font-size: 12px; }
.text-muted { color: #6b7280; }
.stock-alert { color: #f09595; font-weight: 500; }

/* Onglet interventions */
.interventions-list { display: flex; flex-direction: column; gap: 6px; }
.iv-card {
  display: flex; align-items: flex-start; gap: 14px; padding: 12px 14px;
  background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; flex-wrap: wrap;
}
.iv-left  { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
.iv-etat  { font-size: 11px; padding: 2px 8px; border-radius: 4px; text-align: center; font-weight: 500; }
.etat-demande   { background: rgba(29,158,117,0.15); color: #5DCAA5; }
.etat-en_cours  { background: rgba(83,74,183,0.2); color: #AFA9EC; }
.etat-urgent    { background: rgba(226,75,74,0.15); color: #f09595; }
.etat-preparation { background: rgba(186,117,23,0.2); color: #EF9F27; }
.etat-termine   { background: rgba(107,114,128,0.15); color: #6b7280; }
.etat-a_cloturer { background: rgba(186,117,23,0.15); color: #EF9F27; }
.etat-autre     { background: #1e2030; color: #9ca3af; }
.iv-date { font-size: 11px; color: #6b7280; }
.iv-center { flex: 1; }
.iv-type   { font-size: 13px; font-weight: 500; color: #e8e8e8; display: block; }
.iv-constat { font-size: 12px; color: #9ca3af; display: block; margin-top: 2px; }
.iv-right { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.iv-tech, .iv-time { font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }

/* Documents */
.documents-list { display: flex; flex-direction: column; gap: 6px; }
.doc-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; background: #16181f; border: 1px solid #2a2d38; border-radius: 8px;
}
.doc-item > i { font-size: 20px; color: #1d9e75; flex-shrink: 0; }
.doc-info { flex: 1; }
.doc-titre { font-size: 13px; font-weight: 500; color: #e8e8e8; display: block; }
.doc-type  { font-size: 11px; color: #6b7280; }
.doc-actions { display: flex; gap: 6px; }
.doc-btn { padding: 5px 8px; background: #1e2030; border: 1px solid #2a2d38; border-radius: 6px; color: #9ca3af; font-size: 14px; text-decoration: none; }
.doc-btn:hover { color: #e8e8e8; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: #16181f; border: 1px solid #2a2d38; border-radius: 14px; width: 100%; max-width: 480px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2d38; }
.modal-header h2 { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; }
.modal-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px; }
.modal-close:hover { color: #e8e8e8; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #2a2d38; display: flex; justify-content: flex-end; gap: 8px; }
.modal-error { display: flex; align-items: center; gap: 6px; color: #f09595; font-size: 13px; margin-top: 10px; }

.form-stack  { display: flex; flex-direction: column; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.field-group input,
.field-group textarea {
  background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px;
  padding: 9px 12px; font-size: 13px; color: #e8e8e8; outline: none; font-family: inherit; resize: vertical;
}
.field-group input:focus,
.field-group textarea:focus { border-color: #1d9e75; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: #17836a; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1e2030; color: #c9cad1; border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .machine-header { flex-direction: column; }
  .header-counters { width: 100%; justify-content: space-between; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
