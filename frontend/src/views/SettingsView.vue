<template>
  <div class="settings-page">
    <h2>用户设置</h2>
    <section>
      <h3>账号信息</h3>
      <p>邮箱：{{ authStore.model?.email }}</p>
    </section>
    <section>
      <h3>课表可见性</h3>
      <!-- TODO: visibility setting -->
      <p>可见性设置（待实现）</p>
    </section>
    <section>
      <h3>危险操作</h3>
      <button @click="authStore.logout">退出登录</button>
    </section>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
const authStore = useAuthStore()
</script>

<style scoped>
.settings-page {
  max-width: 480px;
  margin: 40px auto;
}
section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
</style>
