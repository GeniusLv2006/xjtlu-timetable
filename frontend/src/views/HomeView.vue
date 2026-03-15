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
        <div v-if="timetables.length > 0" class="vis-wrap">
          <select
            v-model="visibility"
            class="vis-select"
            :title="visLabel"
            :disabled="visUpdating"
            @change="updateVisibility"
          >
            <option value="private">仅自己</option>
            <option value="friends">好友可见</option>
          </select>
          <Transition name="vis-saved">
            <span v-if="visSaved" class="vis-saved-mark">✓</span>
          </Transition>
        </div>
        <button
          v-if="timetables.length > 0 && !confirmDeleteId"
          class="btn btn-danger btn-xs"
          @click="confirmDeleteId = selectedId"
        >删除</button>
        <span v-if="timetables.length === 0 && !loading" class="empty-hint">
          还没有课表 — <router-link to="/import">去导入</router-link>
        </span>
      </div>
    </div>

    <!-- Delete confirmation -->
    <Transition name="confirm-bar">
      <div v-if="confirmDeleteId" class="confirm-bar">
        <span class="confirm-text">确定删除"{{ selectedTimetable?.label }}"？此操作不可撤回。</span>
        <button class="btn btn-danger btn-xs" :disabled="deleting" @click="deleteTimetable">
          {{ deleting ? '删除中…' : '确认删除' }}
        </button>
        <button class="btn btn-secondary btn-xs" @click="confirmDeleteId = null">取消</button>
      </div>
    </Transition>

    <!-- States -->
    <div v-if="loading" class="state-msg">加载中…</div>
    <div v-else-if="error" class="state-msg state-error">{{ error }}</div>

    <!-- Grid -->
    <TimetableGrid v-else :courses="courses" />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import pb from '../lib/pocketbase'
import TimetableGrid from '../components/TimetableGrid.vue'

defineOptions({ name: 'Home' })

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
const visibility   = ref('private')
const visUpdating  = ref(false)
const visSaved     = ref(false)
const confirmDeleteId = ref(null)
const deleting     = ref(false)

const visLabel = computed(() => {
  const map = { private: '仅自己可见', friends: '好友可见', public: '所有人可见' }
  return map[visibility.value] ?? ''
})

const selectedTimetable = computed(() =>
  timetables.value.find(t => t.id === selectedId.value) ?? null
)

async function loadTimetables() {
  loading.value = true
  error.value = ''
  try {
    const userId = pb.authStore.model?.id
    const result = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created',
      requestKey: null,
    })
    timetables.value = result
    if (result.length > 0) {
      // 若当前选中的课表仍在列表中则保持，否则切到第一个
      const stillExists = result.find(t => t.id === selectedId.value)
      if (!stillExists) {
        selectedId.value = result[0].id
        visibility.value = result[0].visibility ?? 'private'
      } else {
        visibility.value = stillExists.visibility ?? 'private'
      }
    } else {
      selectedId.value = null
      courses.value = []
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadTimetables)
onActivated(loadTimetables)

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
  if (!selectedId.value || visUpdating.value) return
  visUpdating.value = true
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
    visSaved.value = true
    setTimeout(() => { visSaved.value = false }, 1500)
  } catch (e) {
    error.value = e.message
  } finally {
    visUpdating.value = false
  }
}

async function deleteTimetable() {
  if (!selectedId.value || deleting.value) return
  deleting.value = true
  try {
    await pb.collection('timetables').delete(selectedId.value, { requestKey: null })
    timetables.value = timetables.value.filter(t => t.id !== selectedId.value)
    confirmDeleteId.value = null
    if (timetables.value.length > 0) {
      selectedId.value = timetables.value[0].id
    } else {
      selectedId.value = null
      courses.value = []
    }
  } catch (e) {
    error.value = e.message
  } finally {
    deleting.value = false
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
  padding: 28px 32px 40px;
}

@media (max-width: 768px) {
  .home-page { padding: 20px 16px 32px; }
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
.vis-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}
.vis-select {
  color: var(--text-2);
  font-size: var(--text-xs);
}
.vis-select:disabled { cursor: not-allowed; opacity: 0.6; }
.vis-saved-mark {
  font-size: var(--text-xs);
  color: var(--green);
  font-weight: 600;
}
.vis-saved-enter-active  { transition: opacity 0.2s; }
.vis-saved-leave-active  { transition: opacity 0.5s; }
.vis-saved-enter-from,
.vis-saved-leave-to { opacity: 0; }

/* Delete confirmation bar */
.confirm-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--red-bg);
  border: 1px solid #E5B4AF;
  border-radius: 3px;
  margin-bottom: var(--sp-4);
  flex-wrap: wrap;
}
.confirm-text {
  font-size: var(--text-sm);
  color: var(--red);
  flex: 1;
  min-width: 0;
}
.confirm-bar-enter-active { transition: opacity 0.15s, transform 0.15s; }
.confirm-bar-leave-active { transition: opacity 0.15s; }
.confirm-bar-enter-from  { opacity: 0; transform: translateY(-4px); }
.confirm-bar-leave-to    { opacity: 0; }

.btn-xs {
  padding: 3px 8px;
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
