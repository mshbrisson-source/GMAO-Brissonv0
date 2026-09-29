<template>
  <!-- ====================================================
    MODULE: AUTH — LoginView
    Page de connexion responsive, design sobre/industriel.
    Compatible PC, tablette et smartphone Android.
  ==================================================== -->
  <div class="login-wrapper">

    <div class="login-card">
      <!-- En-tête -->
      <div class="login-header">
        <div class="logo-block">
          <i class="ti ti-tool logo-icon" aria-hidden="true"></i>
        </div>
        <h1 class="app-title">GMAO</h1>
        <p class="app-subtitle">Gestion de maintenance</p>
      </div>

      <!-- Formulaire -->
      <form class="login-form" @submit.prevent="handleLogin" novalidate>

        <div class="field-group">
          <label for="email" class="field-label">Adresse e-mail</label>
          <div class="input-wrapper" :class="{ 'input-error': errors.email }">
            <i class="ti ti-mail input-icon" aria-hidden="true"></i>
            <input
              id="email"
              v-model.trim="form.email"
              type="email"
              autocomplete="email"
              placeholder="prenom.nom@etablissement.fr"
              :disabled="loading"
              @input="clearError('email')"
            />
          </div>
          <p v-if="errors.email" class="field-error" role="alert">{{ errors.email }}</p>
        </div>

        <div class="field-group">
          <label for="password" class="field-label">Mot de passe</label>
          <div class="input-wrapper" :class="{ 'input-error': errors.password }">
            <i class="ti ti-lock input-icon" aria-hidden="true"></i>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              :disabled="loading"
              @input="clearError('password')"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Masquer' : 'Afficher le mot de passe'"
            >
              <i :class="showPassword ? 'ti ti-eye-off' : 'ti ti-eye'" aria-hidden="true"></i>
            </button>
          </div>
          <p v-if="errors.password" class="field-error" role="alert">{{ errors.password }}</p>
        </div>

        <!-- Erreur globale (mauvais identifiants) -->
        <div v-if="globalError" class="alert-error" role="alert">
          <i class="ti ti-alert-circle" aria-hidden="true"></i>
          {{ globalError }}
        </div>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="!loading">
            <i class="ti ti-login" aria-hidden="true"></i>
            Se connecter
          </span>
          <span v-else class="loading-dots">
            <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
            Connexion…
          </span>
        </button>

      </form>

      <!-- Badges rôles — aide visuelle pour l'équipe -->
      <div class="roles-hint">
        <span class="role-badge admin">Administrateur</span>
        <span class="role-badge maintenance">Maintenance</span>
        <span class="role-badge production">Production</span>
      </div>
    </div>

    <!-- Version -->
    <p class="version-tag">GMAO v1.0 — {{ currentYear }}</p>
  </div>
</template>

<script setup>
// MODULE: AUTH — LoginView script
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

// #REGION state

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const globalError  = ref('')
const loading      = ref(false)
const showPassword = ref(false)
const currentYear  = new Date().getFullYear()

// #ENDREGION state

// #REGION validation

const validate = () => {
  let valid = true
  errors.email    = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'L\'adresse e-mail est requise.'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format d\'e-mail invalide.'
    valid = false
  }

  if (!form.password) {
    errors.password = 'Le mot de passe est requis.'
    valid = false
  }

  return valid
}

const clearError = (field) => {
  errors[field]  = ''
  globalError.value = ''
}

// #ENDREGION validation

// #REGION submit

const handleLogin = async () => {
  if (!validate()) return

  loading.value      = true
  globalError.value  = ''

  try {
    const user = await authStore.login(form.email, form.password)
    // Redirection : vers la page demandée, ou le dashboard
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (err) {
    globalError.value = err.response?.data?.error || 'Connexion impossible. Vérifiez vos identifiants.'
    form.password = '' // Vider le mot de passe par sécurité
  } finally {
    loading.value = false
  }
}

// #ENDREGION submit
</script>

<style scoped>
/* ====================================================
   MODULE: AUTH — LoginView styles
   Design : industriel, sobre, optimisé tablette atelier
==================================================== */

.login-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: #0f1117;
  background-image:
    repeating-linear-gradient(0deg,   transparent, transparent 39px, #1a1d26 39px, #1a1d26 40px),
    repeating-linear-gradient(90deg,  transparent, transparent 39px, #1a1d26 39px, #1a1d26 40px);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #16181f;
  border: 1px solid #2a2d38;
  border-radius: 16px;
  padding: 2.5rem 2rem;
}

/* En-tête */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-block {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #1d9e75;
  margin-bottom: 1rem;
}

.logo-icon {
  font-size: 28px;
  color: #fff;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: #e8e8e8;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
}

.app-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Champs */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #0f1117;
  border: 1px solid #2a2d38;
  border-radius: 10px;
  transition: border-color 0.15s;
}

.input-wrapper:focus-within {
  border-color: #1d9e75;
}

.input-wrapper.input-error {
  border-color: #e24b4a;
}

.input-icon {
  font-size: 16px;
  color: #6b7280;
  padding: 0 0 0 14px;
  flex-shrink: 0;
}

.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 13px 12px;
  font-size: 14px;
  color: #e8e8e8;
  width: 100%;
}

.input-wrapper input::placeholder {
  color: #3d4151;
}

.input-wrapper input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-password {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 12px;
  color: #6b7280;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.toggle-password:hover { color: #9ca3af; }

.field-error {
  font-size: 12px;
  color: #f09595;
  margin: 0;
}

/* Alerte globale */
.alert-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(226, 75, 74, 0.1);
  border: 1px solid rgba(226, 75, 74, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: #f09595;
}

.alert-error i { font-size: 16px; flex-shrink: 0; }

/* Bouton connexion */
.btn-login {
  margin-top: 0.5rem;
  width: 100%;
  padding: 14px;
  background: #1d9e75;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px; /* zone tactile suffisante pour tablette */
}

.btn-login:hover:not(:disabled) { background: #17836a; }
.btn-login:active:not(:disabled) { transform: scale(0.98); }
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-login i { font-size: 18px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }

/* Badges rôles */
.roles-hint {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 1.75rem;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.role-badge.admin       { background: rgba(83, 74, 183, 0.2); color: #AFA9EC; border: 1px solid rgba(83,74,183,0.3); }
.role-badge.maintenance { background: rgba(29, 158, 117, 0.2); color: #5DCAA5; border: 1px solid rgba(29,158,117,0.3); }
.role-badge.production  { background: rgba(186, 117, 23, 0.2); color: #EF9F27; border: 1px solid rgba(186,117,23,0.3); }

/* Version */
.version-tag {
  margin-top: 1.5rem;
  font-size: 11px;
  color: #3d4151;
}

/* Responsive tablette / smartphone */
@media (max-width: 480px) {
  .login-card { padding: 2rem 1.25rem; }
  .btn-login  { font-size: 16px; padding: 15px; }
}
</style>
