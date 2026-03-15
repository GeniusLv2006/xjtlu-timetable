import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '../lib/pocketbase'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  // If the stored token is an admin token (e.g. leftover from a previous bug where
  // adminPb shared the same localStorage key), clear it — it's not a user session.
  if (pb.authStore.isAdmin) {
    pb.authStore.clear()
  }

  const model = ref(pb.authStore.model)
  // isLoggedIn must depend on model (a Vue ref) so that computed() re-evaluates
  // after login. pb.authStore.isValid is a plain JS property — Vue cannot track it,
  // so computed(() => pb.authStore.isValid) would return a stale cached value.
  const isLoggedIn = computed(() => model.value !== null && pb.authStore.isValid && !pb.authStore.isAdmin)

  pb.authStore.onChange(() => {
    model.value = pb.authStore.model
  })

  async function login(email, password) {
    await pb.collection('users').authWithPassword(email, password, { requestKey: null })
    router.push('/')
  }

  async function register(email, password, passwordConfirm) {
    await pb.collection('users').create({ email, password, passwordConfirm }, { requestKey: null })
    await login(email, password)
  }

  function logout() {
    pb.authStore.clear()
    router.push('/login')
  }

  return { model, isLoggedIn, login, register, logout }
})
