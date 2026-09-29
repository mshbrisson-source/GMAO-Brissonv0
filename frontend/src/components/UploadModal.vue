<template>
  <!-- ====================================================
    MODULE: DOCUMENTS — UploadModal
    Création d'un nouveau document ou d'une nouvelle version.
    Supporte : fichier (drag & drop), URL externe.
  ==================================================== -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" role="dialog" :aria-label="isNewVersion ? 'Nouvelle version du document' : 'Ajouter un document'">

      <div class="modal-header">
        <h2>
          <i :class="`ti ${isNewVersion ? 'ti-git-branch' : 'ti-upload'}`" aria-hidden="true"></i>
          {{ isNewVersion ? 'Nouvelle version' : 'Ajouter un document' }}
        </h2>
        <button class="modal-close" @click="$emit('close')"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>

      <!-- Bannière version précédente -->
      <div v-if="isNewVersion && currentDoc" class="version-banner">
        <i class="ti ti-history" aria-hidden="true"></i>
        Version actuelle :
        <strong>{{ currentDoc.titre }}</strong>
        <span class="version-chip">v{{ currentDoc.version }}</span>
        → Nouvelle version :
        <span class="version-chip new">v{{ currentDoc.version + 1 }}</span>
      </div>

      <div class="modal-body">

        <!-- Titre -->
        <div class="field-group">
          <label>Titre du document *</label>
          <input v-model="form.titre" type="text" placeholder="ex: Manuel opérateur Tour MAZAK QT-200" :disabled="isNewVersion" />
          <small v-if="isNewVersion" class="field-hint">Hérité de la version précédente. Modifiable.</small>
        </div>

        <div class="row-2">
          <!-- Type de document -->
          <div class="field-group" v-if="!isNewVersion">
            <label>Type *</label>
            <select v-model="form.typeDoc">
              <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </div>

          <!-- Machine associée -->
          <div class="field-group" v-if="!isNewVersion">
            <label>Machine associée</label>
            <select v-model="form.machineId">
              <option value="">— Aucune —</option>
              <option v-for="m in machineOptions" :key="m.id" :value="m.id">
                {{ m.atelier?.nom ? m.atelier.nom + ' / ' : '' }}{{ m.nom }}
              </option>
            </select>
          </div>

          <!-- Pièce associée -->
          <div class="field-group" v-if="!isNewVersion">
            <label>Pièce associée</label>
            <select v-model="form.pieceId">
              <option value="">— Aucune —</option>
              <option v-for="p in pieceOptions" :key="p.id" :value="p.id">
                {{ p.reference }} — {{ p.nom }}
              </option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div class="field-group">
          <label>Description</label>
          <textarea v-model="form.description" rows="2" placeholder="Description optionnelle du contenu…"></textarea>
        </div>

        <!-- Note de version (pour nouvelles versions de procédures) -->
        <div v-if="isNewVersion" class="field-group">
          <label>Note de version</label>
          <input v-model="form.noteVersion" type="text" placeholder="ex: Mise à jour séquence démarrage, ajout EPI" />
        </div>

        <!-- Source : fichier ou URL -->
        <div class="source-tabs">
          <button
            :class="['src-tab', { active: sourceMode === 'file' }]"
            @click="sourceMode = 'file'"
            type="button"
          >
            <i class="ti ti-file-upload" aria-hidden="true"></i> Fichier
          </button>
          <button
            :class="['src-tab', { active: sourceMode === 'url' }]"
            @click="sourceMode = 'url'"
            type="button"
          >
            <i class="ti ti-link" aria-hidden="true"></i> URL externe
          </button>
        </div>

        <!-- Drop zone fichier -->
        <div
          v-if="sourceMode === 'file'"
          class="drop-zone"
          :class="{ dragging: isDragging, 'has-file': !!selectedFile }"
          @dragenter.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @dragover.prevent
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
          role="button"
          tabindex="0"
          aria-label="Zone de dépôt de fichier"
          @keydown.enter="$refs.fileInput.click()"
        >
          <input
            ref="fileInput"
            type="file"
            class="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.svg,.doc,.docx"
            @change="onFileSelect"
          />

          <template v-if="!selectedFile">
            <i class="ti ti-cloud-upload drop-icon" aria-hidden="true"></i>
            <p class="drop-text">Glisser-déposer un fichier ou <span class="drop-link">parcourir</span></p>
            <p class="drop-hint">PDF, images (JPG, PNG, WEBP, SVG), Word — max {{ maxSizeMB }} Mo</p>
          </template>

          <template v-else>
            <div class="file-preview">
              <i :class="`ti ${fileIcon(selectedFile)} file-icon`" aria-hidden="true"></i>
              <div class="file-info">
                <span class="file-name">{{ selectedFile.name }}</span>
                <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
              </div>
              <button class="file-remove" @click.stop="selectedFile = null" aria-label="Supprimer le fichier sélectionné">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </div>

        <!-- URL externe -->
        <div v-else class="field-group">
          <label>URL externe *</label>
          <input
            v-model="form.urlExterne"
            type="url"
            placeholder="https://constructeur.fr/manuel-machineXYZ.pdf"
          />
          <small class="field-hint">Lien vers la documentation en ligne du fabricant.</small>
        </div>

        <!-- Erreur -->
        <p v-if="error" class="modal-error" role="alert">
          <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ error }}
        </p>

      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')" :disabled="saving">Annuler</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving || (!selectedFile && !form.urlExterne)">
          <i :class="saving ? 'ti ti-loader-2 spin' : `ti ${isNewVersion ? 'ti-git-branch' : 'ti-upload'}`" aria-hidden="true"></i>
          {{ saving ? 'Enregistrement…' : (isNewVersion ? 'Publier la version' : 'Ajouter le document') }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
// MODULE: DOCUMENTS — UploadModal script
import { ref, reactive, computed, watch } from 'vue'
import * as docsApi from '@/api/documents.api'

const props = defineProps({
  groupId:       { type: String,  default: null },   // si renseigné → nouvelle version
  currentDoc:    { type: Object,  default: null },
  machineOptions: { type: Array,  default: () => [] },
  pieceOptions:   { type: Array,  default: () => [] },
})
const emit = defineEmits(['saved', 'close'])

const isNewVersion = computed(() => !!props.groupId)
const maxSizeMB    = 20

const TYPE_OPTIONS = [
  { value: 'MANUEL',        label: '📖 Manuel' },
  { value: 'SCHEMA',        label: '📐 Schéma' },
  { value: 'PROCEDURE',     label: '📋 Procédure' },
  { value: 'FICHE_SECURITE', label: '🛡 Fiche sécurité' },
  { value: 'AUTRE',         label: '📄 Autre' },
]

// #REGION state

const sourceMode   = ref('file')
const selectedFile = ref(null)
const isDragging   = ref(false)
const saving       = ref(false)
const error        = ref('')

const form = reactive({
  titre:       '',
  description: '',
  typeDoc:     'MANUEL',
  machineId:   '',
  pieceId:     '',
  urlExterne:  '',
  noteVersion: '',
})

// Pré-remplir si nouvelle version
watch(() => props.currentDoc, (doc) => {
  if (doc) {
    form.titre       = doc.titre
    form.description = doc.description || ''
    form.typeDoc     = doc.typeDoc
    form.machineId   = doc.machineId || ''
    form.pieceId     = doc.pieceId   || ''
  }
}, { immediate: true })

// #ENDREGION state

// #REGION file-handling

const onFileSelect = (e) => {
  const f = e.target.files[0]
  if (f) validateAndSetFile(f)
}

const onDrop = (e) => {
  isDragging.value = false
  const f = e.dataTransfer.files[0]
  if (f) validateAndSetFile(f)
}

const validateAndSetFile = (f) => {
  error.value = ''
  if (f.size > maxSizeMB * 1024 * 1024) {
    error.value = `Le fichier dépasse la taille maximale autorisée (${maxSizeMB} Mo).`
    return
  }
  selectedFile.value = f
  if (!form.titre) form.titre = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
}

const fileIcon = (f) => {
  if (!f) return 'ti-file'
  const ext = f.name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return 'ti-file-type-pdf'
  if (['jpg','jpeg','png','webp','gif','svg'].includes(ext)) return 'ti-photo'
  if (['doc','docx'].includes(ext)) return 'ti-file-type-doc'
  return 'ti-file'
}

const formatSize = (bytes) => {
  if (bytes < 1024)       return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

// #ENDREGION file-handling

// #REGION save

const handleSave = async () => {
  error.value = ''

  if (!form.titre.trim()) { error.value = 'Le titre est requis.'; return }
  if (sourceMode.value === 'file'  && !selectedFile.value) { error.value = 'Veuillez sélectionner un fichier.'; return }
  if (sourceMode.value === 'url'   && !form.urlExterne)    { error.value = 'Veuillez saisir une URL.'; return }

  saving.value = true

  try {
    const fd = new FormData()
    fd.append('titre',       form.titre)
    fd.append('description', form.description)
    fd.append('typeDoc',     form.typeDoc)
    if (form.machineId)   fd.append('machineId',   form.machineId)
    if (form.pieceId)     fd.append('pieceId',     form.pieceId)
    if (form.urlExterne)  fd.append('urlExterne',  form.urlExterne)
    if (form.noteVersion) fd.append('noteVersion', form.noteVersion)
    if (selectedFile.value) fd.append('fichier', selectedFile.value)

    let response
    if (isNewVersion.value) {
      response = await docsApi.createNewVersion(props.groupId, fd)
    } else {
      response = await docsApi.createDocument(fd)
    }

    emit('saved', response.data)
  } catch (err) {
    error.value = err.response?.data?.error || 'Erreur lors de l\'enregistrement.'
  } finally {
    saving.value = false
  }
}

// #ENDREGION save
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 150; padding: 1rem; }
.modal { background: #16181f; border: 1px solid #2a2d38; border-radius: 14px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2d38; position: sticky; top: 0; background: #16181f; z-index: 1; }
.modal-header h2 { font-size: 15px; font-weight: 600; color: #e8e8e8; margin: 0; display: flex; align-items: center; gap: 8px; }
.modal-header h2 i { color: #1d9e75; }
.modal-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px; }
.modal-close:hover { color: #e8e8e8; }
.modal-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #2a2d38; display: flex; justify-content: flex-end; gap: 8px; position: sticky; bottom: 0; background: #16181f; }
.modal-error { display: flex; align-items: center; gap: 6px; color: #f09595; font-size: 13px; }

/* Version banner */
.version-banner {
  margin: 0 1.5rem; padding: 8px 12px; background: rgba(29,158,117,0.1);
  border: 1px solid rgba(29,158,117,0.25); border-radius: 8px;
  font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap;
}
.version-banner i { color: #1d9e75; }
.version-banner strong { color: #e8e8e8; }
.version-chip { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: #1e2030; color: #9ca3af; }
.version-chip.new { background: rgba(29,158,117,0.2); color: #5DCAA5; }

/* Champs */
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-group label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.field-group input, .field-group select, .field-group textarea {
  background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px;
  padding: 8px 12px; font-size: 13px; color: #e8e8e8; outline: none; font-family: inherit; resize: vertical;
}
.field-group input:focus, .field-group select:focus, .field-group textarea:focus { border-color: #1d9e75; }
.field-group select option { background: #16181f; }
.field-group input:disabled { opacity: 0.6; cursor: not-allowed; }
.field-hint { font-size: 11px; color: #6b7280; }

/* Source tabs */
.source-tabs { display: flex; gap: 4px; }
.src-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px; color: #9ca3af; font-size: 13px; cursor: pointer; }
.src-tab:hover { background: #1e2030; color: #e8e8e8; }
.src-tab.active { background: rgba(29,158,117,0.12); border-color: rgba(29,158,117,0.3); color: #5DCAA5; }

/* Drop zone */
.drop-zone {
  border: 2px dashed #2a2d38; border-radius: 10px; padding: 2rem;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; cursor: pointer; transition: all 0.15s; min-height: 140px;
}
.drop-zone:hover, .drop-zone.dragging { border-color: #1d9e75; background: rgba(29,158,117,0.05); }
.drop-zone.has-file { border-color: #1d9e75; border-style: solid; }
.drop-zone:focus-visible { outline: 2px solid #1d9e75; }
.drop-icon { font-size: 36px; color: #6b7280; }
.drop-text { font-size: 13px; color: #c9cad1; margin: 0; }
.drop-link { color: #1d9e75; text-decoration: underline; }
.drop-hint { font-size: 11px; color: #6b7280; margin: 0; text-align: center; }

/* Fichier sélectionné */
.file-preview {
  display: flex; align-items: center; gap: 12px; width: 100%;
  background: #0f1117; border-radius: 8px; padding: 10px 12px;
}
.file-icon { font-size: 24px; color: #1d9e75; flex-shrink: 0; }
.file-info { flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.file-name { font-size: 13px; color: #e8e8e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-size { font-size: 11px; color: #6b7280; }
.file-remove { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 14px; padding: 2px; flex-shrink: 0; }
.file-remove:hover { color: #f09595; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.btn-primary   { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary:hover:not(:disabled) { background: #17836a; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1e2030; color: #c9cad1; border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }
@media (max-width: 500px) { .row-2 { grid-template-columns: 1fr; } }
</style>
