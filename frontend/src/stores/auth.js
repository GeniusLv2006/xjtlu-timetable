import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '../lib/pocketbase'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  // If the stored token belongs to _superusers (leftover from a previous bug where
  // adminPb shared the same localStorage key), clear it — it's not a user session.
  if (pb.authStore.isValid && pb.authStore.model?.collectionName === '_superusers') {
    pb.authStore.clear()
  }

  const model = ref(pb.authStore.model)
  const tempPwd = ref('')
  // isLoggedIn must depend on model (a Vue ref) so that computed() re-evaluates
  // after login. pb.authStore.isValid is a plain JS property — Vue cannot track it,
  // so computed(() => pb.authStore.isValid) would return a stale cached value.
  const isLoggedIn = computed(() => model.value !== null && pb.authStore.isValid && pb.authStore.model?.collectionName !== '_superusers')
  const isRestricted = computed(() => (
    isLoggedIn.value &&
    model.value?.is_banned === true &&
    model.value?.restricted_login_allowed === true
  ))

  pb.authStore.onChange(() => {
    // Spread to create a new object reference so Vue detects the change
    model.value = pb.authStore.model ? { ...pb.authStore.model } : null
  })

  async function login(email, password) {
    const loginEmail = email.trim().toLowerCase()
    await pb.collection('users').authWithPassword(loginEmail, password, { requestKey: null })
    if (pb.authStore.model?.must_change_pwd) {
      tempPwd.value = password
    }
    const redirect = router.currentRoute.value.query.redirect
    router.push(redirect && typeof redirect === 'string' && !redirect.startsWith('/login') ? redirect : '/')
  }

  async function register(email, password, passwordConfirm, inviteCode, legalConfirmation = {}) {
    const normalizedEmail = email.trim().toLowerCase()
    await pb.collection('users').create(
      {
        email: normalizedEmail,
        password,
        passwordConfirm,
        name: normalizedEmail.split('@')[0],
        invite_code: inviteCode,
        legal_notice_version: legalConfirmation.legal_notice_version || '',
        legal_notice_accepted: legalConfirmation.legal_notice_accepted === true,
        minimum_age: legalConfirmation.minimum_age || 0,
        minimum_age_confirmed: legalConfirmation.minimum_age_confirmed === true,
      },
      { requestKey: null }
    )
    await login(email, password)
  }

  function logout() {
    pb.authStore.clear()
    router.push('/login')
  }

  return { model, isLoggedIn, isRestricted, tempPwd, login, register, logout }
})
