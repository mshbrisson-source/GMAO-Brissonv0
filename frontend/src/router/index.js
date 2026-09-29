// ============================================================
// MODULE: AUTH
// ROUTER: index.js
// Navigation Vue Router avec guards basés sur le rôle.
// Chaque route déclare un meta.roles pour contrôler l'accès.
// ============================================================

import { createRouter, createWebHistory } from 'vue-router'

// Lazy loading des vues actuellement disponibles dans le repository
const LoginView       = () => import('@/views/LoginView.vue')
const DashboardView   = () => import('@/views/DashboardView.vue')
const EquipementsView = () => import('@/views/EquipementsView.vue')
const MachineDetailView = () => import('@/views/MachineDetailView.vue')
const StockView       = () => import('@/views/StockView.vue')
const DocumentsView   = () => import('@/views/DocumentsView.vue')
const UsersView       = () => import('@/views/UsersView.vue')

// #REGION route-definitions

const routes = [
  // Publique
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true },
  },

  // Accessible à tous les rôles connectés
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: { roles: ['ADMIN', 'MAINTENANCE', 'PRODUCTION'] },
  },

  // ADMIN + MAINTENANCE
  {
    path: '/equipements',
    name: 'Equipements',
    component: EquipementsView,
    meta: { roles: ['ADMIN', 'MAINTENANCE'] },
  },
  {
    path: '/stock',
    name: 'Stock',
    component: StockView,
    meta: { roles: ['ADMIN', 'MAINTENANCE'] },
  },
  {
    path: '/documents',
    name: 'Documents',
    component: DocumentsView,
    meta: { roles: ['ADMIN', 'MAINTENANCE', 'PRODUCTION'] },
  },
  {
    path: '/machines/:id',
    name: 'MachineDetail',
    component: MachineDetailView,
    meta: { roles: ['ADMIN', 'MAINTENANCE'] },
  },

  // ADMIN uniquement
  {
    path: '/admin/users',
    name: 'Users',
    component: UsersView,
    meta: { roles: ['ADMIN'] },
  },

  // Fallback
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

// #ENDREGION route-definitions

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// #REGION navigation-guard

router.beforeEach(async (to) => {
  // Import dynamique pour éviter les dépendances circulaires
  const { useAuthStore } = await import('../stores/auth.store')
  const authStore = useAuthStore()

  // Route publique → toujours accessible
  if (to.meta.public) {
    // Si déjà connecté, rediriger vers le dashboard
    if (authStore.isAuthenticated) return { name: 'Dashboard' }
    return true
  }

  // Route protégée — vérifier l'authentification
  if (!authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Vérifier le rôle si la route a des restrictions
  if (to.meta.roles && !to.meta.roles.includes(authStore.role)) {
    // Rôle insuffisant → redirection vers dashboard avec message
    return { name: 'Dashboard', query: { forbidden: '1' } }
  }

  return true
})

// #ENDREGION navigation-guard

export default router
