<template>
  <!-- ====================================================
    MODULE: EQUIPEMENTS — AtelierTree
    Panneau latéral : arborescence Atelier → Machine.
    Gère l'état d'ouverture/fermeture de chaque atelier.
  ==================================================== -->
  <aside class="tree-panel" aria-label="Arborescence des ateliers">

    <div class="tree-header">
      <span class="tree-title">
        <i class="ti ti-sitemap" aria-hidden="true"></i>
        Arborescence
      </span>
      <button
        v-if="isAdmin"
        class="btn-icon"
        title="Nouvel atelier"
        @click="$emit('create-atelier')"
        aria-label="Créer un atelier"
      >
        <i class="ti ti-plus" aria-hidden="true"></i>
      </button>
    </div>

    <div class="tree-search">
      <i class="ti ti-search" aria-hidden="true"></i>
      <input
        v-model="q"
        type="search"
        placeholder="Filtrer…"
        aria-label="Filtrer les équipements"
      />
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="tree-loading">
      <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
    </div>

    <!-- Arborescence -->
    <div v-else class="tree-body">
      <div v-if="filteredAteliers.length === 0" class="tree-empty">
        Aucun atelier trouvé.
      </div>

      <div
        v-for="atelier in filteredAteliers"
        :key="atelier.id"
        class="tree-atelier"
      >
        <!-- Nœud atelier -->
        <div
          class="atelier-node"
          :class="{ active: selectedAtelierId === atelier.id }"
          @click="toggleAtelier(atelier.id)"
          :aria-expanded="openAteliers.has(atelier.id)"
          role="button"
          tabindex="0"
          @keydown.enter="toggleAtelier(atelier.id)"
        >
          <i
            class="ti tree-caret"
            :class="openAteliers.has(atelier.id) ? 'ti-chevron-down' : 'ti-chevron-right'"
            aria-hidden="true"
          ></i>
          <i class="ti ti-building-factory-2 atelier-icon" aria-hidden="true"></i>
          <span class="atelier-nom">{{ atelier.nom }}</span>
          <span class="machine-count">{{ atelier._count?.machines ?? atelier.machines?.length ?? 0 }}</span>
        </div>

        <!-- Machines de l'atelier -->
        <div v-if="openAteliers.has(atelier.id)" class="machine-list">
          <div
            v-for="machine in filterMachines(atelier.machines)"
            :key="machine.id"
            class="machine-node"
            :class="{ active: selectedMachineId === machine.id }"
            @click="$emit('select-machine', machine.id)"
            role="button"
            tabindex="0"
            @keydown.enter="$emit('select-machine', machine.id)"
          >
            <i class="ti ti-tools machine-icon" aria-hidden="true"></i>
            <span class="machine-nom">{{ machine.nom }}</span>
            <span v-if="!machine.actif" class="archived-tag">archivée</span>
          </div>

          <div v-if="filterMachines(atelier.machines).length === 0" class="no-machines">
            Aucune machine
          </div>

          <!-- Ajouter une machine -->
          <button
            v-if="isAdmin"
            class="add-machine-btn"
            @click.stop="$emit('create-machine', atelier.id)"
            :title="`Ajouter une machine à ${atelier.nom}`"
          >
            <i class="ti ti-plus" aria-hidden="true"></i>
            Ajouter une machine
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
// MODULE: EQUIPEMENTS — AtelierTree script
import { ref, computed } from 'vue'
import { useAuthStore }   from '@/stores/auth.store'

const props = defineProps({
  ateliers:          { type: Array,  default: () => [] },
  loading:           { type: Boolean, default: false },
  selectedAtelierId: { type: String,  default: null },
  selectedMachineId: { type: String,  default: null },
})

const emit = defineEmits(['select-machine', 'create-atelier', 'create-machine'])

const authStore = useAuthStore()
const isAdmin   = computed(() => authStore.isAdmin)

const q            = ref('')
const openAteliers = ref(new Set())

// Ouvrir tous les ateliers par défaut
props.ateliers.forEach(a => openAteliers.value.add(a.id))

const toggleAtelier = (id) => {
  if (openAteliers.value.has(id)) {
    openAteliers.value.delete(id)
  } else {
    openAteliers.value.add(id)
  }
}

const filteredAteliers = computed(() => {
  if (!q.value) return props.ateliers
  const lq = q.value.toLowerCase()
  return props.ateliers.filter(a =>
    a.nom.toLowerCase().includes(lq) ||
    a.machines?.some(m => m.nom.toLowerCase().includes(lq))
  )
})

const filterMachines = (machines = []) => {
  if (!q.value) return machines
  return machines.filter(m => m.nom.toLowerCase().includes(q.value.toLowerCase()))
}
</script>

<style scoped>
.tree-panel {
  width: 260px;
  min-width: 220px;
  background: #16181f;
  border-right: 1px solid #2a2d38;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #2a2d38;
}

.tree-title {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  background: none;
  border: 1px solid #2a2d38;
  border-radius: 6px;
  padding: 4px 7px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.btn-icon:hover { background: #1e2030; color: #1d9e75; }

.tree-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #1e2030;
}

.tree-search i { color: #6b7280; font-size: 13px; }

.tree-search input {
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: #e8e8e8;
  width: 100%;
}

.tree-search input::placeholder { color: #3d4151; }

.tree-body {
  overflow-y: auto;
  flex: 1;
  padding: 6px 0;
}

.tree-loading,
.tree-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
  font-size: 13px;
  gap: 6px;
}

/* Nœud atelier */
.atelier-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
  border-radius: 6px;
  margin: 1px 4px;
}

.atelier-node:hover  { background: #1e2030; }
.atelier-node.active { background: #1d3d30; }
.atelier-node:focus-visible { outline: 2px solid #1d9e75; outline-offset: -2px; }

.tree-caret   { font-size: 12px; color: #6b7280; flex-shrink: 0; }
.atelier-icon { font-size: 14px; color: #9ca3af; flex-shrink: 0; }
.atelier-nom  { font-size: 13px; font-weight: 500; color: #e8e8e8; flex: 1; }

.machine-count {
  font-size: 10px;
  background: #1e2030;
  color: #6b7280;
  border-radius: 10px;
  padding: 1px 7px;
  flex-shrink: 0;
}

/* Liste machines */
.machine-list { padding-left: 20px; }

.machine-node {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 6px;
  margin: 1px 4px;
  transition: background 0.1s;
}

.machine-node:hover  { background: #1e2030; }
.machine-node.active { background: #1d3d30; border-left: 2px solid #1d9e75; }
.machine-node:focus-visible { outline: 2px solid #1d9e75; outline-offset: -2px; }

.machine-icon { font-size: 13px; color: #6b7280; flex-shrink: 0; }
.machine-nom  { font-size: 12px; color: #c9cad1; flex: 1; }

.archived-tag {
  font-size: 9px;
  color: #f09595;
  border: 1px solid rgba(226,75,74,0.3);
  border-radius: 3px;
  padding: 1px 4px;
}

.no-machines {
  font-size: 11px;
  color: #3d4151;
  padding: 4px 10px 4px 24px;
  font-style: italic;
}

.add-machine-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: #1d9e75;
  font-size: 11px;
  cursor: pointer;
  padding: 5px 10px 5px 24px;
  width: 100%;
  text-align: left;
  opacity: 0.7;
  transition: opacity 0.1s;
}

.add-machine-btn:hover { opacity: 1; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .tree-panel {
    width: 100%;
    max-height: 220px;
    border-right: none;
    border-bottom: 1px solid #2a2d38;
  }
}
</style>
