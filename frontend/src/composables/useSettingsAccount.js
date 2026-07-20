import { ref } from 'vue'
import pb from '../lib/pocketbase'

export function useSettingsAccount(authStore) {
  const editingNickname = ref(false)
  const nicknameInput = ref('')
  const nicknameSaving = ref(false)
  const nicknameError = ref('')
  const friendCodeCopied = ref(false)
  const oldPwd = ref('')
  const newPwd = ref('')
  const newPwdConfirm = ref('')
  const pwdLoading = ref(false)
  const pwdError = ref('')
  const pwdSuccess = ref('')
  const showOldPwd = ref(false)
  const showNewPwd = ref(false)
  const showNewPwdConfirm = ref(false)

  function startNickname() {
    nicknameInput.value = authStore.model?.nickname || ''
    editingNickname.value = true
    nicknameError.value = ''
  }

  function cancelNickname() {
    editingNickname.value = false
    nicknameError.value = ''
  }

  async function saveNickname() {
    nicknameSaving.value = true
    nicknameError.value = ''
    const value = nicknameInput.value.trim()
    try {
      await pb.collection('users').update(
        authStore.model.id,
        { nickname: value },
        { requestKey: null },
      )
      pb.authStore.save(pb.authStore.token, { ...pb.authStore.model, nickname: value })
      editingNickname.value = false
    } catch (error) {
      nicknameError.value = error.message
    } finally {
      nicknameSaving.value = false
    }
  }

  async function copyFriendCode() {
    try {
      await navigator.clipboard.writeText(authStore.model?.id ?? '')
      friendCodeCopied.value = true
      setTimeout(() => { friendCodeCopied.value = false }, 2000)
    } catch {
      prompt('请手动复制好友码：', authStore.model?.id ?? '')
    }
  }

  async function changePassword() {
    pwdError.value = ''
    pwdSuccess.value = ''
    if (!oldPwd.value || !newPwd.value) {
      pwdError.value = '请填写所有密码字段'
      return
    }
    if (newPwd.value !== newPwdConfirm.value) {
      pwdError.value = '两次输入的新密码不一致'
      return
    }
    if (newPwd.value.length < 8) {
      pwdError.value = '新密码至少 8 位'
      return
    }
    pwdLoading.value = true
    try {
      const email = authStore.model.email
      await pb.collection('users').update(
        authStore.model.id,
        {
          oldPassword: oldPwd.value,
          password: newPwd.value,
          passwordConfirm: newPwdConfirm.value,
          must_change_pwd: false,
        },
        { requestKey: null },
      )
      await pb.collection('users').authWithPassword(email, newPwd.value, { requestKey: null })
      pwdSuccess.value = '密码已更新 ✓'
      oldPwd.value = ''
      newPwd.value = ''
      newPwdConfirm.value = ''
      setTimeout(() => { pwdSuccess.value = '' }, 3000)
    } catch (error) {
      pwdError.value = error.message
    } finally {
      pwdLoading.value = false
    }
  }

  return {
    cancelNickname,
    changePassword,
    copyFriendCode,
    editingNickname,
    friendCodeCopied,
    newPwd,
    newPwdConfirm,
    nicknameError,
    nicknameInput,
    nicknameSaving,
    oldPwd,
    pwdError,
    pwdLoading,
    pwdSuccess,
    saveNickname,
    showNewPwd,
    showNewPwdConfirm,
    showOldPwd,
    startNickname,
  }
}
