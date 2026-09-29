// ============================================================
// MODULE: STOCK
// STORE: stock.store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as stockApi from '@/api/stock.api'

export const useStockStore = defineStore('stock', () => {

  // #REGION state

  const pieces        = ref([])
  const fournisseurs  = ref([])
  const mouvements    = ref([])
  const alertes       = ref([])   // pièces sous seuil
  const loading       = ref(false)
  const mouvTotal     = ref(0)

  // #ENDREGION state

  // #REGION getters

  const nbAlertes       = computed(() => alertes.value.length)
  const piecesParAlerte = computed(() =>
    pieces.value.filter(p => p.quantiteStock <= p.seuilAlerte)
  )
  const fournisseurOptions = computed(() =>
    fournisseurs.value.map(f => ({ value: f.id, label: f.nom }))
  )

  // #ENDREGION getters

  // #REGION actions

  const fetchPieces = async (params) => {
    loading.value = true
    try { pieces.value = await stockApi.getPieces(params) }
    finally { loading.value = false }
  }

  const fetchAlertes = async () => {
    alertes.value = await stockApi.getPiecesAlerte()
  }

  const fetchFournisseurs = async () => {
    fournisseurs.value = await stockApi.getFournisseurs()
  }

  const fetchMouvements = async (params) => {
    loading.value = true
    try {
      const data = await stockApi.getMouvements(params)
      mouvements.value = data.data
      mouvTotal.value  = data.total
    } finally {
      loading.value = false
    }
  }

  const patchPiece = (updated) => {
    const idx = pieces.value.findIndex(p => p.id === updated.id)
    if (idx !== -1) pieces.value[idx] = { ...pieces.value[idx], ...updated }
  }

  const removePiece = (id) => {
    pieces.value = pieces.value.filter(p => p.id !== id)
  }

  const addMouvement = (m) => {
    mouvements.value.unshift(m)
    // Mettre à jour le stock de la pièce dans le cache
    const idx = pieces.value.findIndex(p => p.id === m.pieceId)
    if (idx !== -1) {
      const delta = m.type === 'ENTREE' ? m.quantite : -m.quantite
      pieces.value[idx] = { ...pieces.value[idx], quantiteStock: pieces.value[idx].quantiteStock + delta }
    }
  }

  // #ENDREGION actions

  return {
    pieces, fournisseurs, mouvements, alertes, loading, mouvTotal,
    nbAlertes, piecesParAlerte, fournisseurOptions,
    fetchPieces, fetchAlertes, fetchFournisseurs, fetchMouvements,
    patchPiece, removePiece, addMouvement,
  }
})
