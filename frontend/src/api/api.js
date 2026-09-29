// ============================================================
// MODULE: AUTH
// SERVICE: api.js
// Instance axios configurée avec :
//   - Baseurl vers l'API backend
//   - Intercepteur de réponse : refresh JWT automatique sur 401
//   - File d'attente des requêtes pendant le refresh
// ============================================================

import axios from 'axios'

export const api = axios.create({
  baseURL:        import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // nécessaire pour envoyer le cookie refreshToken
  timeout:         15_000,
})

// #REGION refresh-interceptor

let isRefreshing      = false
let refreshSubscribers = []

/** Rejoue les requêtes en file une fois le token rafraîchi. */
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

/** Met une requête en file pendant que le refresh est en cours. */
const addSubscriber = (callback) => {
  refreshSubscribers.push(callback)
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    // 401 sur /auth/refresh → session vraiment expirée → redirect login
    if (error.response?.status === 401 && originalRequest.url?.includes('/auth/refresh')) {
      // Import dynamique pour éviter la dépendance circulaire store ↔ api
      const { useAuthStore } = await import('@/stores/auth.store')
      const authStore = useAuthStore()
      authStore.clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // 401 sur une autre route → essayer de rafraîchir le token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        // Mettre en file : attendre que le refresh en cours se termine
        return new Promise((resolve) => {
          addSubscriber((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const { useAuthStore } = await import('@/stores/auth.store')
        const authStore = useAuthStore()
        const newToken  = await authStore.refreshToken()

        onTokenRefreshed(newToken)
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        const { useAuthStore } = await import('@/stores/auth.store')
        const authStore = useAuthStore()
        authStore.clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// #ENDREGION refresh-interceptor

// Méthode utilitaire pour les appels admin nécessitant un code de confirmation
export const apiWithConfirmCode = (code) =>
  axios.create({
    ...api.defaults,
    headers: {
      ...api.defaults.headers.common,
      'X-Admin-Code': code,
    },
  })
