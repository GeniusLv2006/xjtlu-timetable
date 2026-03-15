import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '../lib/pocketbase'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  const model = ref(pb.authStore.model)
  const isLoggedIn = computed(() => pb.authStore.isValid)

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
