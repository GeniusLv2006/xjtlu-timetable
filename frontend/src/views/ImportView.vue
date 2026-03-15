<template>
  <div class="import-page">
    <h2>导入课表</h2>
    <form @submit.prevent="handleImport">
      <label for="hash">TimetablePlus HASH</label>
      <input id="hash" v-model="hash" type="text" placeholder="粘贴你的 HASH..." required />
      <button type="submit" :disabled="loading">
        {{ loading ? '导入中...' : '导入' }}
      </button>
      <p v-if="message">{{ message }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const hash = ref('')
const loading = ref(false)
const message = ref('')

async function handleImport() {
  loading.value = true
  message.value = ''
  // TODO: call import API
  await new Promise((r) => setTimeout(r, 800))
  message.value = '导入功能待实现'
  loading.value = false
}
</script>

<style scoped>
.import-page {
  max-width: 480px;
  margin: 40px auto;
}
form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
</style>
