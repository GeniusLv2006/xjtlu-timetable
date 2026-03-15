<template>
  <div id="layout">

    <!-- ── Sidebar (desktop) ──────────────────────────────────────────── -->
    <aside v-if="authStore.isLoggedIn" class="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <span class="brand-x">XJTLU</span><span class="brand-dot">·</span><span class="brand-cn">课表</span>
        </div>
        <nav class="sidebar-nav">
          <router-link to="/" class="nav-item">课表</router-link>
          <router-link to="/import" class="nav-item">导入</router-link>
          <router-link to="/friends" class="nav-item">好友</router-link>
          <router-link to="/settings" class="nav-item">设置</router-link>
        </nav>
      </div>
      <div class="sidebar-foot">
        <span class="foot-copy">© 2026 Tingkai Lyu · Built with Claude Code</span>
        <router-link to="/terms" class="foot-link">用户协议</router-link>
      </div>
    </aside>

    <!-- ── Main wrap ─────────────────────────────────────────────────── -->
    <div class="main-wrap" :class="{ 'has-sidebar': authStore.isLoggedIn }">

      <!-- Mobile header: only visible on small screens -->
      <header v-if="authStore.isLoggedIn" class="mobile-hd">
        <span class="mobile-brand">XJTLU · 课表</span>
        <nav class="mobile-nav">
          <router-link to="/">课表</router-link>
          <router-link to="/import">导入</router-link>
          <router-link to="/friends">好友</router-link>
          <router-link to="/settings">设置</router-link>
        </nav>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <KeepAlive include="Home">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </main>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────── */
#layout {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #18181A;
  border-right: 1px solid #272727;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-top {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 0 12px;
  overflow-y: auto;
}

.sidebar-brand {
  padding: 0 18px 26px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  user-select: none;
  white-space: nowrap;
}
.brand-x   { color: #FFFFFF; }
.brand-dot { color: #3C3830; font-weight: 300; margin: 0 1px; }
.brand-cn  { color: #FFFFFF; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 10px;
}

.nav-item {
  display: block;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.38);
  text-decoration: none;
  border-radius: 4px;
  border-left: 2px solid transparent;
  letter-spacing: 0.01em;
  transition: color 0.13s, background 0.13s, border-color 0.13s;
}
.nav-item:hover {
  color: rgba(255,255,255,0.78);
  background: rgba(255,255,255,0.05);
  text-decoration: none;
}
/* Exact-active: only the precisely matching route is highlighted */
.nav-item.router-link-exact-active {
  color: #FFFFFF;
  background: rgba(255,255,255,0.07);
  border-left-color: rgba(255,255,255,0.42);
}

.sidebar-foot {
  flex-shrink: 0;
  padding: 14px 18px;
  border-top: 1px solid #272727;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.foot-copy {
  font-size: 10px;
  color: rgba(255,255,255,0.18);
  letter-spacing: 0.02em;
  line-height: 1.6;
}
.foot-link {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  text-decoration: none;
  transition: color 0.12s;
}
.foot-link:hover { color: rgba(255,255,255,0.5); text-decoration: none; }

/* ── Main wrap ────────────────────────────────────────────────────────── */
.main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.main-wrap.has-sidebar { margin-left: 220px; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Mobile header ────────────────────────────────────────────────────── */
.mobile-hd {
  display: none;
  background: #18181A;
  border-bottom: 1px solid #272727;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
}
.mobile-brand {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}
.mobile-nav {
  display: flex;
  gap: 1px;
}
.mobile-nav a {
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 8px;
  border-radius: 3px;
  text-decoration: none;
  transition: color 0.12s, background 0.12s;
}
.mobile-nav a:hover { color: #fff; background: rgba(255,255,255,0.07); text-decoration: none; }
.mobile-nav a.router-link-exact-active { color: #fff; }

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-wrap.has-sidebar { margin-left: 0; }
  .mobile-hd { display: flex; }
}
</style>
