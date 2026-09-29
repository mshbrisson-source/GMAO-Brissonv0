<template>
  <!-- ====================================================
    MODULE: DOCUMENTS — DocumentsView
    Vue principale : recherche, filtres, grille de documents.
    Clic sur un document → visionneuse inline.
  ==================================================== -->
  <div class="docs-view">

    <!-- Topbar -->
    <div class="docs-topbar">
      <div class="topbar-left">
        <h1 class="page-title">
          <i class="ti ti-files" aria-hidden="true"></i>
          Documentation technique
        </h1>
        <span class="doc-count">{{ store.documents.length }} document(s)</span>
      </div>
      <button v-if="isMaintenance" class="btn-primary" @click="showUpload = true">
        <i class="ti ti-upload" aria-hidden="true"></i>
        Ajouter un document
      </button>
    </div>

    <!-- Barre de recherche globale -->
    <div class="search-bar">
      <i class="ti ti-search" aria-hidden="true"></i>
      <input
        v-model="searchQ"
        type="search"
        placeholder="Rechercher par titre, machine, mot-clé…"
        @input="debouncedSearch"
        aria-label="Rechercher dans la documentation"
      />
      <button v-if="searchQ" class="clear-search" @click="searchQ=''; doSearch()" aria-label="Effacer la recherche">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>

    <div class="docs-body">

      <!-- ===== PANNEAU FILTRES ===== -->
      <aside class="filters-panel" aria-label="Filtres de recherche">

        <div class="filter-section">
          <div class="filter-label">Type de document</div>
          <button
            v-for="t in TYPE_OPTIONS"
            :key="t.value"
            class="filter-type-btn"
            :class="{ active: filterType === t.value }"
            @click="filterType = t.value; doSearch()"
          >
            <i :class="`ti ${t.icon}`" aria-hidden="true"></i>
            {{ t.label }}
            <span class="type-count" v-if="countForType(t.value) > 0">{{ countForType(t.value) }}</span>
          </button>
        </div>

        <div class="filter-section">
          <div class="filter-label">Machine</div>
          <select v-model="filterMachine" class="select-filter" @change="doSearch">
            <option value="">Toutes les machines</option>
            <option v-for="m in machineOptions" :key="m.id" :value="m.id">{{ m.nom }}</option>
          </select>
        </div>

        <div class="filter-section">
          <div class="filter-label">Pièce détachée</div>
          <select v-model="filterPiece" class="select-filter" @change="doSearch">
            <option value="">Toutes les pièces</option>
            <option v-for="p in pieceOptions" :key="p.id" :value="p.id">{{ p.nom }}</option>
          </select>
        </div>

        <button v-if="hasFilters" class="btn-reset-filters" @click="resetFilters">
          <i class="ti ti-filter-off" aria-hidden="true"></i>
          Réinitialiser les filtres
        </button>

      </aside>

      <!-- ===== GRILLE DOCUMENTS ===== -->
      <main class="docs-main" aria-label="Liste des documents">

        <!-- État chargement -->
        <div v-if="store.loading" class="docs-loading">
          <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
          Chargement…
        </div>

        <!-- État vide -->
        <div v-else-if="!store.documents.length" class="docs-empty">
          <i class="ti ti-file-off" aria-hidden="true"></i>
          <p>Aucun document trouvé.</p>
          <span v-if="hasFilters" class="empty-hint">Essayez de modifier les filtres.</span>
        </div>

        <!-- Grille de documents -->
        <div v-else class="docs-grid">
          <article
            v-for="doc in store.documents"
            :key="doc.id"
            class="doc-card"
            :class="[`type-${doc.typeDoc.toLowerCase()}`, { 'has-file': !!doc.urlFichier }]"
            @click="openViewer(doc)"
            tabindex="0"
            @keydown.enter="openViewer(doc)"
            role="button"
            :aria-label="`Ouvrir ${doc.titre}`"
          >
            <!-- Icône type -->
            <div class="doc-card-icon">
              <i :class="`ti ${typeIcon(doc.typeDoc)}`" aria-hidden="true"></i>
              <span class="type-badge" :class="`badge-${doc.typeDoc.toLowerCase()}`">
                {{ typeLabel(doc.typeDoc) }}
              </span>
            </div>

            <!-- Contenu -->
            <div class="doc-card-body">
              <div class="doc-titre">{{ doc.titre }}</div>
              <div v-if="doc.description" class="doc-desc">{{ doc.description }}</div>

              <!-- Machine / Pièce -->
              <div class="doc-context">
                <span v-if="doc.machine" class="ctx-chip ctx-machine">
                  <i class="ti ti-tools" aria-hidden="true"></i>
                  {{ doc.machine.atelier?.nom }} / {{ doc.machine.nom }}
                </span>
                <span v-if="doc.piece" class="ctx-chip ctx-piece">
                  <i class="ti ti-package" aria-hidden="true"></i>
                  {{ doc.piece.nom }}
                </span>
                <span v-if="!doc.machine && !doc.piece" class="ctx-chip ctx-global">
                  <i class="ti ti-globe" aria-hidden="true"></i>
                  Général
                </span>
              </div>
            </div>

            <!-- Footer -->
            <div class="doc-card-footer">
              <div class="doc-meta">
                <!-- Badge version (procédures uniquement) -->
                <span v-if="doc.typeDoc === 'PROCEDURE'" class="version-badge">
                  v{{ doc.version }}
                </span>
                <!-- Format fichier -->
                <span v-if="doc.mimeType" class="format-badge">
                  {{ mimeLabel(doc.mimeType) }}
                </span>
                <span v-else-if="doc.urlExterne" class="format-badge format-url">
                  <i class="ti ti-link" aria-hidden="true"></i> URL
                </span>
                <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
              </div>

              <div class="doc-actions" @click.stop>
                <button class="card-act" title="Voir" @click="openViewer(doc)">
                  <i class="ti ti-eye" aria-hidden="true"></i>
                </button>
                <button v-if="doc.urlFichier" class="card-act" title="Télécharger" @click="handleDownload(doc)">
                  <i class="ti ti-download" aria-hidden="true"></i>
                </button>
                <button v-if="isMaintenance && doc.typeDoc === 'PROCEDURE'" class="card-act" title="Nouvelle version" @click="openNewVersion(doc)">
                  <i class="ti ti-git-branch" aria-hidden="true"></i>
                </button>
                <button v-if="isMaintenance" class="card-act" title="Historique" @click="openHistory(doc)">
                  <i class="ti ti-history" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
        </div>

      </main>
    </div><!-- /docs-body -->

    <!-- ====================================================
      MODALES
    ==================================================== -->
    <Teleport to="body">
      <DocumentViewer
        v-if="viewerDoc"
        :document="viewerDoc"
        @close="viewerDoc = null"
        @new-version="openNewVersion"
        @show-history="openHistory"
      />
    </Teleport>

    <Teleport to="body">
      <UploadModal
        v-if="showUpload"
        :group-id="versionGroupId"
        :current-doc="versionBaseDoc"
        :machine-options="machineOptions"
        :piece-options="pieceOptions"
        @saved="onDocSaved"
        @close="showUpload = false; versionGroupId = null; versionBaseDoc = null"
      />
    </Teleport>

    <Teleport to="body">
      <VersionHistoryModal
        v-if="historyDoc"
        :document="historyDoc"
        @close="historyDoc = null"
        @restored="onVersionRestored"
      />
    </Teleport>

  </div>
</template>

<script setup>
// MODULE: DOCUMENTS — DocumentsView script
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDocumentsStore } from '@/stores/documents.store'
import { useAuthStore }      from '@/stores/auth.store'
import * as docsApi          from '@/api/documents.api'
import DocumentViewer        from '@/components/DocumentViewer.vue'
import UploadModal           from '@/components/UploadModal.vue'
import VersionHistoryModal   from '@/components/VersionHistoryModal.vue'
import { api }               from '@/api/api'

const store     = useDocumentsStore()
const authStore = useAuthStore()
const isMaintenance = computed(() => authStore.isMaintenance)

// #REGION constants

const TYPE_OPTIONS = [
  { value: '',             label: 'Tous',           icon: 'ti-files' },
  { value: 'MANUEL',       label: 'Manuels',        icon: 'ti-book' },
  { value: 'SCHEMA',       label: 'Schémas',        icon: 'ti-vector-bezier' },
  { value: 'PROCEDURE',    label: 'Procédures',     icon: 'ti-list-check' },
  { value: 'FICHE_SECURITE', label: 'Fiches sécu',  icon: 'ti-shield-check' },
  { value: 'AUTRE',        label: 'Autres',          icon: 'ti-file' },
]

// #ENDREGION constants

// #REGION state

const searchQ       = ref('')
const filterType    = ref('')
const filterMachine = ref('')
const filterPiece   = ref('')
const viewerDoc     = ref(null)
const showUpload    = ref(false)
const historyDoc    = ref(null)
const versionGroupId  = ref(null)
const versionBaseDoc  = ref(null)
const machineOptions  = ref([])
const pieceOptions    = ref([])

const hasFilters = computed(() =>
  !!searchQ.value || !!filterType.value || !!filterMachine.value || !!filterPiece.value
)

// #ENDREGION state

// #REGION search

let searchTimer = null
const debouncedSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 300) }

const doSearch = () => store.fetchDocuments({
  q:         searchQ.value || undefined,
  typeDoc:   filterType.value    || undefined,
  machineId: filterMachine.value || undefined,
  pieceId:   filterPiece.value   || undefined,
})

const resetFilters = () => {
  searchQ.value = ''; filterType.value = ''; filterMachine.value = ''; filterPiece.value = ''
  doSearch()
}

// #ENDREGION search

// #REGION helpers

const countForType = (type) => {
  if (!type) return store.documents.length
  return store.documents.filter(d => d.typeDoc === type).length
}

const typeIcon = (t) => ({
  MANUEL: 'ti-book', SCHEMA: 'ti-vector-bezier', PROCEDURE: 'ti-list-check',
  FICHE_SECURITE: 'ti-shield-check', AUTRE: 'ti-file',
}[t] || 'ti-file')

const typeLabel = (t) => ({
  MANUEL: 'Manuel', SCHEMA: 'Schéma', PROCEDURE: 'Procédure',
  FICHE_SECURITE: 'Séc.', AUTRE: 'Autre',
}[t] || t)

const mimeLabel = (m) => ({
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
}[m] || 'FICHIER')

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

// #ENDREGION helpers

// #REGION actions

const openViewer    = (doc) => { viewerDoc.value = doc }
const openHistory   = (doc) => { historyDoc.value = doc }

const openNewVersion = (doc) => {
  versionGroupId.value = doc.groupId
  versionBaseDoc.value = doc
  showUpload.value     = true
}

const handleDownload = async (doc) => {
  try { await docsApi.getDownloadUrl(doc.id, doc.titre) }
  catch { alert('Erreur lors du téléchargement.') }
}

const onDocSaved = async (doc) => {
  store.addDocument(doc)
  showUpload.value    = false
  versionGroupId.value = null
  versionBaseDoc.value = null
  await doSearch()
}

const onVersionRestored = async () => {
  historyDoc.value = null
  await doSearch()
}

// #ENDREGION actions

// #REGION init

const loadOptions = async () => {
  try {
    const [ms, ps] = await Promise.all([
      api.get('/equipements/machines').then(r => r.data),
      api.get('/stock/pieces').then(r => r.data),
    ])
    machineOptions.value = ms
    pieceOptions.value   = ps
  } catch { /* silencieux */ }
}

onMounted(async () => {
  await Promise.all([doSearch(), loadOptions()])
})

onUnmounted(() => store.clearBlobCache())

// #ENDREGION init
</script>

<style scoped>
/* MODULE: DOCUMENTS — DocumentsView styles */
.docs-view { display: flex; flex-direction: column; height: calc(100vh - 60px); overflow: hidden; background: #0f1117; }

/* Topbar */
.docs-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid #2a2d38; background: #16181f;
  gap: 12px; flex-wrap: wrap; flex-shrink: 0;
}
.topbar-left  { display: flex; align-items: center; gap: 10px; }
.page-title   { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; display: flex; align-items: center; gap: 8px; }
.page-title i { color: #1d9e75; }
.doc-count    { font-size: 12px; color: #6b7280; background: #1e2030; padding: 2px 8px; border-radius: 20px; }
.btn-primary  { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: #17836a; }

/* Barre recherche */
.search-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 20px; border-bottom: 1px solid #2a2d38;
  background: #16181f; flex-shrink: 0;
}
.search-bar i { color: #6b7280; font-size: 16px; flex-shrink: 0; }
.search-bar input { flex: 1; background: none; border: none; outline: none; color: #e8e8e8; font-size: 14px; }
.search-bar input::placeholder { color: #3d4151; }
.clear-search { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 14px; padding: 2px; }
.clear-search:hover { color: #e8e8e8; }

/* Corps */
.docs-body { display: flex; flex: 1; overflow: hidden; }

/* Panneau filtres */
.filters-panel {
  width: 220px; min-width: 200px; padding: 14px 12px;
  background: #16181f; border-right: 1px solid #2a2d38;
  overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px;
}

.filter-section { display: flex; flex-direction: column; gap: 5px; }
.filter-label { font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }

.filter-type-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 10px; background: none; border: 1px solid transparent;
  border-radius: 7px; color: #9ca3af; font-size: 12px; cursor: pointer;
  text-align: left; transition: all 0.12s;
}
.filter-type-btn i { font-size: 13px; flex-shrink: 0; }
.filter-type-btn:hover { background: #1e2030; color: #e8e8e8; }
.filter-type-btn.active { background: rgba(29,158,117,0.12); border-color: rgba(29,158,117,0.3); color: #5DCAA5; }
.type-count { margin-left: auto; font-size: 10px; background: #1e2030; color: #6b7280; border-radius: 10px; padding: 0 6px; }

.select-filter { background: #0f1117; border: 1px solid #2a2d38; border-radius: 7px; padding: 7px 10px; color: #c9cad1; font-size: 12px; outline: none; width: 100%; }
.select-filter option { background: #16181f; }

.btn-reset-filters { display: flex; align-items: center; gap: 5px; background: none; border: 1px solid #2a2d38; border-radius: 7px; color: #9ca3af; font-size: 12px; padding: 7px 10px; cursor: pointer; margin-top: auto; }
.btn-reset-filters:hover { background: #1e2030; color: #e8e8e8; }

/* Grille documents */
.docs-main { flex: 1; overflow-y: auto; padding: 16px 20px; }

.docs-loading,
.docs-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; height: 300px; color: #6b7280;
}
.docs-loading i, .docs-empty i { font-size: 36px; }
.docs-empty p { font-size: 14px; margin: 0; }
.empty-hint  { font-size: 12px; color: #3d4151; }

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

/* Carte document */
.doc-card {
  background: #16181f;
  border: 1px solid #2a2d38;
  border-left: 3px solid #2a2d38;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  display: flex; flex-direction: column;
}
.doc-card:hover, .doc-card:focus-visible { border-color: #1d9e75; transform: translateY(-1px); outline: none; }

/* Couleurs par type */
.doc-card.type-manuel        { border-left-color: #0C447C; }
.doc-card.type-schema        { border-left-color: #3C3489; }
.doc-card.type-procedure     { border-left-color: #1d9e75; }
.doc-card.type-fiche_securite { border-left-color: #e24b4a; }
.doc-card.type-autre         { border-left-color: #6b7280; }

.doc-card-icon {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px 8px; border-bottom: 1px solid #1e2030;
}
.doc-card-icon i { font-size: 22px; color: #6b7280; }
.doc-card.type-manuel        .doc-card-icon i { color: #B5D4F4; }
.doc-card.type-schema        .doc-card-icon i { color: #AFA9EC; }
.doc-card.type-procedure     .doc-card-icon i { color: #5DCAA5; }
.doc-card.type-fiche_securite .doc-card-icon i { color: #f09595; }

.type-badge { font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 500; }
.badge-manuel        { background: rgba(12,68,124,0.2);  color: #B5D4F4; border: 1px solid rgba(12,68,124,0.3); }
.badge-schema        { background: rgba(60,52,137,0.2);  color: #AFA9EC; border: 1px solid rgba(60,52,137,0.3); }
.badge-procedure     { background: rgba(29,158,117,0.15); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.badge-fiche_securite { background: rgba(226,75,74,0.15); color: #f09595; border: 1px solid rgba(226,75,74,0.3); }
.badge-autre         { background: rgba(107,114,128,0.15); color: #9ca3af; border: 1px solid rgba(107,114,128,0.3); }

.doc-card-body { padding: 10px 14px; flex: 1; }
.doc-titre     { font-size: 13px; font-weight: 500; color: #e8e8e8; line-height: 1.4; margin-bottom: 4px; }
.doc-desc      { font-size: 11px; color: #6b7280; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.doc-context { display: flex; flex-wrap: wrap; gap: 4px; }
.ctx-chip     { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 7px; border-radius: 4px; }
.ctx-machine  { background: rgba(29,158,117,0.1); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.2); }
.ctx-piece    { background: rgba(83,74,183,0.1); color: #AFA9EC; border: 1px solid rgba(83,74,183,0.2); }
.ctx-global   { background: #1e2030; color: #6b7280; border: 1px solid #2a2d38; }
.ctx-chip i   { font-size: 11px; }

.doc-card-footer { padding: 8px 14px; border-top: 1px solid #1e2030; display: flex; align-items: center; justify-content: space-between; }
.doc-meta  { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.version-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(29,158,117,0.15); color: #5DCAA5; font-weight: 500; }
.format-badge  { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #1e2030; color: #9ca3af; }
.format-url    { color: #B5D4F4; background: rgba(12,68,124,0.15); }
.doc-date      { font-size: 10px; color: #6b7280; }

.doc-actions { display: flex; gap: 3px; }
.card-act { background: none; border: 1px solid #2a2d38; border-radius: 5px; padding: 3px 6px; cursor: pointer; color: #9ca3af; font-size: 12px; text-decoration: none; }
.card-act:hover { background: #1e2030; color: #e8e8e8; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .filters-panel { display: none; }
  .docs-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}
</style>
