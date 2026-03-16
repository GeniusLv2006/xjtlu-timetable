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
    meta: { public: true },
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
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('../views/TermsView.vue'),
    meta: { public: true },
  },
  {
    path: '/changelog',
    name: 'Changelog',
    component: () => import('../views/ChangelogView.vue'),
    meta: { public: true },
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: () => import('../views/ChangePasswordView.vue'),
    meta: { public: false },
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
  // Force password change if admin set must_change_pwd
  if (
    authStore.isLoggedIn &&
    authStore.model?.must_change_pwd &&
    to.name !== 'ChangePassword'
  ) {
    return { name: 'ChangePassword' }
  }
})

export default router
