<template>
  <!-- Greeting overlay (once per session) -->
  <Transition name="overlay">
    <div v-if="showGreeting" class="greeting-overlay" @click="dismissGreeting">
      <div class="greeting-stage">
        <p class="g-time">{{ greetingWord }}</p>
        <p class="g-name">{{ displayName }}</p>
        <p class="g-hint">点击任意处继续</p>
      </div>
    </div>
  </Transition>

  <div class="home-page">

    <!-- Page toolbar -->
    <div class="page-toolbar">
      <div class="title-block">
        <h1 class="page-title">{{ greetingWord }}，{{ displayName }}</h1>
        <span class="page-sub">我的课表</span>
      </div>
      <div class="toolbar-right">
        <select v-if="timetables.length > 1" v-model="selectedId" class="tt-select">
          <option v-for="t in timetables" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <select
          v-if="timetables.length > 0"
          v-model="visibility"
          class="vis-select"
          :title="visLabel"
          @change="updateVisibility"
        >
          <option value="private">仅自己</option>
          <option value="friends">好友可见</option>
        </select>
        <span v-if="timetables.length === 0 && !loading" class="empty-hint">
          还没有课表 — <router-link to="/import">去导入</router-link>
        </span>
      </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="state-msg">加载中…</div>
    <div v-else-if="error" class="state-msg state-error">{{ error }}</div>

    <!-- Grid -->
    <TimetableGrid v-else :courses="courses" />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import pb from '../lib/pocketbase'
import TimetableGrid from '../components/TimetableGrid.vue'

// ── Greeting ──────────────────────────────────────────────────────────────

const model = pb.authStore.model

const displayName = computed(() => {
  if (model?.name) return model.name
  const email = model?.email ?? ''
  return email.split('@')[0] || '同学'
})

const greetingWord = computed(() => {
  const h = new Date().getHours()
  if (h >= 6  && h < 12) return '早上好'
  if (h >= 12 && h < 18) return '下午好'
  return '晚上好'
})

// Show once per browser session
const GREET_KEY = 'xjtlu_greeted'
const showGreeting = ref(false)

onMounted(() => {
  if (!sessionStorage.getItem(GREET_KEY)) {
    showGreeting.value = true
    sessionStorage.setItem(GREET_KEY, '1')
    setTimeout(() => { showGreeting.value = false }, 3000)
  }
})

function dismissGreeting() {
  showGreeting.value = false
}

// ── Timetable ─────────────────────────────────────────────────────────────

const timetables = ref([])
const selectedId = ref(null)
const courses    = ref([])
const loading    = ref(true)
const error      = ref('')
const visibility = ref('private')

const visLabel = computed(() => {
  const map = { private: '仅自己可见', friends: '好友可见' }
  return map[visibility.value] ?? ''
})

onMounted(async () => {
  try {
    const userId = pb.authStore.model?.id
    const result = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created',
      requestKey: null,
    })
    timetables.value = result
    if (result.length > 0) {
      selectedId.value = result[0].id
      visibility.value = result[0].visibility ?? 'private'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

watch(selectedId, async (id) => {
  if (!id) { courses.value = []; return }
  const tt = timetables.value.find(t => t.id === id)
  if (tt) visibility.value = tt.visibility ?? 'private'

  loading.value = true
  error.value = ''
  try {
    courses.value = await pb.collection('courses').getFullList({
      filter: `timetable = "${id}"`,
      requestKey: null,
    })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function updateVisibility() {
  if (!selectedId.value) return
  try {
    await pb.collection('timetables').update(
      selectedId.value,
      { visibility: visibility.value },
      { requestKey: null }
    )
    const idx = timetables.value.findIndex(t => t.id === selectedId.value)
    if (idx !== -1) {
      timetables.value[idx] = { ...timetables.value[idx], visibility: visibility.value }
    }
  } catch (e) {
    error.value = e.message
  }
}
</script>

<style scoped>
/* ── Greeting overlay ────────────────────────────────────────────────────── */
.greeting-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: #18181A;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.greeting-stage {
  text-align: center;
  animation: stage-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.g-time {
  font-size: clamp(28px, 6vw, 52px);
  font-weight: 300;
  color: #6A6860;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  animation: line-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

.g-name {
  font-size: clamp(32px, 8vw, 68px);
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.02em;
  line-height: 1.1;
  animation: line-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both;
}

.g-hint {
  margin-top: 40px;
  font-size: 11px;
  color: #3A3830;
  letter-spacing: 0.1em;
  animation: line-in 0.5s ease 1.2s both;
}

@keyframes stage-in {
  from { opacity: 0 }
  to   { opacity: 1 }
}
@keyframes line-in {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: translateY(0) }
}

/* Transition: overlay fade-out */
.overlay-leave-active {
  transition: opacity 0.45s ease;
}
.overlay-leave-to {
  opacity: 0;
}

/* ── Home page ───────────────────────────────────────────────────────────── */
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-8);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-sub {
  font-size: var(--text-xs);
  color: var(--text-3);
  letter-spacing: 0.04em;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}
.tt-select,
.vis-select {
  padding: 5px 10px;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.tt-select:focus,
.vis-select:focus { border-color: var(--border-strong); }
.vis-select {
  color: var(--text-2);
  font-size: var(--text-xs);
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--text-3);
}

.state-msg {
  padding: var(--sp-10) 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }
</style>
