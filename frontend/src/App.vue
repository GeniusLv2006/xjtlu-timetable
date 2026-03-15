<template>
  <div id="layout">
    <header v-if="authStore.isLoggedIn" class="site-header">
      <div class="header-inner">
        <span class="brand">XJTLU<span class="brand-dot">·</span>课表</span>
        <nav class="nav-links">
          <router-link to="/">课表</router-link>
          <router-link to="/import">导入</router-link>
          <router-link to="/friends">好友</router-link>
          <router-link to="/settings">设置</router-link>
        </nav>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
</script>

<style scoped>
.site-header {
  background: #18181A;
  border-bottom: 1px solid #2C2C2E;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--sp-4);
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.brand {
  font-size: 14px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}
.brand-dot {
  color: #5A5850;
  font-weight: 400;
  margin: 0 1px;
}

.nav-links {
  display: flex;
  gap: 2px;
}
.nav-links a {
  color: #8A8680;
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 5px 11px;
  border-radius: 3px;
  transition: color 0.12s, background 0.12s;
  text-decoration: none;
}
.nav-links a:hover {
  color: #FFFFFF;
  background: #2A2A2C;
}
.nav-links a.router-link-active {
  color: #FFFFFF;
  background: #2A2A2C;
}

.main-content {
  flex: 1;
}
</style>
