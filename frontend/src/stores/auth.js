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
  const tempPwd = ref('')
  // isLoggedIn must depend on model (a Vue ref) so that computed() re-evaluates
  // after login. pb.authStore.isValid is a plain JS property — Vue cannot track it,
  // so computed(() => pb.authStore.isValid) would return a stale cached value.
  const isLoggedIn = computed(() => model.value !== null && pb.authStore.isValid && !pb.authStore.isAdmin)

  pb.authStore.onChange(() => {
    // Spread to create a new object reference so Vue detects the change
    model.value = pb.authStore.model ? { ...pb.authStore.model } : null
  })

  async function login(email, password) {
    // 先查询数据库中存储的原始大小写邮箱，再走标准 auth 流程
    let loginEmail = email
    try {
      const res = await pb.send('/api/custom/users/resolve-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
        requestKey: null,
      })
      if (res?.email) loginEmail = res.email
    } catch (_) {}

    await pb.collection('users').authWithPassword(loginEmail, password, { requestKey: null })
    if (pb.authStore.model?.must_change_pwd) {
      tempPwd.value = password
    }
    const redirect = router.currentRoute.value.query.redirect
    router.push(redirect && typeof redirect === 'string' && !redirect.startsWith('/login') ? redirect : '/')
  }

  async function register(email, password, passwordConfirm, inviteCode) {
    await pb.collection('users').create(
      { email, password, passwordConfirm, name: email.split('@')[0], invite_code: inviteCode },
      { requestKey: null }
    )
    await login(email, password)
  }

  function logout() {
    pb.authStore.clear()
    router.push('/login')
  }

  return { model, isLoggedIn, tempPwd, login, register, logout }
})
