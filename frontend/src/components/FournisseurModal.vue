<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>{{ fournisseur ? 'Modifier fournisseur' : 'Nouveau fournisseur' }}</h2>
      <p class="desc">Composant temporaire pour reconnecter l'UI.</p>
      <button class="btn" type="button" @click="$emit('saved')">Simuler sauvegarde</button>
      <button class="btn" type="button" @click="$emit('close')">Fermer</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  fournisseur: { type: Object, default: null },
});

defineEmits(['saved', 'close']);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; z-index: 1200; }
.modal { width: min(520px, 92vw); background: #16181f; color: #e5e7eb; border: 1px solid #2a2d38; border-radius: 12px; padding: 16px; display: grid; gap: 10px; }
.desc { color: #94a3b8; }
.btn { border: 1px solid #334155; background: transparent; color: #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
</style>
