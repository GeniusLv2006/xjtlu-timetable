import { reactive, ref } from 'vue'
import adminPb from '../lib/adminPb'

export function useAdminInvites() {
  // ── Invite Codes ──────────────────────────────────────────────────────────
  const invites        = ref([])
  const invitesLoading = ref(false)
  const invitesError   = ref('')

  async function loadInvites() {
    invitesLoading.value = true
    invitesError.value = ''
    try {
      invites.value = await adminPb.collection('invite_codes').getFullList({
        sort: '-created',
        expand: 'created_by',
        requestKey: null,
      })
    } catch (e) {
      invitesError.value = e.message
    } finally {
      invitesLoading.value = false
    }
  }

  async function toggleInvite(inv) {
    try {
      await adminPb.collection('invite_codes').update(inv.id, { is_active: !inv.is_active }, { requestKey: null })
      inv.is_active = !inv.is_active
    } catch (e) {
      invitesError.value = e.message
    }
  }

  async function deleteInvite(inv) {
    if (!confirm(`删除邀请码「${inv.code}」？`)) return
    try {
      await adminPb.collection('invite_codes').delete(inv.id, { requestKey: null })
      invites.value = invites.value.filter(x => x.id !== inv.id)
    } catch (e) {
      invitesError.value = e.message
    }
  }

  async function copyInviteCode(code) {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      prompt('复制邀请码：', code)
    }
  }

  // Create invite modal
  const createInviteModal   = ref(false)
  const createInviteLoading = ref(false)
  const createInviteError   = ref('')
  const newInvite = reactive({ code: '', max_uses: 1, expires_at: '', note: '' })

  function openCreateInvite() {
    Object.assign(newInvite, { code: '', max_uses: 1, expires_at: '', note: '' })
    createInviteError.value = ''
    createInviteModal.value = true
  }

  async function createInvite() {
    createInviteError.value = ''
    createInviteLoading.value = true
    try {
      const payload = {
        max_uses:  newInvite.max_uses,
        note:      newInvite.note || '',
        uses:      0,
        is_active: true,
      }
      if (newInvite.code.trim()) payload.code = newInvite.code.trim().toUpperCase()
      if (newInvite.expires_at) payload.expires_at = newInvite.expires_at + ' 00:00:00.000Z'
      const record = await adminPb.collection('invite_codes').create(payload, { requestKey: null })
      invites.value.unshift(record)
      createInviteModal.value = false
    } catch (e) {
      createInviteError.value = e.message
    } finally {
      createInviteLoading.value = false
    }
  }

  // Invite permissions modal
  const invitePermsModal   = ref(false)
  const invitePermsLoading = ref(false)
  const invitePermsError   = ref('')
  const invitePermsTarget  = ref(null)
  const invitePerms = reactive({
    can_invite:          false,
    invite_quota:        0,
    invite_validity_days: 7,
    invite_max_uses:     1,
  })

  function openInvitePerms(u) {
    invitePermsTarget.value = u
    invitePermsError.value  = ''
    Object.assign(invitePerms, {
      can_invite:           u.can_invite           ?? false,
      invite_quota:         u.invite_quota          ?? 0,
      invite_validity_days: u.invite_validity_days  ?? 7,
      invite_max_uses:      u.invite_max_uses        ?? 1,
    })
    invitePermsModal.value = true
  }

  async function saveInvitePerms() {
    invitePermsError.value   = ''
    invitePermsLoading.value = true
    try {
      const updated = await adminPb.collection('users').update(
        invitePermsTarget.value.id,
        {
          can_invite:           invitePerms.can_invite,
          invite_quota:         invitePerms.invite_quota,
          invite_validity_days: invitePerms.invite_validity_days,
          invite_max_uses:      invitePerms.invite_max_uses,
        },
        { requestKey: null }
      )
      Object.assign(invitePermsTarget.value, updated)
      invitePermsModal.value = false
    } catch (e) {
      invitePermsError.value = e.message
    } finally {
      invitePermsLoading.value = false
    }
  }

  return {
    copyInviteCode,
    createInvite,
    createInviteError,
    createInviteLoading,
    createInviteModal,
    deleteInvite,
    invites,
    invitesError,
    invitesLoading,
    invitePerms,
    invitePermsError,
    invitePermsLoading,
    invitePermsModal,
    invitePermsTarget,
    loadInvites,
    newInvite,
    openCreateInvite,
    openInvitePerms,
    saveInvitePerms,
    toggleInvite,
  }
}
