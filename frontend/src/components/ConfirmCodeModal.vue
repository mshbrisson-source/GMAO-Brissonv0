<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button type="button" class="btn-icon" @click="$emit('cancel')">x</button>
      </div>

      <div class="modal-body">
        <slot />
        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn" @click="$emit('cancel')" :disabled="saving">Annuler</button>
        <button type="button" class="btn btn-primary" @click="$emit('confirm')" :disabled="saving">
          {{ saving ? 'Enregistrement...' : 'Confirmer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Confirmation' },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; z-index: 1200; }
.modal { width: min(760px, 94vw); max-height: 90vh; overflow: auto; background: #16181f; color: #e5e7eb; border: 1px solid #2a2d38; border-radius: 12px; }
.modal-header, .modal-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.modal-body { padding: 0 16px 16px; }
.btn-icon { border: 1px solid #334155; background: transparent; color: #cbd5e1; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
.btn { border: 1px solid #334155; background: transparent; color: #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
.btn-primary { background: #1d9e75; color: #fff; border-color: #1d9e75; }
.error { margin-top: 12px; color: #fca5a5; }
</style>
