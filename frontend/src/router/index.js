import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue'),
    meta: { public: true }, // has its own auth wall
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../views/ImportView.vue'),
  },
  {
    path: '/compare/:userId',
    name: 'Compare',
    component: () => import('../views/CompareView.vue'),
  },
  {
    path: '/friends',
    name: 'Friends',
    component: () => import('../views/FriendsView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (!to.meta.public && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }
})

export default router
