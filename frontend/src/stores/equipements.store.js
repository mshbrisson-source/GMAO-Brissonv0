// ============================================================
// MODULE: EQUIPEMENTS
// STORE: equipements.store (Pinia)
// Cache l'arborescence et la machine sélectionnée.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as equipApi from '@/api/equipements.api'

export const useEquipementsStore = defineStore('equipements', () => {

  // #REGION state

  const tree              = ref([])   // ateliers + machines (arborescence)
  const machines          = ref([])   // liste plate
  const selectedMachine   = ref(null) // fiche machine complète
  const selectedAtelierId = ref(null)
  const loadingTree       = ref(false)
  const loadingMachine    = ref(false)

  // #ENDREGION state

  // #REGION getters

  const ateliersSorted = computed(() =>
    [...tree.value].sort((a, b) => a.nom.localeCompare(b.nom))
  )

  const machinesByAtelier = computed(() => (atelierId) =>
    machines.value.filter(m => m.atelierId === atelierId)
  )

  // #ENDREGION getters

  // #REGION actions

  const fetchTree = async () => {
    loadingTree.value = true
    try {
      tree.value = await equipApi.getTree()
    } finally {
      loadingTree.value = false
    }
  }

  const fetchMachines = async (params) => {
    machines.value = await equipApi.getMachines(params)
  }

  const fetchMachine = async (id) => {
    loadingMachine.value = true
    try {
      selectedMachine.value = await equipApi.getMachine(id)
    } finally {
      loadingMachine.value = false
    }
  }

  const selectAtelier = (id) => {
    selectedAtelierId.value = id
  }

  /** Met à jour la machine dans le cache après modification. */
  const patchMachineInTree = (updated) => {
    const atelier = tree.value.find(a => a.id === updated.atelierId)
    if (!atelier) return
    const idx = atelier.machines.findIndex(m => m.id === updated.id)
    if (idx !== -1) atelier.machines[idx] = { ...atelier.machines[idx], ...updated }
    if (selectedMachine.value?.id === updated.id) {
      selectedMachine.value = { ...selectedMachine.value, ...updated }
    }
  }

  const removeMachineFromTree = (machineId, atelierId) => {
    const atelier = tree.value.find(a => a.id === atelierId)
    if (atelier) {
      atelier.machines = atelier.machines.filter(m => m.id !== machineId)
    }
  }

  // #ENDREGION actions

  return {
    tree, machines, selectedMachine, selectedAtelierId,
    loadingTree, loadingMachine,
    ateliersSorted, machinesByAtelier,
    fetchTree, fetchMachines, fetchMachine,
    selectAtelier, patchMachineInTree, removeMachineFromTree,
  }
})
