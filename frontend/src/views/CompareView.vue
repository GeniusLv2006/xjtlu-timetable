<template>
  <div class="compare-page">

    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <a class="back-link" href="#" @click.prevent="goBack">← 返回</a>
        <h1 class="page-title">课表对比</h1>
      </div>
      <div v-if="!loading && !loadError" class="toolbar-selects">
        <select v-if="myTimetables.length > 1" v-model="mySelectedId" class="tt-select">
          <option v-for="t in myTimetables" :key="t.id" :value="t.id">我：{{ t.label }}</option>
        </select>
        <select v-if="otherTimetables.length > 1" v-model="otherSelectedId" class="tt-select">
          <option v-for="t in otherTimetables" :key="t.id" :value="t.id">TA：{{ t.label }}</option>
        </select>
      </div>
    </div>

    <!-- Loading / error -->
    <div v-if="loading" class="state-msg">加载中…</div>
    <div v-else-if="loadError" class="state-msg state-error">{{ loadError }}</div>

    <template v-else>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-item">
          <span class="swatch swatch-me" />
          我的课程
        </span>
        <span class="legend-divider" />
        <span class="legend-item">
          <span class="swatch swatch-other" />
          对方课程
        </span>
        <span v-if="commonCodes.length" class="legend-divider" />
        <label v-if="commonCodes.length" class="legend-toggle">
          <input type="checkbox" v-model="showOnlyCommon" />
          只看共同课
        </label>
      </div>

      <!-- Timetable grid -->
      <TimetableGrid
        :courses="allCourses"
        :compareMode="true"
        :ownerId="myId"
        :highlightCodes="showOnlyCommon ? commonCodes : []"
      />

      <!-- Analysis panels -->
      <div class="analysis-row">

        <!-- Common courses -->
        <div class="analysis-panel">
          <div class="panel-head">
            <span class="panel-title">共同课程</span>
            <span class="panel-badge">{{ commonCourses.length }}</span>
          </div>
          <div v-if="commonCourses.length === 0" class="panel-empty">暂无共同课程</div>
          <div v-else class="common-list">
            <div
              v-for="c in commonCourses"
              :key="c.code + '/' + c.activityType"
              class="common-item"
            >
              <span class="ci-code">{{ c.code }}</span>
              <span class="ci-type">{{ c.activityType }}</span>
              <span class="ci-sections">
                {{ c.courses.map(x => x.section).filter(Boolean).join(' vs ') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Free slots -->
        <div class="analysis-panel">
          <div class="panel-head">
            <span class="panel-title">共同空闲</span>
            <span class="panel-badge">{{ freeSlots.length }}</span>
            <span class="panel-hint">按时长排序</span>
          </div>
          <div v-if="freeSlots.length === 0" class="panel-empty">暂无共同空闲时段</div>
          <div v-else class="slots-list">
            <div v-for="s in freeSlots" :key="s.day + s.start" class="slot-item">
              <span class="si-day">{{ DAY_ZH[s.day] }}</span>
              <span class="si-time">{{ s.start }}–{{ s.end }}</span>
              <span class="si-dur">{{ s.duration }} min</span>
            </div>
          </div>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import pb from '../lib/pocketbase'
import adminPb from '../lib/adminPb'
import TimetableGrid from '../components/TimetableGrid.vue'
import { findCommonCourses, findFreeSlots } from '../utils/compareSchedules'

// Use adminPb when accessed from admin panel (bypasses visibility rules)
const isAdmin = adminPb.authStore.isValid
const client = isAdmin ? adminPb : pb

const route  = useRoute()
const router = useRouter()
const userId = route.params.userId

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/friends')
  }
}

const DAY_ZH = { MON:'周一', TUE:'周二', WED:'周三', THU:'周四', FRI:'周五', SAT:'周六', SUN:'周日' }

// ── State ─────────────────────────────────────────────────────────────────
const loading    = ref(true)
const loadError  = ref('')

const myId = ref('')
const myTimetables    = ref([])
const otherTimetables = ref([])
const mySelectedId    = ref(null)
const otherSelectedId = ref(null)

const myCourses    = ref([])
const otherCourses = ref([])

const showOnlyCommon = ref(false)

// ── Load timetable lists ──────────────────────────────────────────────────
onMounted(async () => {
  try {
    myId.value = pb.authStore.model?.id ?? ''

    const fetches = [
      client.collection('timetables').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
        requestKey: null,
      }),
    ]
    if (myId.value && myId.value !== userId) {
      fetches.unshift(
        client.collection('timetables').getFullList({
          filter: `user = "${myId.value}"`,
          sort: '-created',
          requestKey: null,
        })
      )
    }

    const results = await Promise.all(fetches)
    const [myTTs, otherTTs] = myId.value && myId.value !== userId
      ? results
      : [[], results[0]]

    myTimetables.value    = myTTs
    otherTimetables.value = otherTTs

    if (!otherTTs.length) {
      loadError.value = '该用户没有公开的课表，或用户不存在。'
      loading.value = false
      return
    }

    mySelectedId.value    = myTTs.length    ? myTTs[0].id    : null
    otherSelectedId.value = otherTTs.length ? otherTTs[0].id : null
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
})

// ── Load courses when selection changes ───────────────────────────────────
async function loadCourses(timetableId, target) {
  if (!timetableId) { target.value = []; return }
  try {
    target.value = await client.collection('courses').getFullList({
      filter: `timetable = "${timetableId}"`,
      requestKey: null,
    })
  } catch { target.value = [] }
}

watch(mySelectedId,    (id) => loadCourses(id, myCourses))
watch(otherSelectedId, (id) => loadCourses(id, otherCourses))

// ── Combined courses for TimetableGrid ────────────────────────────────────
const allCourses = computed(() => [
  ...myCourses.value.map(c    => ({ ...c, _ownerId: myId.value })),
  ...otherCourses.value.map(c => ({ ...c, _ownerId: userId })),
])

// ── Analysis ──────────────────────────────────────────────────────────────
const commonCourses = computed(() =>
  findCommonCourses([myCourses.value, otherCourses.value])
)

const commonCodes = computed(() =>
  commonCourses.value.map(c => `${c.code}|${c.activityType}|${c.courses[0].section}`)
)

const freeSlots = computed(() => {
  const slots = findFreeSlots(
    [myCourses.value, otherCourses.value],
    { minDuration: 30 }
  )
  return slots.sort((a, b) => b.duration - a.duration)
})
</script>

<style scoped>
.compare-page {
  padding: 28px 32px 40px;
}

/* Toolbar */
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.back-link {
  font-size: var(--text-sm);
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.12s;
  white-space: nowrap;
}
.back-link:hover { color: var(--accent); text-decoration: none; }

.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.toolbar-selects {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.tt-select {
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
.tt-select:focus { border-color: var(--border-strong); }

/* States */
.state-msg {
  padding: 60px 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }

/* Legend */
.legend {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-2);
}
.legend-divider {
  width: 1px;
  height: 14px;
  background: var(--border);
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}
.swatch-me {
  background: #EEEDFE;
  border: 1px solid #AFA9EC;
}
.swatch-other {
  background: repeating-linear-gradient(45deg, #EEEDFE, #EEEDFE 3px, #AFA9EC44 3px, #AFA9EC44 6px);
  border: 1px solid #AFA9EC;
}
.legend-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
}
.legend-toggle input { cursor: pointer; }

/* Analysis row */
.analysis-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4);
  margin-top: var(--sp-6);
}
@media (max-width: 600px) {
  .analysis-row { grid-template-columns: 1fr; }
}

.analysis-panel {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  background: var(--surface);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.panel-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}
.panel-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--surface);
  background: var(--text-2);
  border-radius: 2px;
  padding: 1px 5px;
  line-height: 1.4;
}
.panel-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-left: auto;
}

.panel-empty {
  padding: var(--sp-5) var(--sp-4);
  font-size: var(--text-sm);
  color: var(--text-3);
  text-align: center;
}

/* Common courses list */
.common-list {
  max-height: 260px;
  overflow-y: auto;
}
.common-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  padding: 7px var(--sp-4);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}
.common-item:last-child { border-bottom: none; }
.ci-code {
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: nowrap;
}
.ci-type {
  color: var(--text-2);
  font-size: var(--text-xs);
  white-space: nowrap;
}
.ci-sections {
  color: var(--text-3);
  font-size: var(--text-xs);
  margin-left: auto;
  white-space: nowrap;
  font-family: var(--font-mono);
}

/* Free slots list */
.slots-list {
  max-height: 260px;
  overflow-y: auto;
}
.slot-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding: 7px var(--sp-4);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}
.slot-item:last-child { border-bottom: none; }
.si-day {
  font-weight: 600;
  color: var(--text);
  width: 32px;
  flex-shrink: 0;
}
.si-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-2);
}
.si-dur {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-family: var(--font-mono);
  margin-left: auto;
}
</style>
