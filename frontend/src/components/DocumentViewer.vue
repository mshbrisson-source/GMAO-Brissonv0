<template>
  <!-- ====================================================
    MODULE: DOCUMENTS — DocumentViewer
    Visionneuse inline : PDF (iframe), image, URL externe.
    Supporte la navigation clavier et l'accessibilité.
  ==================================================== -->
  <div class="viewer-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" :aria-label="`Visualisation : ${document.titre}`">
    <div class="viewer-modal">

      <!-- En-tête visionneuse -->
      <div class="viewer-header">
        <div class="viewer-title-block">
          <i :class="`ti ${typeIcon(document.typeDoc)} viewer-type-icon`" aria-hidden="true"></i>
          <div>
            <h2 class="viewer-title">{{ document.titre }}</h2>
            <div class="viewer-meta">
              <span class="viewer-type" :class="`type-${document.typeDoc.toLowerCase()}`">{{ typeLabel(document.typeDoc) }}</span>
              <span v-if="document.typeDoc === 'PROCEDURE'" class="viewer-version">version {{ document.version }}</span>
              <span v-if="document.machine" class="viewer-context">
                <i class="ti ti-tools" aria-hidden="true"></i>
                {{ document.machine.atelier?.nom }} / {{ document.machine.nom }}
              </span>
              <span v-if="document.piece" class="viewer-context">
                <i class="ti ti-package" aria-hidden="true"></i>
                {{ document.piece.nom }}
              </span>
            </div>
          </div>
        </div>

        <div class="viewer-header-actions">
          <button v-if="isMaintenance && document.typeDoc === 'PROCEDURE'" class="hdr-btn" @click="$emit('new-version', document)" title="Nouvelle version">
            <i class="ti ti-git-branch" aria-hidden="true"></i>
            Nouvelle version
          </button>
          <button v-if="isMaintenance" class="hdr-btn" @click="$emit('show-history', document)" title="Historique des versions">
            <i class="ti ti-history" aria-hidden="true"></i>
            Historique
          </button>
          <button v-if="document.urlFichier" class="hdr-btn" @click="handleDownload" title="Télécharger">
            <i class="ti ti-download" aria-hidden="true"></i>
          </button>
          <button class="hdr-close" @click="$emit('close')" aria-label="Fermer la visionneuse">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Zone de rendu -->
      <div class="viewer-content">

        <!-- Chargement -->
        <div v-if="loading" class="viewer-loading" aria-live="polite">
          <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
          <span>Chargement du document…</span>
        </div>

        <!-- Erreur -->
        <div v-else-if="error" class="viewer-error" role="alert">
          <i class="ti ti-alert-circle" aria-hidden="true"></i>
          <p>{{ error }}</p>
          <a v-if="document.urlExterne" :href="document.urlExterne" target="_blank" class="btn-open-external">
            <i class="ti ti-external-link" aria-hidden="true"></i>
            Ouvrir l'URL externe
          </a>
        </div>

        <!-- ===== PDF — viewer natif via iframe ===== -->
        <iframe
          v-else-if="isPDF && blobUrl"
          :src="blobUrl + '#toolbar=1&view=FitH'"
          class="pdf-iframe"
          title="Visionneuse PDF"
          aria-label="Document PDF"
          frameborder="0"
        ></iframe>

        <!-- ===== IMAGE ===== -->
        <div v-else-if="isImage && blobUrl" class="image-viewer">
          <img
            :src="blobUrl"
            :alt="document.titre"
            class="doc-image"
            @load="imageLoaded = true"
            :class="{ zoomed: imageZoomed }"
            @click="imageZoomed = !imageZoomed"
            :title="imageZoomed ? 'Cliquer pour dézoomer' : 'Cliquer pour zoomer'"
          />
          <div class="image-hint" v-if="imageLoaded && !imageZoomed">
            <i class="ti ti-zoom-in" aria-hidden="true"></i> Cliquer pour agrandir
          </div>
        </div>

        <!-- ===== URL EXTERNE ===== -->
        <div v-else-if="document.urlExterne" class="external-viewer">
          <div class="external-card">
            <i class="ti ti-world" aria-hidden="true"></i>
            <h3>Document externe</h3>
            <p class="external-url">{{ document.urlExterne }}</p>
            <a :href="document.urlExterne" target="_blank" rel="noopener noreferrer" class="btn-external">
              <i class="ti ti-external-link" aria-hidden="true"></i>
              Ouvrir dans un nouvel onglet
            </a>
            <p class="external-note">
              Pour des raisons de sécurité, ce lien s'ouvre en dehors de l'application.
            </p>
          </div>
        </div>

        <!-- ===== Fichier non prévisualisable ===== -->
        <div v-else-if="blobUrl" class="download-only">
          <i class="ti ti-file-download" aria-hidden="true"></i>
          <h3>Prévisualisation indisponible</h3>
          <p>Ce type de fichier ne peut pas être affiché directement.</p>
          <button class="btn-primary" @click="handleDownload">
            <i class="ti ti-download" aria-hidden="true"></i>
            Télécharger le fichier
          </button>
        </div>

      </div>

      <!-- Description (si renseignée) -->
      <div v-if="document.description && !loading" class="viewer-footer">
        <i class="ti ti-info-circle" aria-hidden="true"></i>
        {{ document.description }}
        <span v-if="document.noteVersion" class="version-note">
          · <em>v{{ document.version }} : {{ document.noteVersion }}</em>
        </span>
      </div>

    </div>
  </div>
</template>

<script setup>
// MODULE: DOCUMENTS — DocumentViewer script
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore }    from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import * as docsApi        from '@/api/documents.api'

const props = defineProps({
  document: { type: Object, required: true },
})
const emit = defineEmits(['close', 'new-version', 'show-history'])

const authStore = useAuthStore()
const store     = useDocumentsStore()
const isMaintenance = computed(() => authStore.isMaintenance)

// #REGION state

const blobUrl    = ref(null)
const loading    = ref(false)
const error      = ref('')
const imageLoaded  = ref(false)
const imageZoomed  = ref(false)

// #ENDREGION state

// #REGION computed

const isPDF    = computed(() => props.document.mimeType === 'application/pdf')
const isImage  = computed(() => props.document.mimeType?.startsWith('image/'))

// #ENDREGION computed

// #REGION load-file

const loadFile = async () => {
  if (!props.document.urlFichier) return

  loading.value = true
  error.value   = ''

  try {
    blobUrl.value = await store.getOrFetchBlobUrl(props.document.id)
  } catch (err) {
    error.value = 'Impossible de charger le fichier. Vérifiez votre connexion.'
    console.error('[DocumentViewer]', err)
  } finally {
    loading.value = false
  }
}

// #ENDREGION load-file

// #REGION actions

const handleDownload = async () => {
  try { await docsApi.getDownloadUrl(props.document.id, props.document.titre) }
  catch { alert('Erreur lors du téléchargement.') }
}

// Fermeture par touche Escape
const handleKeydown = (e) => { if (e.key === 'Escape') emit('close') }
document.addEventListener('keydown', handleKeydown)

// #ENDREGION actions

// #REGION helpers

const typeIcon = (t) => ({
  MANUEL: 'ti-book', SCHEMA: 'ti-vector-bezier', PROCEDURE: 'ti-list-check',
  FICHE_SECURITE: 'ti-shield-check', AUTRE: 'ti-file',
}[t] || 'ti-file')

const typeLabel = (t) => ({
  MANUEL: 'Manuel', SCHEMA: 'Schéma', PROCEDURE: 'Procédure',
  FICHE_SECURITE: 'Fiche sécurité', AUTRE: 'Autre',
}[t] || t)

// #ENDREGION helpers

onMounted(loadFile)
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
/* MODULE: DOCUMENTS — DocumentViewer styles */
.viewer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
}

.viewer-modal {
  background: #16181f;
  border: 1px solid #2a2d38;
  border-radius: 14px;
  width: 100%;
  max-width: 1000px;
  height: calc(100vh - 80px);
  max-height: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.viewer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #2a2d38;
  gap: 12px; flex-shrink: 0; background: #0f1117;
}

.viewer-title-block { display: flex; align-items: flex-start; gap: 12px; flex: 1; overflow: hidden; }
.viewer-type-icon   { font-size: 24px; color: #1d9e75; flex-shrink: 0; padding-top: 2px; }
.viewer-title { font-size: 15px; font-weight: 600; color: #e8e8e8; margin: 0 0 5px; line-height: 1.3; }
.viewer-meta  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.viewer-type  { font-size: 11px; padding: 1px 7px; border-radius: 10px; font-weight: 500; }
.type-manuel         { background: rgba(12,68,124,0.2); color: #B5D4F4; }
.type-schema         { background: rgba(60,52,137,0.2); color: #AFA9EC; }
.type-procedure      { background: rgba(29,158,117,0.15); color: #5DCAA5; }
.type-fiche_securite { background: rgba(226,75,74,0.15); color: #f09595; }
.type-autre          { background: rgba(107,114,128,0.15); color: #9ca3af; }
.viewer-version { font-size: 11px; color: #1d9e75; font-weight: 500; }
.viewer-context { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9ca3af; }
.viewer-context i { font-size: 12px; color: #6b7280; }

.viewer-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.hdr-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px; background: #1e2030; border: 1px solid #2a2d38;
  border-radius: 7px; color: #c9cad1; font-size: 12px; cursor: pointer;
}
.hdr-btn:hover { background: #252840; color: #e8e8e8; }
.hdr-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 20px; padding: 4px; }
.hdr-close:hover { color: #e8e8e8; }

/* Zone de contenu */
.viewer-content { flex: 1; overflow: hidden; position: relative; background: #0a0b10; }

.viewer-loading,
.viewer-error,
.external-viewer,
.download-only {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 12px; color: #9ca3af; padding: 2rem; text-align: center;
}
.viewer-loading i { font-size: 32px; color: #1d9e75; }
.viewer-error i   { font-size: 32px; color: #f09595; }
.viewer-error p   { font-size: 14px; margin: 0; color: #f09595; }
.viewer-loading span { font-size: 14px; }

/* PDF */
.pdf-iframe { width: 100%; height: 100%; border: none; display: block; }

/* Image */
.image-viewer {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 8px; padding: 16px; overflow: auto; position: relative;
}
.doc-image {
  max-width: 100%; max-height: calc(100% - 30px);
  object-fit: contain; border-radius: 4px;
  cursor: zoom-in; transition: transform 0.2s; transform-origin: center;
}
.doc-image.zoomed { max-width: none; max-height: none; cursor: zoom-out; }
.image-hint { font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 4px; }

/* URL externe */
.external-card {
  background: #16181f; border: 1px solid #2a2d38; border-radius: 12px;
  padding: 2rem; max-width: 480px; display: flex; flex-direction: column;
  align-items: center; gap: 12px;
}
.external-card i { font-size: 40px; color: #1d9e75; }
.external-card h3 { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; }
.external-url { font-size: 12px; color: #6b7280; word-break: break-all; margin: 0; }
.btn-external {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; background: #1d9e75; color: #fff;
  border-radius: 8px; font-size: 13px; text-decoration: none;
}
.btn-external:hover { background: #17836a; }
.external-note { font-size: 11px; color: #3d4151; margin: 0; }

/* Téléchargement uniquement */
.download-only i { font-size: 40px; color: #9ca3af; }
.download-only h3 { font-size: 15px; font-weight: 600; color: #e8e8e8; margin: 0; }
.download-only p  { font-size: 13px; color: #9ca3af; margin: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: #17836a; }

/* Footer description */
.viewer-footer {
  padding: 8px 18px; border-top: 1px solid #2a2d38; background: #0f1117;
  font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 6px;
  flex-shrink: 0;
}
.viewer-footer i { color: #6b7280; flex-shrink: 0; }
.version-note { color: #6b7280; }
.version-note em { color: #1d9e75; font-style: normal; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .viewer-overlay { padding: 0; }
  .viewer-modal { border-radius: 0; height: 100vh; max-height: none; }
  .viewer-header { flex-direction: column; gap: 8px; }
  .viewer-header-actions { width: 100%; justify-content: flex-end; }
  .hdr-btn span { display: none; }
}
</style>
