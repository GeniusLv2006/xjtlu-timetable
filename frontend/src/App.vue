<template>
  <nav v-if="authStore.isLoggedIn">
    <router-link to="/">首页</router-link> |
    <router-link to="/import">导入课表</router-link> |
    <router-link to="/settings">设置</router-link> |
    <button @click="authStore.logout">退出</button>
  </nav>
  <router-view />
</template>

<script setup>
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
</script>
