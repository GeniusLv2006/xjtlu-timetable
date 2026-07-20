import { computed, ref } from 'vue'
import pb from '../lib/pocketbase'

export function useSettingsInvites(authStore) {
  const myInvites = ref([])
  const inviteLoaded = ref(false)
  const inviteCreating = ref(false)
  const inviteCreateError = ref('')

  const inviteSettings = computed(() => ({
    validity_days: authStore.model?.invite_validity_days || 0,
    max_uses: authStore.model?.invite_max_uses || 0,
  }))

  const inviteQuotaLeft = computed(() => {
    const quota = authStore.model?.invite_quota || 0
    const used = myInvites.value.length
    if (quota === 0) return `已创建 ${used} 个（不限上限）`
    return `${used} / ${quota} 个`
  })

  const inviteQuotaExhausted = computed(() => {
    const quota = authStore.model?.invite_quota || 0
    return quota > 0 && myInvites.value.length >= quota
  })

  async function loadMyInvites() {
    if (!authStore.model?.can_invite) return
    try {
      myInvites.value = await pb.collection('invite_codes').getFullList({
        sort: '-created',
        requestKey: null,
      })
    } catch {
      // The section remains usable even when the optional list cannot load.
    } finally {
      inviteLoaded.value = true
    }
  }

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
  }

  async function createMyInvite() {
    inviteCreateError.value = ''
    inviteCreating.value = true
    try {
      const record = await pb.collection('invite_codes').create(
        { code: randomCode() },
        { requestKey: null },
      )
      myInvites.value.unshift(record)
    } catch (error) {
      inviteCreateError.value = error.message || '生成失败，请重试'
    } finally {
      inviteCreating.value = false
    }
  }

  async function deleteMyInvite(invite) {
    if (!confirm(`删除邀请码「${invite.code}」？`)) return
    try {
      await pb.collection('invite_codes').delete(invite.id, { requestKey: null })
      myInvites.value = myInvites.value.filter(item => item.id !== invite.id)
    } catch (error) {
      inviteCreateError.value = error.message
    }
  }

  async function copyInvite(code) {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      prompt('复制邀请码：', code)
    }
  }

  return {
    copyInvite,
    createMyInvite,
    deleteMyInvite,
    inviteCreateError,
    inviteCreating,
    inviteLoaded,
    inviteQuotaExhausted,
    inviteQuotaLeft,
    inviteSettings,
    loadMyInvites,
    myInvites,
  }
}
