<template>
  <!-- ====================================================
    MODULE: STOCK — BonCommandeBuilder
    Constructeur de bon de commande : sélection pièces,
    quantités, fournisseur, prévisualisation, export PDF.
  ==================================================== -->
  <div class="bc-layout">

    <!-- ===== COLONNE GAUCHE : Sélecteur de pièces ===== -->
    <div class="bc-left">
      <div class="bc-section-title">
        <i class="ti ti-search" aria-hidden="true"></i>
        Ajouter des pièces
      </div>

      <div class="search-box">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input v-model="searchQ" type="search" placeholder="Rechercher une pièce…" @input="filterPieces" />
      </div>

      <div class="pieces-picker">
        <div
          v-for="p in filteredPieces"
          :key="p.id"
          class="picker-item"
          :class="{ selected: isInPanier(p.id) }"
          @click="togglePiece(p)"
        >
          <div class="picker-info">
            <span class="picker-ref">{{ p.reference }}</span>
            <span class="picker-nom">{{ p.nom }}</span>
          </div>
          <div class="picker-right">
            <span class="picker-prix">{{ p.prixUnitaire.toFixed(2) }} €</span>
            <i v-if="isInPanier(p.id)" class="ti ti-check picker-check" aria-hidden="true"></i>
            <i v-else class="ti ti-plus picker-plus" aria-hidden="true"></i>
          </div>
        </div>
        <div v-if="!filteredPieces.length" class="picker-empty">Aucune pièce trouvée.</div>
      </div>
    </div>

    <!-- ===== COLONNE DROITE : Bon de commande ===== -->
    <div class="bc-right">

      <!-- En-tête bon -->
      <div class="bc-header-bon">
        <div class="bc-section-title">
          <i class="ti ti-file-invoice" aria-hidden="true"></i>
          Bon de commande
        </div>
        <button v-if="panier.length" class="btn-clear" @click="clearPanier" title="Vider le panier">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Sélecteur fournisseur -->
      <div class="bc-fourn">
        <label class="bc-label">Fournisseur</label>
        <select v-model="selectedFournisseurId" class="select-fourn">
          <option value="">— Sélectionner un fournisseur (optionnel) —</option>
          <option v-for="f in fournisseurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
        </select>
      </div>

      <!-- Numéro de bon -->
      <div class="bc-fourn" style="margin-top:8px">
        <label class="bc-label">Numéro de bon</label>
        <input v-model="numeroBon" type="text" class="input-bc" :placeholder="`BC-${dateStr}`" />
      </div>

      <!-- Panier vide -->
      <div v-if="!panier.length" class="bc-empty">
        <i class="ti ti-shopping-cart" aria-hidden="true"></i>
        <p>Sélectionnez des pièces depuis la liste.</p>
      </div>

      <!-- Lignes du bon -->
      <div v-else>
        <div class="bc-lines">
          <div class="bc-line-header">
            <span class="bc-col-ref">Réf.</span>
            <span class="bc-col-nom">Désignation</span>
            <span class="bc-col-qty">Qté</span>
            <span class="bc-col-pu">P.U.</span>
            <span class="bc-col-tot">Total</span>
            <span class="bc-col-act"></span>
          </div>

          <div v-for="(ligne, idx) in panier" :key="ligne.pieceId" class="bc-line">
            <span class="bc-col-ref ref-cell">{{ ligne.reference }}</span>
            <span class="bc-col-nom piece-nom">{{ ligne.nom }}</span>
            <div class="bc-col-qty">
              <button class="qty-btn" @click="changeQty(idx, -1)" :disabled="ligne.quantite <= 1" aria-label="Réduire quantité">−</button>
              <input
                v-model.number="ligne.quantite"
                type="number" min="1"
                class="qty-input"
                :aria-label="`Quantité pour ${ligne.nom}`"
                @change="ligne.quantite = Math.max(1, ligne.quantite)"
              />
              <button class="qty-btn" @click="changeQty(idx, 1)" aria-label="Augmenter quantité">+</button>
            </div>
            <span class="bc-col-pu price-cell">{{ ligne.prixUnitaire.toFixed(2) }} €</span>
            <span class="bc-col-tot price-cell total-cell">{{ (ligne.prixUnitaire * ligne.quantite).toFixed(2) }} €</span>
            <button class="bc-col-act act-remove" @click="removeLigne(idx)" aria-label="Supprimer la ligne">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <!-- Total -->
        <div class="bc-total-row">
          <span class="bc-total-label">Total H.T.</span>
          <span class="bc-total-val">{{ totalHT.toFixed(2) }} €</span>
        </div>

        <!-- Actions d'export -->
        <div class="bc-actions">
          <button class="btn-preview" @click="handlePreview" :disabled="generating">
            <i class="ti ti-eye" aria-hidden="true"></i>
            Prévisualiser
          </button>
          <button class="btn-download" @click="handleDownload" :disabled="generating || !panier.length">
            <i :class="generating ? 'ti ti-loader-2 spin' : 'ti ti-file-download'" aria-hidden="true"></i>
            {{ generating ? 'Génération…' : 'Télécharger PDF' }}
          </button>
        </div>
      </div>

      <!-- Prévisualisation JSON (résumé) -->
      <div v-if="preview" class="bc-preview">
        <div class="preview-header">
          <span>Aperçu du bon</span>
          <button class="btn-close-preview" @click="preview = null">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="preview-fourn" v-if="preview.fournisseur">
          <strong>{{ preview.fournisseur.nom }}</strong>
          <span v-if="preview.fournisseur.delaiLivraisonJ"> · Délai {{ preview.fournisseur.delaiLivraisonJ }}j</span>
        </div>
        <div class="preview-lines">
          <div v-for="l in preview.lignes" :key="l.reference" class="preview-line">
            <span class="prev-ref">{{ l.reference }}</span>
            <span class="prev-nom">{{ l.nom }}</span>
            <span class="prev-qty">×{{ l.quantite }}</span>
            <span class="prev-tot">{{ l.total.toFixed(2) }} €</span>
          </div>
        </div>
        <div class="preview-total">
          Total H.T. : <strong>{{ preview.totalHT.toFixed(2) }} €</strong>
        </div>
      </div>

    </div><!-- /bc-right -->

  </div>
</template>

<script setup>
// MODULE: STOCK — BonCommandeBuilder script
import { ref, computed, watch } from 'vue'
import * as stockApi from '@/api/stock.api'

const props = defineProps({
  fournisseurs:    { type: Array, default: () => [] },
  piecesInitiales: { type: Array, default: () => [] },
})
const emit = defineEmits(['clear'])

const allPieces = ref([])
const searchQ   = ref('')
const panier    = ref([])
const selectedFournisseurId = ref('')
const numeroBon = ref('')
const generating = ref(false)
const preview    = ref(null)

const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'')

// #REGION pieces-list

const fetchAllPieces = async () => {
  try { allPieces.value = await stockApi.getPieces() }
  catch { allPieces.value = [] }
}

const filteredPieces = computed(() => {
  if (!searchQ.value) return allPieces.value
  const q = searchQ.value.toLowerCase()
  return allPieces.value.filter(p =>
    p.nom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
  )
})

const filterPieces = () => {} // computed auto-update

// #ENDREGION pieces-list

// #REGION panier

const isInPanier = (id) => panier.value.some(l => l.pieceId === id)

const togglePiece = (p) => {
  const idx = panier.value.findIndex(l => l.pieceId === p.id)
  if (idx !== -1) { panier.value.splice(idx, 1); }
  else {
    panier.value.push({
      pieceId: p.id, reference: p.reference, nom: p.nom,
      prixUnitaire: p.prixUnitaire, quantite: 1,
    });
  }
  preview.value = null
}

const changeQty = (idx, delta) => {
  const newVal = panier.value[idx].quantite + delta
  if (newVal < 1) return
  panier.value[idx].quantite = newVal
  preview.value = null
}

const removeLigne = (idx) => { panier.value.splice(idx, 1); preview.value = null; }

const clearPanier = () => { panier.value = []; preview.value = null; emit('clear'); }

const totalHT = computed(() =>
  panier.value.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0)
)

// Initialiser le panier avec les pièces pré-sélectionnées (ajout depuis la table)
watch(() => props.piecesInitiales, (items) => {
  if (items?.length) {
    items.forEach(item => {
      if (!isInPanier(item.pieceId)) {
        panier.value.push({ ...item })
      }
    })
  }
}, { immediate: true })

// #ENDREGION panier

// #REGION pdf-actions

const handlePreview = async () => {
  if (!panier.value.length) return
  generating.value = true
  try {
    preview.value = await stockApi.previewBonCommande(
      panier.value.map(l => ({ pieceId: l.pieceId, quantite: l.quantite })),
      selectedFournisseurId.value || null
    )
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de la prévisualisation.')
  } finally {
    generating.value = false
  }
}

const handleDownload = async () => {
  if (!panier.value.length) return
  generating.value = true
  try {
    await stockApi.downloadBonCommande(
      panier.value.map(l => ({ pieceId: l.pieceId, quantite: l.quantite })),
      selectedFournisseurId.value || null,
      numeroBon.value || `BC-${dateStr}`
    )
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de la génération du PDF.')
  } finally {
    generating.value = false
  }
}

// #ENDREGION pdf-actions

fetchAllPieces()
</script>

<style scoped>
.bc-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: 100%;
}

.bc-section-title {
  font-size: 12px; font-weight: 500; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
}

/* Colonne gauche */
.bc-left  { display: flex; flex-direction: column; gap: 10px; }
.bc-right { display: flex; flex-direction: column; gap: 10px; }

.search-box { display: flex; align-items: center; gap: 8px; background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; padding: 0 12px; }
.search-box i { color: #6b7280; }
.search-box input { background: none; border: none; outline: none; color: #e8e8e8; font-size: 13px; padding: 8px 0; width: 100%; }

.pieces-picker { flex: 1; overflow-y: auto; max-height: calc(100vh - 300px); display: flex; flex-direction: column; gap: 4px; }
.picker-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #16181f; border: 1px solid #2a2d38; border-radius: 8px;
  cursor: pointer; transition: all 0.12s;
}
.picker-item:hover    { border-color: #1d9e75; background: #1a1d2a; }
.picker-item.selected { border-color: #1d9e75; background: rgba(29,158,117,0.08); }
.picker-info { display: flex; flex-direction: column; gap: 2px; }
.picker-ref  { font-size: 10px; color: #6b7280; font-family: monospace; }
.picker-nom  { font-size: 13px; color: #e8e8e8; }
.picker-right { display: flex; align-items: center; gap: 8px; }
.picker-prix  { font-size: 12px; color: #9ca3af; }
.picker-check { color: #1d9e75; font-size: 15px; }
.picker-plus  { color: #6b7280; font-size: 15px; }
.picker-empty { text-align: center; padding: 2rem; color: #6b7280; font-size: 13px; }

/* Bon droite */
.bc-header-bon { display: flex; align-items: center; justify-content: space-between; }
.btn-clear { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 14px; }
.btn-clear:hover { color: #f09595; }

.bc-fourn { display: flex; flex-direction: column; gap: 5px; }
.bc-label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.select-fourn, .input-bc {
  background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px;
  padding: 8px 12px; font-size: 13px; color: #e8e8e8; outline: none; width: 100%;
}
.select-fourn option { background: #16181f; }
.select-fourn:focus, .input-bc:focus { border-color: #1d9e75; }

.bc-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 2rem; color: #6b7280; text-align: center; }
.bc-empty i { font-size: 32px; }
.bc-empty p { font-size: 13px; margin: 0; }

/* Lignes du bon */
.bc-lines { border: 1px solid #2a2d38; border-radius: 8px; overflow: hidden; }
.bc-line-header, .bc-line {
  display: grid; grid-template-columns: 70px 1fr 100px 70px 70px 28px;
  gap: 8px; align-items: center; padding: 7px 10px;
}
.bc-line-header { background: #0f1117; font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; }
.bc-line { border-top: 1px solid #1e2030; }
.bc-line:hover { background: #1a1d2a; }

.bc-col-ref { font-family: monospace; font-size: 11px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-col-nom { font-size: 12px; color: #e8e8e8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-col-qty { display: flex; align-items: center; gap: 3px; }
.bc-col-pu  { font-size: 12px; color: #9ca3af; text-align: right; }
.bc-col-tot { font-size: 12px; font-weight: 500; color: #e8e8e8; text-align: right; }

.qty-btn {
  width: 22px; height: 22px; background: #1e2030; border: 1px solid #2a2d38; border-radius: 4px;
  color: #c9cad1; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0;
}
.qty-btn:hover:not(:disabled) { background: #252840; }
.qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.qty-input {
  width: 38px; text-align: center; background: #0f1117; border: 1px solid #2a2d38;
  border-radius: 4px; color: #e8e8e8; font-size: 12px; padding: 2px 4px; outline: none;
}
.qty-input:focus { border-color: #1d9e75; }

.act-remove { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 13px; padding: 2px; }
.act-remove:hover { color: #f09595; }

/* Total */
.bc-total-row {
  display: flex; justify-content: flex-end; align-items: center; gap: 14px;
  padding: 10px 10px; background: rgba(29,158,117,0.1); border-radius: 0 0 8px 8px;
  border: 1px solid rgba(29,158,117,0.25); border-top: none; margin-top: -1px;
}
.bc-total-label { font-size: 13px; font-weight: 500; color: #9ca3af; }
.bc-total-val   { font-size: 18px; font-weight: 700; color: #1d9e75; }

/* Actions export */
.bc-actions { display: flex; gap: 8px; margin-top: 4px; }
.btn-preview  { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: #1e2030; border: 1px solid #2a2d38; border-radius: 8px; color: #c9cad1; font-size: 13px; cursor: pointer; }
.btn-preview:hover:not(:disabled) { background: #252840; }
.btn-download { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: #1d9e75; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-download:hover:not(:disabled) { background: #17836a; }
.btn-download:disabled, .btn-preview:disabled { opacity: 0.6; cursor: not-allowed; }

/* Prévisualisation */
.bc-preview { background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px; overflow: hidden; }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #2a2d38; font-size: 12px; font-weight: 500; color: #9ca3af; }
.btn-close-preview { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 14px; }
.preview-fourn { padding: 8px 12px; font-size: 12px; color: #9ca3af; border-bottom: 1px solid #1e2030; }
.preview-fourn strong { color: #e8e8e8; }
.preview-lines { padding: 6px 0; }
.preview-line { display: flex; gap: 10px; align-items: center; padding: 5px 12px; }
.prev-ref { font-size: 10px; color: #6b7280; font-family: monospace; min-width: 60px; }
.prev-nom { font-size: 12px; color: #c9cad1; flex: 1; }
.prev-qty { font-size: 12px; color: #9ca3af; min-width: 25px; text-align: center; }
.prev-tot { font-size: 12px; font-weight: 500; color: #e8e8e8; min-width: 60px; text-align: right; }
.preview-total { padding: 8px 12px; border-top: 1px solid #2a2d38; font-size: 13px; color: #9ca3af; text-align: right; }
.preview-total strong { color: #1d9e75; font-size: 15px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 900px) {
  .bc-layout { grid-template-columns: 1fr; }
  .pieces-picker { max-height: 240px; }
  .bc-line-header, .bc-line { grid-template-columns: 60px 1fr 90px 60px 60px 28px; }
}
</style>
