<template>
  <div class="force-change-wrap">
    <div class="force-change-card">

      <div class="card-header">
        <div class="header-badge">首次登录</div>
        <h1 class="header-title">请修改初始密码</h1>
        <p class="header-sub">管理员已为你设置了初始密码，出于账号安全，请立即更改为你自己的密码后再继续使用。</p>
      </div>

      <form class="card-form" @submit.prevent="handleSubmit">
        <div class="field-group">
          <label class="field-label">当前密码（初始密码）</label>
          <div class="pwd-wrap">
            <input
              v-model="oldPwd"
              :type="showOld ? 'text' : 'password'"
              class="field-input"
              autocomplete="current-password"
              required
            />
            <button type="button" class="pwd-toggle" @click="showOld = !showOld">
              {{ showOld ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">新密码</label>
          <div class="pwd-wrap">
            <input
              v-model="newPwd"
              :type="showNew ? 'text' : 'password'"
              class="field-input"
              autocomplete="new-password"
              required
            />
            <button type="button" class="pwd-toggle" @click="showNew = !showNew">
              {{ showNew ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">确认新密码</label>
          <div class="pwd-wrap">
            <input
              v-model="newPwdConfirm"
              :type="showConfirm ? 'text' : 'password'"
              class="field-input"
              autocomplete="new-password"
              required
            />
            <button type="button" class="pwd-toggle" @click="showConfirm = !showConfirm">
              {{ showConfirm ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner-xs" />
          {{ loading ? '保存中…' : '保存新密码并继续' }}
        </button>
      </form>

      <div class="card-footer">
        <button class="logout-btn" type="button" @click="authStore.logout">
          退出登录
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import pb from '../lib/pocketbase'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router    = useRouter()

const oldPwd       = ref('')
const newPwd       = ref('')
const newPwdConfirm = ref('')
const showOld      = ref(false)
const showNew      = ref(false)
const showConfirm  = ref(false)
const loading      = ref(false)
const error        = ref('')

async function handleSubmit() {
  error.value = ''
  if (!oldPwd.value || !newPwd.value || !newPwdConfirm.value) {
    error.value = '请填写所有字段'
    return
  }
  if (newPwd.value !== newPwdConfirm.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  if (newPwd.value.length < 8) {
    error.value = '新密码至少 8 位'
    return
  }
  if (newPwd.value === oldPwd.value) {
    error.value = '新密码不能与当前密码相同'
    return
  }

  loading.value = true
  try {
    const userId = authStore.model.id
    await pb.collection('users').update(
      userId,
      {
        oldPassword:     oldPwd.value,
        password:        newPwd.value,
        passwordConfirm: newPwdConfirm.value,
        must_change_pwd: false,
      },
      { requestKey: null }
    )
    // Re-authenticate with new password so token stays valid
    await pb.collection('users').authWithPassword(authStore.model.email, newPwd.value)
    router.push('/')
  } catch (e) {
    error.value = e.message || '密码修改失败，请确认当前密码是否正确'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.force-change-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: var(--sp-4);
}

.force-change-card {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

/* Header */
.card-header {
  background: #18181A;
  padding: var(--sp-6) var(--sp-6) var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.header-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #fff;
  background: var(--amber);
  border-radius: 2px;
  padding: 2px 7px;
  align-self: flex-start;
}
.header-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.01em;
  margin: 0;
}
.header-sub {
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.45);
  line-height: 1.65;
  margin: 0;
}

/* Form */
.card-form {
  padding: var(--sp-5) var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pwd-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.pwd-wrap .field-input {
  flex: 1;
  padding-right: 52px;
}
.pwd-toggle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  padding: 0 10px;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.12s;
}
.pwd-toggle:hover { color: var(--accent); }

.form-error {
  font-size: var(--text-sm);
  color: var(--red);
  padding: 8px 10px;
  background: var(--red-bg);
  border: 1px solid #E5B4AF;
  border-radius: 3px;
  margin: 0;
}

.submit-btn {
  width: 100%;
  justify-content: center;
  padding: 9px;
  font-size: var(--text-base);
  display: flex;
  align-items: center;
  gap: 7px;
}
.spinner-xs {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
.card-footer {
  padding: var(--sp-3) var(--sp-6);
  text-align: center;
}
.logout-btn {
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-3);
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}
.logout-btn:hover { color: var(--red); }
</style>
