<template>
  <!-- ====================================================
    MODULE: STOCK — StockView
    Vue principale : onglets Pièces | Fournisseurs
                              Mouvements | Bon de commande
  ==================================================== -->
  <div class="stock-view">

    <!-- Topbar -->
    <div class="stock-topbar">
      <div class="topbar-left">
        <h1 class="page-title">
          <i class="ti ti-package" aria-hidden="true"></i>
          Stock & Magasin
        </h1>
        <!-- Badge alertes globales -->
        <span v-if="store.nbAlertes > 0" class="global-alerte" title="Pièces sous le seuil minimum">
          <i class="ti ti-alert-triangle" aria-hidden="true"></i>
          {{ store.nbAlertes }} alerte{{ store.nbAlertes > 1 ? 's' : '' }}
        </span>
      </div>
      <div class="topbar-actions">
        <button v-if="activeTab === 'pieces' && isMaintenance"   class="btn-primary" @click="openCreatePiece">
          <i class="ti ti-plus" aria-hidden="true"></i> Nouvelle pièce
        </button>
        <button v-if="activeTab === 'fournisseurs' && isAdmin"   class="btn-primary" @click="openCreateFournisseur">
          <i class="ti ti-plus" aria-hidden="true"></i> Nouveau fournisseur
        </button>
        <button v-if="activeTab === 'mouvements' && isMaintenance" class="btn-primary" @click="showMouvModal = true; mouvType = 'ENTREE'">
          <i class="ti ti-arrow-down" aria-hidden="true"></i> Entrée
        </button>
        <button v-if="activeTab === 'mouvements' && isMaintenance" class="btn-secondary" @click="showMouvModal = true; mouvType = 'SORTIE'">
          <i class="ti ti-arrow-up" aria-hidden="true"></i> Sortie
        </button>
      </div>
    </div>

    <!-- Navigation onglets -->
    <nav class="tabs-nav" role="tablist">
      <button v-for="t in tabs" :key="t.id" class="tab-btn" :class="{ active: activeTab === t.id }"
        role="tab" :aria-selected="activeTab === t.id" @click="activeTab = t.id">
        <i :class="`ti ${t.icon}`" aria-hidden="true"></i>
        {{ t.label }}
        <span v-if="t.badge" class="tab-badge alerte">{{ t.badge }}</span>
      </button>
    </nav>

    <!-- ===== ONGLET PIÈCES ===== -->
    <div v-if="activeTab === 'pieces'" class="tab-content">

      <!-- Filtres pièces -->
      <div class="filters-row">
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input v-model="pieceQ" type="search" placeholder="Référence, désignation…" @input="debouncedSearch" />
        </div>
        <select v-model="filterFournisseur" class="select-filter" @change="fetchPieces">
          <option value="">Tous les fournisseurs</option>
          <option v-for="f in store.fournisseurs" :key="f.id" :value="f.id">{{ f.nom }}</option>
        </select>
        <label class="filter-check">
          <input type="checkbox" v-model="filterAlerte" @change="fetchPieces" />
          <i class="ti ti-alert-triangle text-danger" aria-hidden="true"></i>
          Alertes uniquement
        </label>
      </div>

      <!-- Table des pièces -->
      <div class="table-wrapper">
        <table class="stock-table" aria-label="Catalogue des pièces">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Stock</th>
              <th>Seuil</th>
              <th>Prix HT</th>
              <th>Emplacement</th>
              <th>Fournisseur</th>
              <th>Machines</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.loading">
              <td colspan="9" class="table-center"><i class="ti ti-loader-2 spin" aria-hidden="true"></i> Chargement…</td>
            </tr>
            <tr v-for="p in store.pieces" :key="p.id" class="piece-row" :class="{ 'row-alerte': p.quantiteStock <= p.seuilAlerte }">
              <td class="ref-cell">{{ p.reference }}</td>
              <td>
                <div class="piece-nom">{{ p.nom }}</div>
                <div v-if="p.description" class="piece-desc">{{ p.description }}</div>
              </td>
              <td>
                <span class="stock-val" :class="stockClass(p)">{{ p.quantiteStock }}</span>
                <i v-if="p.quantiteStock <= p.seuilAlerte" class="ti ti-alert-triangle alerte-icon" title="Sous le seuil minimum" aria-label="Stock sous le seuil minimum"></i>
              </td>
              <td class="text-muted">{{ p.seuilAlerte }}</td>
              <td class="price-cell">{{ p.prixUnitaire.toFixed(2) }} €</td>
              <td class="text-muted">{{ p.emplacementPhysique || '—' }}</td>
              <td>
                <span v-if="p.fournisseur" class="fourn-chip">{{ p.fournisseur.nom }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <div class="machines-chips">
                  <span v-for="pm in p.pieceMachines.slice(0,2)" :key="pm.machineId" class="machine-chip">
                    {{ pm.machine.nom }}
                  </span>
                  <span v-if="p.pieceMachines.length > 2" class="machine-chip more">
                    +{{ p.pieceMachines.length - 2 }}
                  </span>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <button class="act-btn" title="Voir la pièce" @click="openPieceDetail(p)">
                    <i class="ti ti-eye" aria-hidden="true"></i>
                  </button>
                  <a v-if="p.lienCommande" :href="p.lienCommande" target="_blank" class="act-btn" title="Commander">
                    <i class="ti ti-external-link" aria-hidden="true"></i>
                  </a>
                  <button class="act-btn" title="Ajouter au bon de commande" @click="addToBonCommande(p)">
                    <i class="ti ti-shopping-cart" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!store.loading && !store.pieces.length">
              <td colspan="9" class="table-center text-muted">Aucune pièce trouvée.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== ONGLET FOURNISSEURS ===== -->
    <div v-if="activeTab === 'fournisseurs'" class="tab-content">
      <div class="fournisseurs-grid">
        <div
          v-for="f in store.fournisseurs"
          :key="f.id"
          class="fournisseur-card"
        >
          <div class="fourn-header">
            <div class="fourn-avatar">{{ f.nom.charAt(0).toUpperCase() }}</div>
            <div>
              <div class="fourn-nom">{{ f.nom }}</div>
              <div class="fourn-count">{{ f._count?.pieces ?? 0 }} pièce(s)</div>
            </div>
          </div>
          <div class="fourn-body">
            <div v-if="f.contact"        class="fourn-row"><i class="ti ti-user" aria-hidden="true"></i>{{ f.contact }}</div>
            <div v-if="f.email"          class="fourn-row"><i class="ti ti-mail" aria-hidden="true"></i>{{ f.email }}</div>
            <div v-if="f.telephone"      class="fourn-row"><i class="ti ti-phone" aria-hidden="true"></i>{{ f.telephone }}</div>
            <div v-if="f.delaiLivraisonJ" class="fourn-row fourn-delai">
              <i class="ti ti-clock" aria-hidden="true"></i>Délai {{ f.delaiLivraisonJ }} j.
            </div>
            <div v-if="f.conditions"     class="fourn-row fourn-conditions">{{ f.conditions }}</div>
          </div>
          <div v-if="isAdmin" class="fourn-footer">
            <button class="act-btn" @click="openEditFournisseur(f)"><i class="ti ti-edit" aria-hidden="true"></i></button>
            <button class="act-btn danger" @click="handleDeleteFournisseur(f)"><i class="ti ti-trash" aria-hidden="true"></i></button>
          </div>
        </div>
        <div v-if="!store.fournisseurs.length" class="empty-grid">
          <i class="ti ti-truck" aria-hidden="true"></i>
          <p>Aucun fournisseur enregistré.</p>
        </div>
      </div>
    </div>

    <!-- ===== ONGLET MOUVEMENTS ===== -->
    <div v-if="activeTab === 'mouvements'" class="tab-content">

      <!-- Filtres mouvements -->
      <div class="filters-row">
        <select v-model="mouvFiltre.type" class="select-filter" @change="loadMouvements">
          <option value="">Tous les types</option>
          <option value="ENTREE">Entrées</option>
          <option value="SORTIE">Sorties</option>
        </select>
        <input v-model="mouvFiltre.dateDebut" type="date" class="input-date" @change="loadMouvements" aria-label="Date de début" />
        <input v-model="mouvFiltre.dateFin"   type="date" class="input-date" @change="loadMouvements" aria-label="Date de fin" />
        <button class="btn-secondary" @click="resetMouvFiltres">
          <i class="ti ti-refresh" aria-hidden="true"></i> Réinitialiser
        </button>
      </div>

      <div class="table-wrapper">
        <table class="stock-table" aria-label="Historique des mouvements de stock">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Pièce</th>
              <th>Référence</th>
              <th>Qté</th>
              <th>Prix unit.</th>
              <th>Total</th>
              <th>Intervention</th>
              <th>Opérateur</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.loading">
              <td colspan="10" class="table-center"><i class="ti ti-loader-2 spin" aria-hidden="true"></i></td>
            </tr>
            <tr v-for="m in store.mouvements" :key="m.id" :class="m.type === 'ENTREE' ? 'row-entree' : 'row-sortie'">
              <td class="date-cell">{{ formatDate(m.dateMouvement) }}</td>
              <td>
                <span :class="m.type === 'ENTREE' ? 'badge-entree' : 'badge-sortie'">
                  <i :class="m.type === 'ENTREE' ? 'ti ti-arrow-down' : 'ti ti-arrow-up'" aria-hidden="true"></i>
                  {{ m.type === 'ENTREE' ? 'Entrée' : 'Sortie' }}
                </span>
              </td>
              <td>{{ m.piece?.nom }}</td>
              <td class="ref-cell">{{ m.piece?.reference }}</td>
              <td class="qty-cell" :class="m.type === 'ENTREE' ? 'text-success' : 'text-danger'">
                {{ m.type === 'ENTREE' ? '+' : '-' }}{{ m.quantite }}
              </td>
              <td class="price-cell">{{ m.prixUnitaireSnapshot?.toFixed(2) ?? '—' }} €</td>
              <td class="price-cell">{{ m.prixUnitaireSnapshot ? (m.prixUnitaireSnapshot * m.quantite).toFixed(2) : '—' }} €</td>
              <td class="text-muted">{{ m.intervention?.machine?.nom || '—' }}</td>
              <td class="text-muted">{{ m.user ? `${m.user.prenom} ${m.user.nom}` : '—' }}</td>
              <td class="text-muted">{{ m.notes || '—' }}</td>
            </tr>
            <tr v-if="!store.loading && !store.mouvements.length">
              <td colspan="10" class="table-center text-muted">Aucun mouvement trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="store.mouvTotal > 0" class="pagination-info">
        {{ store.mouvTotal }} mouvement(s) au total
      </div>
    </div>

    <!-- ===== ONGLET BON DE COMMANDE ===== -->
    <div v-if="activeTab === 'boncommande'" class="tab-content">
      <BonCommandeBuilder
        :fournisseurs="store.fournisseurs"
        :pieces-initiales="bonCommandeItems"
        @clear="bonCommandeItems = []"
      />
    </div>

    <!-- ====================================================
      MODALES
    ==================================================== -->

    <!-- Modal Pièce (créer / voir / modifier) -->
    <Teleport to="body">
      <PieceModal
        v-if="showPieceModal"
        :piece="editingPiece"
        :fournisseurs="store.fournisseurs"
        :mode="pieceModalMode"
        @saved="onPieceSaved"
        @close="showPieceModal = false"
      />
    </Teleport>

    <!-- Modal Fournisseur -->
    <Teleport to="body">
      <FournisseurModal
        v-if="showFournisseurModal"
        :fournisseur="editingFournisseur"
        @saved="onFournisseurSaved"
        @close="showFournisseurModal = false"
      />
    </Teleport>

    <!-- Modal Mouvement (entrée / sortie) -->
    <Teleport to="body">
      <MouvementModal
        v-if="showMouvModal"
        :type="mouvType"
        :pieces="store.pieces"
        :piece-pre-selectionne="mouvPieceId"
        @saved="onMouvementSaved"
        @close="showMouvModal = false; mouvPieceId = null"
      />
    </Teleport>

  </div>
</template>

<script setup>
// MODULE: STOCK — StockView script
import { ref, reactive, computed, onMounted } from 'vue'
import { useStockStore }  from '@/stores/stock.store'
import { useAuthStore }   from '@/stores/auth.store'
import * as stockApi      from '@/api/stock.api'
import PieceModal         from '@/components/PieceModal.vue'
import FournisseurModal   from '@/components/FournisseurModal.vue'
import MouvementModal     from '@/components/MouvementModal.vue'
import BonCommandeBuilder from '@/components/BonCommandeBuilder.vue'

const store     = useStockStore()
const authStore = useAuthStore()
const isAdmin         = computed(() => authStore.isAdmin)
const isMaintenance   = computed(() => authStore.isMaintenance)

// #REGION tabs

const activeTab = ref('pieces')
const tabs = computed(() => [
  { id: 'pieces',      label: 'Pièces',         icon: 'ti-package' },
  { id: 'fournisseurs',label: 'Fournisseurs',    icon: 'ti-truck' },
  { id: 'mouvements',  label: 'Mouvements',      icon: 'ti-arrows-exchange' },
  { id: 'boncommande', label: 'Bon de commande', icon: 'ti-file-invoice',
    badge: bonCommandeItems.value?.length || null },
])

// #ENDREGION tabs

// #REGION pieces-state

const pieceQ            = ref('')
const filterFournisseur = ref('')
const filterAlerte      = ref(false)

let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchPieces, 300)
}

const fetchPieces = () => store.fetchPieces({
  q:            pieceQ.value || undefined,
  fournisseurId: filterFournisseur.value || undefined,
  alerteOnly:   filterAlerte.value || undefined,
})

// #ENDREGION pieces-state

// #REGION mouvements-state

const mouvFiltre = reactive({ type: '', dateDebut: '', dateFin: '' })

const loadMouvements = () => store.fetchMouvements({
  type:      mouvFiltre.type      || undefined,
  dateDebut: mouvFiltre.dateDebut || undefined,
  dateFin:   mouvFiltre.dateFin   || undefined,
})

const resetMouvFiltres = () => {
  Object.assign(mouvFiltre, { type: '', dateDebut: '', dateFin: '' })
  loadMouvements()
}

// #ENDREGION mouvements-state

// #REGION bon-commande

const bonCommandeItems = ref([])
const addToBonCommande = (piece) => {
  const existing = bonCommandeItems.value.find(l => l.pieceId === piece.id)
  if (existing) { existing.quantite++; }
  else { bonCommandeItems.value.push({ pieceId: piece.id, nom: piece.nom, reference: piece.reference, prixUnitaire: piece.prixUnitaire, quantite: 1 }); }
  activeTab.value = 'boncommande'
}

// #ENDREGION bon-commande

// #REGION modales

const showPieceModal      = ref(false)
const showFournisseurModal = ref(false)
const showMouvModal       = ref(false)
const editingPiece        = ref(null)
const editingFournisseur  = ref(null)
const pieceModalMode      = ref('create')
const mouvType            = ref('ENTREE')
const mouvPieceId         = ref(null)

const openCreatePiece = () => {
  editingPiece.value = null; pieceModalMode.value = 'create'; showPieceModal.value = true;
}
const openPieceDetail = (p) => {
  editingPiece.value = p; pieceModalMode.value = 'detail'; showPieceModal.value = true;
}
const openCreateFournisseur = () => {
  editingFournisseur.value = null; showFournisseurModal.value = true;
}
const openEditFournisseur = (f) => {
  editingFournisseur.value = f; showFournisseurModal.value = true;
}

const onPieceSaved = async () => {
  showPieceModal.value = false
  await fetchPieces()
  await store.fetchAlertes()
}

const onFournisseurSaved = async () => {
  showFournisseurModal.value = false
  await store.fetchFournisseurs()
  await fetchPieces()
}

const onMouvementSaved = async (mouvement) => {
  store.addMouvement(mouvement)
  showMouvModal.value = false
  mouvPieceId.value   = null
  await store.fetchAlertes()
}

const handleDeleteFournisseur = async (f) => {
  if (!confirm(`Supprimer le fournisseur "${f.nom}" ?`)) return
  const code = prompt('Code administrateur :')
  if (!code) return
  try {
    await stockApi.deleteFournisseur(f.id, code)
    await store.fetchFournisseurs()
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de la suppression.')
  }
}

// #ENDREGION modales

// #REGION helpers

const stockClass = (p) => {
  if (p.quantiteStock === 0)               return 'stock-zero'
  if (p.quantiteStock <= p.seuilAlerte)    return 'stock-alerte'
  if (p.quantiteStock <= p.seuilAlerte * 2) return 'stock-low'
  return 'stock-ok'
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

// #ENDREGION helpers

// #REGION init

onMounted(async () => {
  await Promise.all([
    fetchPieces(),
    store.fetchFournisseurs(),
    store.fetchAlertes(),
    loadMouvements(),
  ])
})

// #ENDREGION init
</script>

<style scoped>
/* MODULE: STOCK — StockView styles */
.stock-view { display: flex; flex-direction: column; height: calc(100vh - 60px); overflow: hidden; background: #0f1117; }

/* Topbar */
.stock-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid #2a2d38; background: #16181f;
  gap: 12px; flex-wrap: wrap; flex-shrink: 0;
}
.topbar-left  { display: flex; align-items: center; gap: 10px; }
.page-title   { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; display: flex; align-items: center; gap: 8px; }
.page-title i { color: #1d9e75; }
.topbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.global-alerte {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; padding: 3px 10px; border-radius: 20px;
  background: rgba(226,75,74,0.15); color: #f09595; border: 1px solid rgba(226,75,74,0.3);
}

/* Tabs */
.tabs-nav {
  display: flex; gap: 2px; padding: 0 20px;
  border-bottom: 1px solid #2a2d38; background: #16181f;
  overflow-x: auto; flex-shrink: 0;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent;
  color: #9ca3af; font-size: 13px; cursor: pointer; white-space: nowrap; position: relative;
}
.tab-btn i { font-size: 14px; }
.tab-btn:hover { color: #e8e8e8; }
.tab-btn.active { color: #1d9e75; border-bottom-color: #1d9e75; }
.tab-badge { font-size: 10px; padding: 1px 5px; border-radius: 10px; margin-left: 2px; }
.tab-badge.alerte { background: rgba(226,75,74,0.2); color: #f09595; }

.tab-content { flex: 1; overflow-y: auto; padding: 16px 20px; }

/* Filtres */
.filters-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; padding: 0 12px; flex: 1; min-width: 200px; }
.search-box i { color: #6b7280; }
.search-box input { background: none; border: none; outline: none; color: #e8e8e8; font-size: 13px; padding: 8px 0; width: 100%; }
.select-filter { background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; padding: 8px 10px; color: #c9cad1; font-size: 13px; outline: none; cursor: pointer; }
.select-filter option { background: #16181f; }
.input-date { background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; padding: 8px 10px; color: #c9cad1; font-size: 13px; outline: none; }
.filter-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; cursor: pointer; }
.text-danger { color: #f09595; }

/* Table stock */
.table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #2a2d38; }
.stock-table { width: 100%; border-collapse: collapse; background: #16181f; }
.stock-table thead tr { background: #0f1117; }
.stock-table th { padding: 9px 12px; font-size: 11px; font-weight: 500; color: #6b7280; text-align: left; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.stock-table td { padding: 9px 12px; font-size: 13px; color: #c9cad1; border-top: 1px solid #1e2030; vertical-align: middle; }
.stock-table tbody tr:hover td { background: #1a1d2a; }

.row-alerte { border-left: 3px solid #e24b4a; }
.row-entree { border-left: 3px solid #1d9e75; }
.row-sortie { border-left: 3px solid #e24b4a; }

.ref-cell { font-family: monospace; font-size: 12px; color: #9ca3af; white-space: nowrap; }
.piece-nom  { font-weight: 500; color: #e8e8e8; }
.piece-desc { font-size: 11px; color: #6b7280; margin-top: 2px; }
.text-muted { color: #6b7280 !important; }
.text-center { text-align: center; }
.table-center { text-align: center; padding: 2rem !important; color: #6b7280; }
.price-cell { font-size: 12px; white-space: nowrap; }
.qty-cell   { font-weight: 500; }
.date-cell  { font-size: 11px; color: #6b7280; white-space: nowrap; }

/* Valeur de stock */
.stock-val { font-weight: 600; }
.stock-zero   { color: #e24b4a; }
.stock-alerte { color: #f09595; }
.stock-low    { color: #EF9F27; }
.stock-ok     { color: #5DCAA5; }

.alerte-icon { color: #e24b4a; font-size: 13px; margin-left: 4px; }

/* Chips */
.fourn-chip   { font-size: 11px; padding: 2px 7px; border-radius: 4px; background: #1e2030; color: #9ca3af; border: 1px solid #2a2d38; }
.machines-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.machine-chip { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(29,158,117,0.12); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.25); white-space: nowrap; }
.machine-chip.more { background: #1e2030; color: #6b7280; border-color: #2a2d38; }

/* Badges mouvements */
.badge-entree { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(29,158,117,0.15); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.badge-sortie { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(226,75,74,0.15); color: #f09595; border: 1px solid rgba(226,75,74,0.3); }
.text-success { color: #5DCAA5; }

/* Actions */
.row-actions { display: flex; gap: 4px; }
.act-btn { background: none; border: 1px solid #2a2d38; border-radius: 6px; padding: 4px 7px; cursor: pointer; color: #9ca3af; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; }
.act-btn:hover { background: #1e2030; color: #e8e8e8; }
.act-btn.danger:hover { color: #f09595; border-color: rgba(226,75,74,0.3); }

/* Fournisseurs grid */
.fournisseurs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.fournisseur-card { background: #16181f; border: 1px solid #2a2d38; border-radius: 12px; overflow: hidden; }
.fourn-header { display: flex; align-items: center; gap: 12px; padding: 14px; border-bottom: 1px solid #2a2d38; }
.fourn-avatar { width: 40px; height: 40px; border-radius: 10px; background: rgba(29,158,117,0.2); color: #1d9e75; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.fourn-nom    { font-size: 14px; font-weight: 600; color: #e8e8e8; }
.fourn-count  { font-size: 11px; color: #6b7280; }
.fourn-body   { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.fourn-row    { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #9ca3af; }
.fourn-row i  { font-size: 13px; color: #6b7280; flex-shrink: 0; }
.fourn-delai  { color: #1d9e75; font-weight: 500; }
.fourn-conditions { font-size: 11px; color: #6b7280; font-style: italic; }
.fourn-footer { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 14px; border-top: 1px solid #2a2d38; }
.empty-grid { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 4rem; color: #6b7280; }
.empty-grid i { font-size: 36px; }

/* Pagination */
.pagination-info { text-align: center; font-size: 12px; color: #6b7280; padding: 12px; }

/* Boutons */
.btn-primary   { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn-primary:hover { background: #17836a; }
.btn-secondary { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; background: #1e2030; color: #c9cad1; border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.btn-secondary:hover { background: #252840; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .stock-topbar { flex-direction: column; align-items: flex-start; }
  .fournisseurs-grid { grid-template-columns: 1fr; }
}
</style>
