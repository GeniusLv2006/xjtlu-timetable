import { computed, reactive, ref } from 'vue'
import adminPb from '../lib/adminPb'
import { syncTimetable } from '../utils/timetableSync'

export function useAdminUsers() {
  // ── Users ─────────────────────────────────────────────────────────────────
  const users        = ref([])
  const usersLoading = ref(false)
  const usersError   = ref('')
  const userSearch   = ref('')
  const banModal = ref(false)
  const banTarget = ref(null)
  const banRestrictedAllowed = ref(false)
  const banSaving = ref(false)
  const unblockEmail = ref('')
  const unblockLoading = ref(false)
  const unblockMessage = ref('')

  const filteredUsers = computed(() => {
    const q = userSearch.value.trim().toLowerCase()
    if (!q) return users.value
    return users.value.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.nickname?.toLowerCase().includes(q)
    )
  })

  async function loadUsers() {
    usersLoading.value = true
    usersError.value = ''
    try {
      users.value = await adminPb.collection('users').getFullList({
        sort: '-created',
        requestKey: null,
      })
    } catch (e) {
      usersError.value = e.message
    } finally {
      usersLoading.value = false
    }
  }

  // Inline name editing
  const editingName = reactive({})

  function startEditName(u) {
    editingName[u.id] = u.name || ''
  }
  function cancelEditName(id) {
    delete editingName[id]
  }
  async function saveName(u) {
    const newName = editingName[u.id]?.trim() ?? ''
    try {
      await adminPb.collection('users').update(u.id, { name: newName }, { requestKey: null })
      u.name = newName
      delete editingName[u.id]
    } catch (e) {
      usersError.value = e.message
    }
  }

  async function openBanDialog(u) {
    if (u.is_banned) {
      if (!confirm(`确定要恢复用户 ${u.email} 吗？`)) return
      try {
        await adminPb.collection('users').update(u.id, {
          is_banned: false,
          restricted_login_allowed: false,
        }, { requestKey: null })
        u.is_banned = false
        u.restricted_login_allowed = false
      } catch (e) {
        usersError.value = e.message
      }
      return
    }
    banTarget.value = u
    banRestrictedAllowed.value = false
    banModal.value = true
  }

  async function applyBan() {
    if (!banTarget.value) return
    banSaving.value = true
    try {
      await adminPb.collection('users').update(banTarget.value.id, {
        is_banned: true,
        restricted_login_allowed: banRestrictedAllowed.value,
      }, { requestKey: null })
      banTarget.value.is_banned = true
      banTarget.value.restricted_login_allowed = banRestrictedAllowed.value
      banModal.value = false
    } catch (e) {
      usersError.value = e.message
    } finally {
      banSaving.value = false
    }
  }

  async function removeRegistrationBlock() {
    unblockMessage.value = ''
    const email = unblockEmail.value.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      unblockMessage.value = '请输入有效的邮箱地址'
      return
    }
    unblockLoading.value = true
    try {
      const result = await adminPb.send('/api/admin/registration-block/remove', {
        method: 'POST',
        body: { email },
        requestKey: null,
      })
      unblockMessage.value = result.removed ? '已解除该邮箱的注册限制' : '未找到有效的注册限制记录'
      if (result.removed) unblockEmail.value = ''
    } catch (e) {
      unblockMessage.value = e.message
    } finally {
      unblockLoading.value = false
    }
  }

  async function deleteUser(u) {
    if (!confirm(`永久删除用户 ${u.email}？此操作不可撤回，该用户所有课表和好友数据也将一并删除。`)) return
    try {
      await adminPb.collection('users').delete(u.id, { requestKey: null })
      users.value = users.value.filter(x => x.id !== u.id)
    } catch (e) {
      usersError.value = e.message
    }
  }

  // ── Sync timetables modal ─────────────────────────────────────────────────
  const syncModal              = ref(false)
  const syncTargetUser         = ref(null)
  const syncTimetables         = ref([])
  const syncTimetablesLoading  = ref(false)

  async function openSyncTimetables(u) {
    syncTargetUser.value = u
    syncTimetables.value = []
    syncModal.value = true
    syncTimetablesLoading.value = true
    try {
      const tts = await adminPb.collection('timetables').getFullList({
        filter: `user = "${u.id}"`,
        sort: '-created',
        requestKey: null,
      })
      // 获取每个课表的课程数
      for (const tt of tts) {
        try {
          const res = await adminPb.collection('courses').getList(1, 1, {
            filter: `timetable = "${tt.id}"`,
            requestKey: null,
          })
          tt.courseCount = res.totalItems
        } catch { tt.courseCount = '?' }
        tt._syncing  = false
        tt._syncMsg  = ''
        tt._syncError = false
      }
      syncTimetables.value = tts
    } catch (e) {
      usersError.value = e.message
      syncModal.value = false
    } finally {
      syncTimetablesLoading.value = false
    }
  }

  async function adminSyncTimetable(tt) {
    tt._syncing  = true
    tt._syncMsg  = ''
    tt._syncError = false
    try {
      const { total, added, updated, removed } = await syncTimetable(adminPb, tt.id, tt.hash)
      const parts = []
      if (added   > 0) parts.push(`新增 ${added} 门`)
      if (updated > 0) parts.push(`更新 ${updated} 门`)
      if (removed > 0) parts.push(`删除 ${removed} 门`)
      tt._syncMsg = parts.length ? `${parts.join('，')}（共 ${total} 门）` : `无变更（共 ${total} 门）`
      // 刷新课程数和同步时间
      tt.courseCount = total - removed + added
      tt.last_synced = new Date().toISOString()
    } catch (e) {
      tt._syncError = true
      tt._syncMsg   = e.message || '同步失败'
    } finally {
      tt._syncing = false
    }
  }

  // Change email modal
  const changeEmailModal   = ref(false)
  const changeEmailLoading = ref(false)
  const changeEmailError   = ref('')
  const changeEmailValue   = ref('')
  const changeEmailTarget  = ref(null)

  function openChangeEmail(u) {
    changeEmailTarget.value = u
    changeEmailValue.value = u.email
    changeEmailError.value = ''
    changeEmailModal.value = true
  }

  async function doChangeEmail() {
    changeEmailError.value = ''
    const newEmail = changeEmailValue.value.trim()
    if (!newEmail || !newEmail.includes('@')) {
      changeEmailError.value = '请输入有效的邮箱地址'
      return
    }
    changeEmailLoading.value = true
    try {
      await adminPb.collection('users').update(
        changeEmailTarget.value.id,
        { email: newEmail, emailVisibility: false },
        { requestKey: null }
      )
      changeEmailTarget.value.email = newEmail
      changeEmailModal.value = false
    } catch (e) {
      changeEmailError.value = e.message
    } finally {
      changeEmailLoading.value = false
    }
  }

  // Reset password modal
  const resetPwdModal   = ref(false)
  const resetPwdLoading = ref(false)
  const resetPwdError   = ref('')
  const resetPwdValue   = ref('')
  const showResetPwd    = ref(false)
  const resetPwdTarget  = ref(null)

  function openResetPwd(u) {
    resetPwdTarget.value = u
    resetPwdValue.value = ''
    resetPwdError.value = ''
    showResetPwd.value = false
    resetPwdModal.value = true
  }

  async function doResetPwd() {
    resetPwdError.value = ''
    if (resetPwdValue.value.length < 8) {
      resetPwdError.value = '密码至少 8 位'
      return
    }
    resetPwdLoading.value = true
    try {
      await adminPb.collection('users').update(
        resetPwdTarget.value.id,
        { password: resetPwdValue.value, passwordConfirm: resetPwdValue.value, must_change_pwd: true },
        { requestKey: null }
      )
      resetPwdModal.value = false
    } catch (e) {
      resetPwdError.value = e.message
    } finally {
      resetPwdLoading.value = false
    }
  }

  // Create user modal
  const createUserModal   = ref(false)
  const createUserLoading = ref(false)
  const createUserError   = ref('')
  const showNewPwd        = ref(false)
  const newUser = reactive({ name: '', email: '', password: '' })

  function openCreateUser() {
    Object.assign(newUser, { name: '', email: '', password: '' })
    createUserError.value = ''
    showNewPwd.value = false
    createUserModal.value = true
  }

  async function createUser() {
    createUserError.value = ''
    if (!newUser.email || !newUser.password) {
      createUserError.value = '邮箱和密码不能为空'
      return
    }
    createUserLoading.value = true
    try {
      const record = await adminPb.collection('users').create({
        email:           newUser.email,
        name:            newUser.name,
        password:        newUser.password,
        passwordConfirm: newUser.password,
        emailVisibility: false,
        must_change_pwd: true,
      }, { requestKey: null })
      users.value.unshift(record)
      createUserModal.value = false
    } catch (e) {
      createUserError.value = e.message
    } finally {
      createUserLoading.value = false
    }
  }

  return {
    applyBan,
    adminSyncTimetable,
    banModal,
    banRestrictedAllowed,
    banSaving,
    banTarget,
    cancelEditName,
    changeEmailError,
    changeEmailLoading,
    changeEmailModal,
    changeEmailTarget,
    changeEmailValue,
    createUser,
    createUserError,
    createUserLoading,
    createUserModal,
    deleteUser,
    doChangeEmail,
    doResetPwd,
    editingName,
    filteredUsers,
    loadUsers,
    newUser,
    openChangeEmail,
    openBanDialog,
    openCreateUser,
    openResetPwd,
    openSyncTimetables,
    removeRegistrationBlock,
    resetPwdError,
    resetPwdLoading,
    resetPwdModal,
    resetPwdTarget,
    resetPwdValue,
    saveName,
    showNewPwd,
    showResetPwd,
    startEditName,
    syncModal,
    syncTargetUser,
    syncTimetables,
    syncTimetablesLoading,
    unblockEmail,
    unblockLoading,
    unblockMessage,
    userSearch,
    users,
    usersError,
    usersLoading,
  }
}
