<template>
  <div class="login-page">
    <h1>XJTLU Timetable</h1>
    <form @submit.prevent="handleSubmit">
      <input v-model="email" type="email" placeholder="邮箱" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <input
        v-if="isRegister"
        v-model="passwordConfirm"
        type="password"
        placeholder="确认密码"
        required
      />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit">{{ isRegister ? '注册' : '登录' }}</button>
      <button type="button" @click="isRegister = !isRegister">
        {{ isRegister ? '已有账号？登录' : '没有账号？注册' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const isRegister = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    if (isRegister.value) {
      await authStore.register(email.value, password.value, passwordConfirm.value)
    } else {
      await authStore.login(email.value, password.value)
    }
  } catch (e) {
    error.value = e.message || '操作失败，请重试'
  }
}
</script>

<style scoped>
.login-page {
  max-width: 360px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.error {
  color: red;
  font-size: 0.875rem;
}
</style>
