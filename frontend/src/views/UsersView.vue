<template>
  <!-- ====================================================
    MODULE: ADMIN — UsersView
    Gestion des utilisateurs : liste, création, édition,
    activation/désactivation, reset mot de passe.
    Accessible ADMIN uniquement.
  ==================================================== -->
  <div class="users-view">

    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <i class="ti ti-users" aria-hidden="true"></i>
          Gestion des utilisateurs
        </h1>
        <p class="page-sub">{{ users.length }} compte(s) enregistré(s)</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="ti ti-user-plus" aria-hidden="true"></i>
        Nouvel utilisateur
      </button>
    </div>

    <!-- Barre de filtres -->
    <div class="filters-bar">
      <div class="search-box">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input
          v-model="search"
          type="search"
          placeholder="Rechercher par nom ou e-mail…"
          aria-label="Rechercher un utilisateur"
        />
      </div>
      <div class="role-filters">
        <button
          v-for="r in roleFilters"
          :key="r.value"
          class="role-filter-btn"
          :class="{ active: roleFilter === r.value }"
          @click="roleFilter = r.value"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="users-table" aria-label="Liste des utilisateurs">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>E-mail</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="table-empty">
              <i class="ti ti-loader-2 spin" aria-hidden="true"></i> Chargement…
            </td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="6" class="table-empty">Aucun utilisateur trouvé.</td>
          </tr>
          <tr
            v-for="u in filteredUsers"
            :key="u.id"
            :class="{ 'row-inactive': !u.actif }"
          >
            <td>
              <div class="user-cell">
                <div class="avatar" :class="`avatar-${u.role.toLowerCase()}`">
                  {{ initials(u) }}
                </div>
                <span class="user-name">{{ u.prenom }} {{ u.nom }}</span>
              </div>
            </td>
            <td class="text-muted">{{ u.email }}</td>
            <td><span class="role-badge" :class="`role-${u.role.toLowerCase()}`">{{ roleLabel(u.role) }}</span></td>
            <td>
              <span class="status-badge" :class="u.actif ? 'status-active' : 'status-inactive'">
                {{ u.actif ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
            <td class="text-muted">{{ formatDate(u.createdAt) }}</td>
            <td>
              <div class="actions-cell">
                <button class="action-btn" title="Modifier" @click="openEdit(u)">
                  <i class="ti ti-edit" aria-hidden="true"></i>
                </button>
                <button class="action-btn" :title="u.actif ? 'Désactiver' : 'Activer'" @click="handleToggle(u)">
                  <i :class="u.actif ? 'ti ti-user-x' : 'ti ti-user-check'" aria-hidden="true"></i>
                </button>
                <button class="action-btn" title="Réinitialiser mot de passe" @click="openReset(u)">
                  <i class="ti ti-key" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== MODAL Créer / Modifier ===== -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal" role="dialog" :aria-label="editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'">
          <div class="modal-header">
            <h2>{{ editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}</h2>
            <button class="modal-close" @click="closeModal" aria-label="Fermer">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="field-group">
                <label>Prénom</label>
                <input v-model="form.prenom" type="text" placeholder="Jean" />
              </div>
              <div class="field-group">
                <label>Nom</label>
                <input v-model="form.nom" type="text" placeholder="MARTIN" />
              </div>
              <div class="field-group full-width">
                <label>Adresse e-mail</label>
                <input v-model="form.email" type="email" placeholder="jean.martin@lycee.fr" :disabled="!!editingUser" />
                <small v-if="editingUser" class="field-hint">L'e-mail ne peut pas être modifié.</small>
              </div>
              <div class="field-group">
                <label>Rôle</label>
                <select v-model="form.role">
                  <option value="ADMIN">Administrateur</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
              <div v-if="!editingUser" class="field-group">
                <label>Mot de passe initial</label>
                <input v-model="form.password" type="password" placeholder="Min. 8 caractères" autocomplete="new-password" />
              </div>
            </div>

            <p v-if="modalError" class="modal-error" role="alert">
              <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ modalError }}
            </p>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeModal" :disabled="saving">Annuler</button>
            <button class="btn-primary" @click="handleSave" :disabled="saving">
              <i class="ti ti-loader-2 spin" v-if="saving" aria-hidden="true"></i>
              {{ saving ? 'Enregistrement…' : (editingUser ? 'Mettre à jour' : 'Créer le compte') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== MODAL Reset mot de passe ===== -->
    <Teleport to="body">
      <div v-if="showReset" class="modal-overlay" @click.self="showReset = false">
        <div class="modal modal-sm" role="dialog" aria-label="Réinitialiser le mot de passe">
          <div class="modal-header">
            <h2>Réinitialiser le mot de passe</h2>
            <button class="modal-close" @click="showReset = false" aria-label="Fermer">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>
          <div class="modal-body">
            <p class="modal-info">
              Réinitialisation du mot de passe de
              <strong>{{ resetTarget?.prenom }} {{ resetTarget?.nom }}</strong>.
              Toutes ses sessions actives seront révoquées.
            </p>
            <div class="field-group">
              <label>Nouveau mot de passe</label>
              <input v-model="resetPassword" type="password" placeholder="Min. 8 caractères" autocomplete="new-password" />
            </div>
            <p v-if="resetError" class="modal-error" role="alert">
              <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ resetError }}
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showReset = false">Annuler</button>
            <button class="btn-danger" @click="handleReset" :disabled="saving">
              <i class="ti ti-key" aria-hidden="true"></i>
              {{ saving ? 'Enregistrement…' : 'Réinitialiser' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
// MODULE: ADMIN — UsersView script
import { ref, computed, onMounted, reactive } from 'vue'
import { api } from '@/api/api'

// #REGION state

const users      = ref([])
const loading    = ref(false)
const saving     = ref(false)
const search     = ref('')
const roleFilter = ref('ALL')

const showModal   = ref(false)
const editingUser = ref(null)
const modalError  = ref('')
const form = reactive({ prenom: '', nom: '', email: '', role: 'MAINTENANCE', password: '' })

const showReset   = ref(false)
const resetTarget = ref(null)
const resetPassword = ref('')
const resetError  = ref('')

const roleFilters = [
  { value: 'ALL',         label: 'Tous' },
  { value: 'ADMIN',       label: 'Administrateur' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PRODUCTION',  label: 'Production' },
]

// #ENDREGION state

// #REGION computed

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const matchRole   = roleFilter.value === 'ALL' || u.role === roleFilter.value
    const q           = search.value.toLowerCase()
    const matchSearch = !q ||
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    return matchRole && matchSearch
  })
})

// #ENDREGION computed

// #REGION helpers

const initials   = (u) => `${u.prenom[0]}${u.nom[0]}`.toUpperCase()
const roleLabel  = (r) => ({ ADMIN: 'Admin', MAINTENANCE: 'Maintenance', PRODUCTION: 'Production' }[r] || r)
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

// #ENDREGION helpers

// #REGION data-fetching

const fetchUsers = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/users')
    users.value = data
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

// #ENDREGION data-fetching

// #REGION modal-create-edit

const openCreate = () => {
  editingUser.value = null
  Object.assign(form, { prenom: '', nom: '', email: '', role: 'MAINTENANCE', password: '' })
  modalError.value = ''
  showModal.value  = true
}

const openEdit = (u) => {
  editingUser.value = u
  Object.assign(form, { prenom: u.prenom, nom: u.nom, email: u.email, role: u.role, password: '' })
  modalError.value = ''
  showModal.value  = true
}

const closeModal = () => { showModal.value = false }

const handleSave = async () => {
  modalError.value = ''
  if (!form.prenom || !form.nom || !form.email) {
    modalError.value = 'Prénom, nom et e-mail sont requis.'
    return
  }
  if (!editingUser.value && form.password.length < 8) {
    modalError.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }

  saving.value = true
  try {
    if (editingUser.value) {
      const { data } = await api.patch(`/admin/users/${editingUser.value.id}`, {
        prenom: form.prenom, nom: form.nom, role: form.role,
      })
      const idx = users.value.findIndex((u) => u.id === data.id)
      if (idx !== -1) users.value[idx] = data
    } else {
      const { data } = await api.post('/admin/users', form)
      users.value.unshift(data)
    }
    closeModal()
  } catch (err) {
    modalError.value = err.response?.data?.error || 'Une erreur est survenue.'
  } finally {
    saving.value = false
  }
}

// #ENDREGION modal-create-edit

// #REGION toggle-actif

const handleToggle = async (u) => {
  const action = u.actif ? 'désactiver' : 'activer'
  if (!confirm(`Voulez-vous ${action} le compte de ${u.prenom} ${u.nom} ?`)) return
  try {
    const { data } = await api.patch(`/admin/users/${u.id}/actif`)
    const idx = users.value.findIndex((x) => x.id === data.id)
    if (idx !== -1) users.value[idx] = data
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de la mise à jour.')
  }
}

// #ENDREGION toggle-actif

// #REGION reset-password

const openReset = (u) => {
  resetTarget.value   = u
  resetPassword.value = ''
  resetError.value    = ''
  showReset.value     = true
}

const handleReset = async () => {
  resetError.value = ''
  if (resetPassword.value.length < 8) {
    resetError.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  saving.value = true
  try {
    await api.patch(`/admin/users/${resetTarget.value.id}/reset-password`, {
      newPassword: resetPassword.value,
    })
    showReset.value = false
  } catch (err) {
    resetError.value = err.response?.data?.error || 'Erreur lors de la réinitialisation.'
  } finally {
    saving.value = false
  }
}

// #ENDREGION reset-password
</script>

<style scoped>
/* MODULE: ADMIN — UsersView styles */
.users-view { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;
}
.page-title { font-size: 20px; font-weight: 600; color: #e8e8e8; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; }
.page-title i { color: #1d9e75; }
.page-sub  { font-size: 13px; color: #6b7280; margin: 0; }

/* Filtres */
.filters-bar { display: flex; gap: 12px; margin-bottom: 1.25rem; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; background: #16181f; border: 1px solid #2a2d38; border-radius: 8px; padding: 0 12px; flex: 1; min-width: 200px; }
.search-box i { color: #6b7280; font-size: 15px; flex-shrink: 0; }
.search-box input { background: none; border: none; outline: none; color: #e8e8e8; font-size: 13px; padding: 9px 0; width: 100%; }
.role-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.role-filter-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #2a2d38; background: #16181f; color: #9ca3af; font-size: 12px; cursor: pointer; }
.role-filter-btn.active { background: #1d3d30; border-color: #1d9e75; color: #5DCAA5; }

/* Table */
.table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #2a2d38; }
.users-table { width: 100%; border-collapse: collapse; background: #16181f; }
.users-table thead tr { background: #0f1117; }
.users-table th { padding: 10px 14px; font-size: 11px; font-weight: 500; color: #6b7280; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.users-table td { padding: 11px 14px; font-size: 13px; color: #c9cad1; border-top: 1px solid #1e2030; vertical-align: middle; }
.users-table tbody tr:hover { background: #1a1d2a; }
.row-inactive td { opacity: 0.5; }
.table-empty { text-align: center; padding: 2.5rem !important; color: #6b7280; }

/* Cellule utilisateur */
.user-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.avatar-admin       { background: rgba(83,74,183,0.25); color: #AFA9EC; }
.avatar-maintenance { background: rgba(29,158,117,0.25); color: #5DCAA5; }
.avatar-production  { background: rgba(186,117,23,0.25); color: #EF9F27; }
.user-name { font-weight: 500; color: #e8e8e8; }
.text-muted { color: #6b7280; }

/* Badges */
.role-badge { font-size: 11px; padding: 2px 9px; border-radius: 20px; font-weight: 500; }
.role-admin       { background: rgba(83,74,183,0.2); color: #AFA9EC; border: 1px solid rgba(83,74,183,0.3); }
.role-maintenance { background: rgba(29,158,117,0.2); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.role-production  { background: rgba(186,117,23,0.2); color: #EF9F27; border: 1px solid rgba(186,117,23,0.3); }
.status-badge { font-size: 11px; padding: 2px 9px; border-radius: 20px; }
.status-active   { background: rgba(29,158,117,0.15); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.status-inactive { background: rgba(226,75,74,0.1);  color: #f09595; border: 1px solid rgba(226,75,74,0.3); }

/* Actions */
.actions-cell { display: flex; gap: 4px; }
.action-btn { background: none; border: 1px solid #2a2d38; border-radius: 6px; padding: 5px 8px; cursor: pointer; color: #9ca3af; font-size: 14px; transition: all 0.12s; }
.action-btn:hover { background: #1e2030; color: #e8e8e8; border-color: #3a3d50; }

/* Boutons */
.btn-primary   { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1d9e75; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #17836a; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1e2030; color: #c9cad1; border: 1px solid #2a2d38; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-secondary:hover { background: #252840; }
.btn-danger    { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: rgba(226,75,74,0.15); color: #f09595; border: 1px solid rgba(226,75,74,0.3); border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-danger:hover { background: rgba(226,75,74,0.25); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: #16181f; border: 1px solid #2a2d38; border-radius: 14px; width: 100%; max-width: 520px; }
.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2d38; }
.modal-header h2 { font-size: 16px; font-weight: 600; color: #e8e8e8; margin: 0; }
.modal-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px; padding: 2px; }
.modal-close:hover { color: #e8e8e8; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #2a2d38; display: flex; justify-content: flex-end; gap: 8px; }
.modal-error { display: flex; align-items: center; gap: 6px; color: #f09595; font-size: 13px; margin-top: 12px; }
.modal-info  { font-size: 13px; color: #9ca3af; margin: 0 0 16px; line-height: 1.6; }

/* Formulaire modal */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.full-width  { grid-column: 1 / -1; }
.field-group label { font-size: 11px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.field-group input, .field-group select { background: #0f1117; border: 1px solid #2a2d38; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #e8e8e8; outline: none; }
.field-group input:focus, .field-group select:focus { border-color: #1d9e75; }
.field-group input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-group select option { background: #16181f; }
.field-hint  { font-size: 11px; color: #6b7280; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: 1; }
}
</style>
