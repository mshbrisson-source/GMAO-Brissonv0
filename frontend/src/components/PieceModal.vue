<template>
  <!-- ====================================================
    MODULE: STOCK — PieceModal
    Modes : 'create' | 'detail' (avec édition inline)
  ==================================================== -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" role="dialog" :aria-label="piece ? piece.nom : 'Nouvelle pièce'">

      <div class="modal-header">
        <h2>{{ piece ? piece.nom : 'Nouvelle pièce' }}</h2>
        <button class="modal-close" @click="$emit('close')"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <div class="field-group">
            <label>Référence *</label>
            <input v-model="form.reference" type="text" placeholder="REF-001" :disabled="!isEditing" />
          </div>
          <div class="field-group">
            <label>Désignation *</label>
            <input v-model="form.nom" type="text" placeholder="Roulement à billes" :disabled="!isEditing" />
          </div>
          <div class="field-group full">
            <label>Description</label>
            <textarea v-model="form.description" rows="2" :disabled="!isEditing" placeholder="Description optionnelle…"></textarea>
          </div>
          <div class="field-group">
            <label>Quantité en stock</label>
            <input v-model.number="form.quantiteStock" type="number" min="0" :disabled="mode === 'detail'" />
            <small class="field-hint" v-if="mode === 'detail'">Modifiable via les mouvements de stock uniquement.</small>
          </div>
          <div class="field-group">
            <label>Seuil d'alerte</label>
            <input v-model.number="form.seuilAlerte" type="number" min="0" :disabled="!isEditing" />
          </div>
          <div class="field-group">
            <label>Prix unitaire H.T. (€)</label>
            <input v-model.number="form.prixUnitaire" type="number" min="0" step="0.01" :disabled="!isEditing && !isAdmin" />
          </div>
          <div class="field-group">
            <label>Emplacement physique</label>
            <input v-model="form.emplacementPhysique" type="text" placeholder="Armoire A, tiroir 3" :disabled="!isEditing" />
          </div>
          <div class="field-group full">
            <label>Fournisseur</label>
            <select v-model="form.fournisseurId" :disabled="!isEditing">
              <option value="">— Aucun —</option>
              <option v-for="f in fournisseurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
            </select>
          </div>
          <div class="field-group full">
            <label>Lien de commande (URL)</label>
            <input v-model="form.lienCommande" type="url" placeholder="https://…" :disabled="!isEditing" />
          </div>
        </div>

        <!-- Machines associées (mode détail) -->
        <template v-if="piece && piece.pieceMachines?.length">
          <div class="section-title" style="margin-top:16px;">Machines associées</div>
          <div class="machines-tags">
            <span v-for="pm in piece.pieceMachines" :key="pm.machineId" class="machine-tag">
              <i class="ti ti-tools" aria-hidden="true"></i>
              {{ pm.machine.atelier?.nom }} / {{ pm.machine.nom }}
              <span v-if="pm.notes" class="tag-note">— {{ pm.notes }}</span>
            </span>
          </div>
        </template>

        <p v-if="error" class="modal-error"><i class="ti ti-alert-circle" aria-hidden="true"></i> {{ error }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Fermer</button>
        <template v-if="isAdmin || mode === 'create'">
          <button v-if="mode === 'detail' && !isEditing" class="btn-secondary" @click="isEditing = true">
            <i class="ti ti-edit" aria-hidden="true"></i> Modifier
          </button>
          <button v-if="isEditing || mode === 'create'" class="btn-primary" @click="handleSave" :disabled="saving">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import * as stockApi from '@/api/stock.api'

const props = defineProps({
  piece:        { type: Object, default: null },
  fournisseurs: { type: Array,  default: () => [] },
  mode:         { type: String, default: 'create' }, // 'create' | 'detail'
})
const emit = defineEmits(['saved', 'close'])

const authStore = useAuthStore()
const isAdmin   = computed(() => authStore.isAdmin)

const isEditing = ref(props.mode === 'create')
const saving    = ref(false)
const error     = ref('')

const form = reactive({
  reference: '', nom: '', description: '',
  quantiteStock: 0, seuilAlerte: 0, prixUnitaire: 0,
  emplacementPhysique: '', fournisseurId: '', lienCommande: '',
})

onMounted(() => {
  if (props.piece) {
    Object.assign(form, {
      reference:          props.piece.reference,
      nom:                props.piece.nom,
      description:        props.piece.description || '',
      quantiteStock:      props.piece.quantiteStock,
      seuilAlerte:        props.piece.seuilAlerte,
      prixUnitaire:       props.piece.prixUnitaire,
      emplacementPhysique: props.piece.emplacementPhysique || '',
      fournisseurId:      props.piece.fournisseurId || '',
      lienCommande:       props.piece.lienCommande || '',
    })
  }
})

const handleSave = async () => {
  if (!form.reference.trim() || !form.nom.trim()) { error.value = 'Référence et désignation sont requises.'; return }
  saving.value = true
  error.value  = ''
  try {
    if (props.piece) {
      const code = prompt('Code administrateur requis pour modifier cette pièce :')
      if (!code) { saving.value = false; return }
      await stockApi.updatePiece(props.piece.id, form, code)
    } else {
      const code = prompt('Code administrateur requis pour créer cette pièce :')
      if (!code) { saving.value = false; return }
      await stockApi.createPiece(form, code)
    }
    emit('saved')
  } catch (err) {
    error.value = err.response?.data?.error || 'Erreur lors de l\'enregistrement.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: #16181f; border: 1px solid #2a2d38; border-radius: 14px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2d38; position: sticky; top: 0; background: #16181f; z-index: 1; }
.modal-header h2 { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; }
.modal-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #2a2d38; display: flex; justify-content: flex-end; gap: 8px; position: sticky; bottom: 0; background: #16181f; }
.modal-error { display: flex; align-items: center; gap: 6px; color: #f09595; font-size: 13px; margin-top: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
.full { grid-column: 1 / -1; }
.field-group label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.field-group input, .field-group select, .field-group textarea { background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #e8e8e8; outline: none; font-family: inherit; resize: vertical; }
.field-group input:focus, .field-group select:focus, .field-group textarea:focus { border-color: #1d9e75; }
.field-group input:disabled, .field-group select:disabled, .field-group textarea:disabled { opacity: 0.6; cursor: not-allowed; }
.field-hint { font-size: 11px; color: #6b7280; }
.section-title { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.machines-tags { display: flex; flex-direction: column; gap: 4px; }
.machine-tag { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #c9cad1; padding: 5px 10px; background: #0f1117; border-radius: 6px; border: 1px solid #2a2d38; }
.machine-tag i { color: #6b7280; }
.tag-note { color: #6b7280; }
.btn-primary   { padding: 8px 16px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: #17836a; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { padding: 8px 16px; background: #1e2030; color: #c9cad1; border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
</style>
