<template>
  <div class="login-wrap">
    <div class="login-card">

      <!-- Header -->
      <div class="login-header">
        <div class="login-logo">XJTLU</div>
        <div class="login-title">课表系统</div>
        <div class="login-sub">Xi'an Jiaotong-Liverpool University</div>
      </div>

      <!-- Form -->
      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="field-group">
          <label class="field-label">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            autocomplete="email"
            required
          />
        </div>

        <div class="field-group">
          <label class="field-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="isRegister" class="field-group">
          <label class="field-label">确认密码</label>
          <input
            v-model="passwordConfirm"
            type="password"
            class="field-input"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary login-submit" :disabled="loading" :class="{ 'btn-loading': loading }">
          <span v-if="loading" class="spinner-xs" />
          {{ loading ? (isRegister ? '创建中…' : '登录中…') : (isRegister ? '创建账号' : '登录') }}
        </button>
      </form>

      <!-- Toggle -->
      <div class="login-footer">
        <button class="toggle-btn" type="button" @click="toggle">
          {{ isRegister ? '已有账号？返回登录' : '还没有账号？注册' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const email           = ref('')
const password        = ref('')
const passwordConfirm = ref('')
const isRegister      = ref(false)
const error           = ref('')
const loading         = ref(false)

function toggle() {
  isRegister.value = !isRegister.value
  error.value = ''
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isRegister.value) {
      await authStore.register(email.value, password.value, passwordConfirm.value)
    } else {
      await authStore.login(email.value, password.value)
    }
  } catch (e) {
    error.value = e.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: var(--sp-4);
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

/* Header block */
.login-header {
  background: #18181A;
  padding: var(--sp-8) var(--sp-6) var(--sp-6);
  text-align: center;
}
.login-logo {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #5A5850;
  margin-bottom: var(--sp-2);
}
.login-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.02em;
  margin-bottom: var(--sp-1);
}
.login-sub {
  font-size: var(--text-xs);
  color: #4A4840;
  letter-spacing: 0.04em;
}

/* Form */
.login-form {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
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
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.login-error {
  font-size: var(--text-sm);
  color: var(--red);
  padding: 8px 10px;
  background: var(--red-bg);
  border: 1px solid #E5B4AF;
  border-radius: 3px;
}

.login-submit {
  width: 100%;
  justify-content: center;
  padding: 9px;
  font-size: var(--text-base);
  margin-top: var(--sp-1);
  display: flex;
  align-items: center;
  gap: 7px;
}
.btn-loading { cursor: wait; }
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
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer toggle */
.login-footer {
  padding: var(--sp-4) var(--sp-6);
  border-top: 1px solid var(--border);
  text-align: center;
}
.toggle-btn {
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-3);
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}
.toggle-btn:hover { color: var(--accent); }
</style>
