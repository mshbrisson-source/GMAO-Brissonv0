// ============================================================
// MODULE: DOCUMENTS
// STORE: documents.store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as docsApi from '@/api/documents.api'

export const useDocumentsStore = defineStore('documents', () => {

  // #REGION state

  const documents  = ref([])
  const loading    = ref(false)
  const activeFilters = ref({ q: '', machineId: '', pieceId: '', typeDoc: '' })

  // Blob URLs en cache pour éviter de re-fetcher le même fichier
  const blobUrlCache = ref(new Map())

  // #ENDREGION state

  // #REGION getters

  const byType = computed(() => {
    const groups = {}
    documents.value.forEach(d => {
      if (!groups[d.typeDoc]) groups[d.typeDoc] = []
      groups[d.typeDoc].push(d)
    })
    return groups
  })

  const typeCounts = computed(() => {
    const c = {}
    documents.value.forEach(d => { c[d.typeDoc] = (c[d.typeDoc] || 0) + 1 })
    return c
  })

  // #ENDREGION getters

  // #REGION actions

  const fetchDocuments = async (filters = {}) => {
    loading.value = true
    Object.assign(activeFilters.value, filters)
    try {
      documents.value = await docsApi.getDocuments(
        Object.fromEntries(Object.entries(activeFilters.value).filter(([, v]) => v))
      )
    } finally {
      loading.value = false
    }
  }

  /**
   * Retourne une blob URL pour un document (avec cache).
   * Nettoie automatiquement les URLs après utilisation.
   */
  const getOrFetchBlobUrl = async (id) => {
    if (blobUrlCache.value.has(id)) return blobUrlCache.value.get(id)
    const url = await docsApi.getViewUrl(id)
    blobUrlCache.value.set(id, url)
    return url
  }

  const clearBlobCache = () => {
    blobUrlCache.value.forEach(url => URL.revokeObjectURL(url))
    blobUrlCache.value.clear()
  }

  const addDocument = (doc) => {
    // Insérer en tête de liste si c'est une version courante
    if (doc.isCurrent) {
      // Retirer une éventuelle version précédente du même groupe
      documents.value = documents.value.filter(d => d.groupId !== doc.groupId)
      documents.value.unshift(doc)
    }
  }

  const removeDocument = (groupId) => {
    documents.value = documents.value.filter(d => d.groupId !== groupId)
  }

  // #ENDREGION actions

  return {
    documents, loading, activeFilters,
    byType, typeCounts,
    fetchDocuments, getOrFetchBlobUrl, clearBlobCache, addDocument, removeDocument,
  }
})
