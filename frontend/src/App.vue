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

      <!-- Site notice banner -->
      <div v-if="siteNotice && !noticeDismissed" class="notice-banner">
        <span>{{ siteNotice }}</span>
        <button class="notice-close" @click="noticeDismissed = true">×</button>
      </div>

      <!-- Changelog banner -->
      <div v-if="changelogEntry && !changelogDismissed" class="changelog-banner">
        <span>
          <strong>{{ changelogEntry.version }}</strong> 已发布 &nbsp;·&nbsp; {{ changelogEntry.title }}
        </span>
        <div class="changelog-banner-right">
          <router-link to="/changelog" class="changelog-link" @click="dismissChangelog">查看详情</router-link>
          <button class="notice-close" @click="dismissChangelog">×</button>
        </div>
      </div>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <KeepAlive include="Home">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </main>

      <footer v-if="authStore.isLoggedIn" class="site-footer">
        <span class="foot-copy">© 2026 Tingkai Lyu · All rights reserved · Built with Claude Code</span>
        <div class="foot-links">
          <router-link to="/changelog" class="foot-link">更新日志</router-link>
          <router-link to="/terms" class="foot-link">用户协议</router-link>
        </div>
      </footer>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import pb from './lib/pocketbase'

const authStore = useAuthStore()
const router = useRouter()
const route  = useRoute()
const siteNotice      = ref('')
const noticeDismissed = ref(false)
const changelogEntry    = ref(null)
const changelogDismissed = ref(false)

// Validate the session against the server.
// If the user was deleted (401) or suspended (400), clear local auth and redirect to login.
async function validateSession() {
  if (!pb.authStore.isValid) return
  try {
    await pb.collection('users').authRefresh({ requestKey: null })
  } catch {
    pb.authStore.clear()
    router.push('/login')
  }
}

// Re-validate when the tab becomes visible (catches delete/ban while tab was in background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authStore.isLoggedIn) {
    validateSession()
  }
})

async function fetchNotice() {
  try {
    const list = await pb.collection('site_config').getList(1, 1, { requestKey: null })
    if (list.items.length) siteNotice.value = list.items[0].site_notice || ''
  } catch { /* ignore — collection may not exist yet */ }
}

async function fetchChangelog() {
  try {
    const list = await pb.collection('changelogs').getList(1, 1, {
      sort: '-published_at',
      requestKey: null,
    })
    if (!list.items.length) return
    const latest = list.items[0]
    const seen = localStorage.getItem('xjtlu_last_changelog_seen')
    if (!seen || latest.published_at > seen) {
      changelogEntry.value = latest
    }
  } catch { /* ignore */ }
}

function dismissChangelog() {
  if (changelogEntry.value) {
    localStorage.setItem('xjtlu_last_changelog_seen', changelogEntry.value.published_at)
  }
  changelogDismissed.value = true
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    fetchNotice()
    fetchChangelog()
    validateSession()
  }
})

watch(() => authStore.isLoggedIn, (v) => {
  if (v) { fetchNotice(); fetchChangelog() }
})

// Auto-dismiss when user navigates to /changelog
watch(() => route.name, (name) => {
  if (name === 'Changelog') dismissChangelog()
})
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
  font-size: var(--text-sm);
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
  font-size: var(--text-sm);
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

/* ── Site footer ──────────────────────────────────────────────────────── */
.site-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  padding: 14px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.foot-copy {
  font-size: var(--text-sm);
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.foot-links {
  display: flex;
  gap: 16px;
}
.foot-link {
  font-size: var(--text-sm);
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.12s;
}
.foot-link:hover { color: var(--text-2); text-decoration: none; }

@media (max-width: 768px) {
  .site-footer { padding: 12px 16px; }
}

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
  font-size: var(--text-sm);
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
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 5px 8px;
  border-radius: 3px;
  text-decoration: none;
  transition: color 0.12s, background 0.12s;
}
.mobile-nav a:hover { color: #fff; background: rgba(255,255,255,0.07); text-decoration: none; }
.mobile-nav a.router-link-exact-active { color: #fff; }

/* ── Notice banner ────────────────────────────────────────────────────── */
.notice-banner {
  background: #EEF4FF;
  border-bottom: 1px solid #C7D7F5;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
  color: #1A4080;
  flex-shrink: 0;
}
.notice-close {
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: #1A4080;
  opacity: 0.5;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
  transition: opacity 0.12s;
}
.notice-close:hover { opacity: 1; }

/* ── Changelog banner ─────────────────────────────────────────────────── */
.changelog-banner {
  background: #1A2A1A;
  border-bottom: 1px solid #2D4A2D;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
  color: #7BC47B;
  flex-shrink: 0;
}
.changelog-banner-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.changelog-link {
  font-size: var(--text-xs);
  color: #7BC47B;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: opacity 0.12s;
}
.changelog-link:hover { opacity: 0.8; }
.changelog-banner .notice-close { color: #7BC47B; }

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-wrap.has-sidebar { margin-left: 0; }
  .mobile-hd { display: flex; }
}
</style>
