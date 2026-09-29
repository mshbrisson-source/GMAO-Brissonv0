// ============================================================
// MODULE: AUTH
// STORE: auth.store (Pinia)
// Gestion du token JWT, du profil utilisateur et du rôle.
// Le refresh token est dans un cookie httpOnly — invisible ici.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api }           from '@/api/api'
import router            from '@/router'

export const useAuthStore = defineStore('auth', () => {

  // #REGION state

  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const user        = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  // #ENDREGION state

  // #REGION getters

  const isAuthenticated = computed(() => !!accessToken.value)
  const role            = computed(() => user.value?.role || null)
  const isAdmin         = computed(() => role.value === 'ADMIN')
  const isMaintenance   = computed(() => ['ADMIN', 'MAINTENANCE'].includes(role.value))
  const isProduction    = computed(() => role.value === 'PRODUCTION')
  const fullName        = computed(() => user.value ? `${user.value.prenom} ${user.value.nom}` : '')

  // #ENDREGION getters

  // #REGION actions

  const setAuth = (token, userData) => {
    accessToken.value = token
    user.value        = userData
    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const clearAuth = () => {
    accessToken.value = null
    user.value        = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setAuth(data.accessToken, data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Même si le serveur échoue, on nettoie localement
    } finally {
      clearAuth()
      router.push('/login')
    }
  }

  /**
   * Rafraîchit l'access token via le cookie httpOnly.
   * Appelé automatiquement par l'intercepteur axios (voir api.js).
   */
  const refreshToken = async () => {
    const { data } = await api.post('/auth/refresh')
    accessToken.value = data.accessToken
    localStorage.setItem('accessToken', data.accessToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
    return data.accessToken
  }

  /**
   * Recharge le profil depuis /auth/me.
   * Utile au démarrage de l'app si un token existe en localStorage.
   */
  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
    } catch {
      clearAuth()
    }
  }

  // Réhydrater l'en-tête axios au démarrage
  if (accessToken.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken.value}`
  }

  // #ENDREGION actions

  return {
    accessToken, user,
    isAuthenticated, role, isAdmin, isMaintenance, isProduction, fullName,
    login, logout, refreshToken, fetchMe, setAuth, clearAuth,
  }
})
