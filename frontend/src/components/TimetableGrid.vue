<template>
  <div v-if="activeDays.length === 0" class="empty">暂无课程数据</div>
  <div v-else class="grid-scroll">
    <div class="grid-wrap" :style="{ minWidth: `${46 + activeDays.length * MIN_COL_W}px` }">

      <!-- 时间轴 -->
      <div class="time-axis" :style="{ paddingTop: HEADER_H + 'px' }">
        <div class="time-track" :style="{ height: gridH + 'px' }">
          <div
            v-for="hr in hourTicks"
            :key="hr"
            class="hour-label"
            :style="{ top: (hr - gridStart) * PPH - 7 + 'px' }"
          >
            {{ String(hr).padStart(2, '0') }}:00
          </div>
        </div>
      </div>

      <!-- 每一天的列 -->
      <div v-for="day in activeDays" :key="day" class="day-col">
        <!-- 日期表头 -->
        <div class="day-header" :style="{ height: HEADER_H + 'px' }">
          <span class="day-en">{{ day }}</span>
          <span class="day-zh">{{ DAY_ZH[day] }}</span>
        </div>

        <!-- 课程格 -->
        <div class="day-track" :style="{ height: gridH + 'px' }">
          <!-- 整点横线 -->
          <div
            v-for="hr in hourTicks"
            :key="'h' + hr"
            class="hr-line"
            :style="{ top: (hr - gridStart) * PPH + 'px' }"
          />
          <!-- 半点横线 -->
          <div
            v-for="hr in hourTicks.slice(0, -1)"
            :key="'hh' + hr"
            class="hr-line half"
            :style="{ top: (hr + 0.5 - gridStart) * PPH + 'px' }"
          />

          <!-- 课程块 -->
          <div
            v-for="c in coursesByDay[day]"
            :key="c.identity || c.id"
            class="course-block"
            :style="blockStyle(c)"
            @mouseenter="(e) => onBlockEnter(e, c)"
            @mouseleave="onBlockLeave"
            @click="(e) => onBlockClick(e, c)"
          >
            <div class="c-code">{{ c.code }}</div>
            <div v-if="blockH(c) > 28" class="c-sub">{{ c.activity_type }}</div>
            <div v-if="blockH(c) > 44 && c.staff" class="c-sub">{{ c.staff }}</div>
            <div v-if="blockH(c) > 62 && c.location" class="c-sub">{{ c.location }}</div>
            <div v-if="blockH(c) > 78 && c.weeks" class="c-sub">Week {{ c.weeks }}</div>
            <div v-if="blockH(c) > 94" class="c-sub">{{ c.start_time }}–{{ c.end_time }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Popover：Teleport 到 body，避免被 overflow:hidden 裁剪 -->
  <Teleport to="body">
    <Transition name="pop">
      <div
        v-if="popover.visible"
        ref="popoverEl"
        class="course-popover"
        :style="popoverStyle"
        @mouseenter="onPopoverEnter"
        @mouseleave="onPopoverLeave"
        @click.stop
      >
        <!-- 标题行：代码 + 完整名 -->
        <div class="pop-title">{{ popover.course?.code }}</div>
        <div v-if="popover.course?.section" class="pop-fullname">
          {{ popover.course.code }}-{{ popover.course.activity_type }}-{{ popover.course.section }}
        </div>

        <div class="pop-divider" />

        <div class="pop-row">
          <span class="pop-label">类型</span>
          <span>{{ popover.course?.activity_type || '—' }}</span>
        </div>
        <div class="pop-row">
          <span class="pop-label">班级</span>
          <span>{{ popover.course?.section || '—' }}</span>
        </div>
        <div class="pop-row">
          <span class="pop-label">教师</span>
          <span>{{ popover.course?.staff || '—' }}</span>
        </div>
        <div class="pop-row">
          <span class="pop-label">地点</span>
          <span>{{ popover.course?.location || '—' }}</span>
        </div>
        <div class="pop-row">
          <span class="pop-label">周次</span>
          <span>{{ popover.course?.weeks || '—' }}</span>
        </div>
        <div class="pop-row">
          <span class="pop-label">时间</span>
          <span>{{ popover.course?.start_time }}–{{ popover.course?.end_time }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

// ── Props ────────────────────────────────────────────────────────────────
const props = defineProps({
  courses: { type: Array, default: () => [] },
  highlightCodes: { type: Array, default: () => [] },
  compareMode: { type: Boolean, default: false },
  ownerId: { type: String, default: '' },
})

// ── 常量 ─────────────────────────────────────────────────────────────────
const PPH = 60
const HEADER_H = 36
const MIN_COL_W = 92
const POPOVER_W = 220
const POPOVER_GAP = 8   // 距触发元素的间距

const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_ZH = { MON: '周一', TUE: '周二', WED: '周三', THU: '周四', FRI: '周五', SAT: '周六', SUN: '周日' }

const TYPE_COLOR = {
  Lecture:    { bg: '#EEEDFE', bor: '#AFA9EC', tx: '#3C3489' },
  'Comp.Lab': { bg: '#E6F1FB', bor: '#85B7EB', tx: '#0C447C' },
  Tutorial:   { bg: '#FBEAF0', bor: '#ED93B1', tx: '#72243E' },
  Lab:        { bg: '#EAF3DE', bor: '#97C459', tx: '#27500A' },
  Seminar:    { bg: '#E1F5EE', bor: '#5DCAA5', tx: '#085041' },
}

// ── Popover 状态 ──────────────────────────────────────────────────────────
const popoverEl = ref(null)
const popover = reactive({
  visible: false,
  course: null,
  x: 0,
  y: 0,
  anchorRight: false,  // true = 向左弹出
  anchorTop: false,    // true = 向上弹出
})

// hover 延迟计时器（防止划过时闪烁）
let hideTimer = null
let isTouchDevice = false

const popoverStyle = computed(() => {
  const style = {
    width: POPOVER_W + 'px',
    position: 'fixed',
    zIndex: 9999,
  }
  if (popover.anchorRight) {
    style.right = window.innerWidth - popover.x + 'px'
    style.left = 'auto'
  } else {
    style.left = popover.x + 'px'
    style.right = 'auto'
  }
  if (popover.anchorTop) {
    style.bottom = window.innerHeight - popover.y + 'px'
    style.top = 'auto'
  } else {
    style.top = popover.y + 'px'
    style.bottom = 'auto'
  }
  return style
})

function calcPosition(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const popH = popoverEl.value?.offsetHeight || 200

  // 默认：在元素右侧弹出，顶部对齐元素顶部
  let x = rect.right + POPOVER_GAP
  let y = rect.top
  let anchorRight = false
  let anchorTop = false

  // 右侧放不下 → 向左弹出（从元素左侧）
  if (x + POPOVER_W > vw - 8) {
    x = rect.left - POPOVER_GAP  // anchorRight 模式：存元素左边界 x
    anchorRight = true
  }

  // 底部放不下 → 向上弹出（底边对齐元素底部）
  if (y + popH > vh - 8) {
    y = rect.bottom  // anchorTop 模式：存元素底部，用 bottom 定位
    anchorTop = true
  }

  return { x, y, anchorRight, anchorTop }
}

function showPopover(e, course) {
  clearTimeout(hideTimer)
  const rect = e.currentTarget.getBoundingClientRect()
  popover.course = course
  popover.visible = true

  // 先渲染出 DOM，再根据实际高度重算位置
  nextTick(() => {
    const pos = calcPosition(rect)
    popover.x = pos.x
    popover.y = pos.y
    popover.anchorRight = pos.anchorRight
    popover.anchorTop = pos.anchorTop
  })
}

function hidePopover(delay = 120) {
  hideTimer = setTimeout(() => {
    popover.visible = false
    popover.course = null
  }, delay)
}

// ── 事件处理 ──────────────────────────────────────────────────────────────

function onBlockEnter(e, course) {
  if (isTouchDevice) return
  showPopover(e, course)
}

function onBlockLeave() {
  if (isTouchDevice) return
  hidePopover()
}

function onBlockClick(e, course) {
  e.stopPropagation()
  // 触摸设备：tap 切换；桌面：忽略（hover 已处理）
  if (!isTouchDevice) return
  if (popover.visible && popover.course === course) {
    hidePopover(0)
  } else {
    showPopover(e, course)
  }
}

// popover 本身 hover 时取消隐藏计时器
function onPopoverEnter() {
  clearTimeout(hideTimer)
}
function onPopoverLeave() {
  hidePopover()
}

// 点击外部关闭（桌面 + 移动端通用）
function onDocClick() {
  if (popover.visible) hidePopover(0)
}

onMounted(() => {
  // 检测是否为触摸主设备
  isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  document.addEventListener('click', onDocClick)
  document.addEventListener('touchstart', onDocClick, { passive: true })
})

onUnmounted(() => {
  clearTimeout(hideTimer)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('touchstart', onDocClick)
})

// ── 工具函数 ──────────────────────────────────────────────────────────────

function timeToFrac(t) {
  if (!t || t === '--:--') return null
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function getColors(activityType) {
  if (!activityType) return { bg: '#F1EFE8', bor: '#B4B2A9', tx: '#5F5E5A' }
  for (const [key, val] of Object.entries(TYPE_COLOR)) {
    if (activityType.toLowerCase().includes(key.toLowerCase())) return val
  }
  return { bg: '#F1EFE8', bor: '#B4B2A9', tx: '#5F5E5A' }
}

// ── 计算属性 ──────────────────────────────────────────────────────────────

const activeDays = computed(() =>
  DAYS_ORDER.filter((d) => props.courses.some((c) => c.day === d)),
)

const gridStart = computed(() => {
  const fracs = props.courses.map((c) => timeToFrac(c.start_time)).filter((n) => n != null)
  return fracs.length ? Math.floor(Math.min(...fracs)) : 8
})

const gridEnd = computed(() => {
  const fracs = props.courses.map((c) => timeToFrac(c.end_time)).filter((n) => n != null)
  return fracs.length ? Math.ceil(Math.max(...fracs)) : 18
})

const gridH = computed(() => (gridEnd.value - gridStart.value) * PPH)

const hourTicks = computed(() => {
  const ticks = []
  for (let i = gridStart.value; i <= gridEnd.value; i++) ticks.push(i)
  return ticks
})

const coursesByDay = computed(() => {
  const map = {}
  for (const day of activeDays.value) {
    const dayCourses = props.courses.filter((c) => c.day === day)
    if (!props.compareMode) {
      map[day] = dayCourses
      continue
    }
    const left = dayCourses.filter((c) => c._ownerId === props.ownerId)
    const right = dayCourses.filter((c) => c._ownerId !== props.ownerId)
    map[day] = [
      ...left.map((c) => ({ ...c, _slot: 'left' })),
      ...right.map((c) => ({ ...c, _slot: 'right' })),
    ]
  }
  return map
})

// ── 样式计算 ──────────────────────────────────────────────────────────────

function blockH(c) {
  const sh = timeToFrac(c.start_time) ?? gridStart.value
  const eh = timeToFrac(c.end_time) ?? (sh + 1)
  return Math.max((eh - sh) * PPH - 2, 20)
}

function blockStyle(c) {
  const sh = timeToFrac(c.start_time) ?? gridStart.value
  const eh = timeToFrac(c.end_time) ?? (sh + 1)
  const top = (sh - gridStart.value) * PPH + 1
  const height = Math.max((eh - sh) * PPH - 2, 20)
  const colors = getColors(c.activity_type)

  const dimmed = props.highlightCodes.length > 0 && !props.highlightCodes.includes(c.code)

  let left = '3px', right = '3px'
  if (props.compareMode) {
    if (c._slot === 'left')  { left = '2px'; right = '52%' }
    if (c._slot === 'right') { left = '52%'; right = '2px' }
  }

  const isOther = props.compareMode && c._slot === 'right'

  return {
    position: 'absolute',
    top: top + 'px',
    left,
    right,
    height: height + 'px',
    background: isOther
      ? `repeating-linear-gradient(45deg,${colors.bg},${colors.bg} 4px,${colors.bor}22 4px,${colors.bor}22 8px)`
      : colors.bg,
    border: `0.5px solid ${colors.bor}`,
    borderRadius: '4px',
    padding: '3px 5px',
    overflow: 'hidden',
    opacity: dimmed ? 0.3 : 1,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    '--tx': colors.tx,
  }
}
</script>

<style scoped>
.empty {
  text-align: center;
  padding: 60px 0;
  font-size: var(--text-sm, 12px);
  color: var(--text-3, #999);
}

.grid-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.grid-wrap {
  display: flex;
}

/* Time axis */
.time-axis {
  width: 46px;
  flex-shrink: 0;
}
.time-track {
  position: relative;
}
.hour-label {
  position: absolute;
  right: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 400;
  color: var(--text-3, #aaa);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  letter-spacing: 0.02em;
}

/* Day columns */
.day-col {
  flex: 1;
  min-width: 90px;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  border-left: 1px solid var(--border, #e0e0e0);
  user-select: none;
  background: var(--surface, #fff);
}
.day-en {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-2, #555);
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.06em;
}
.day-zh {
  font-size: 9px;
  font-weight: 400;
  color: var(--text-3, #999);
}

.day-track {
  position: relative;
  border-left: 1px solid var(--border, #e0e0e0);
  background: var(--surface, #fff);
}

/* Grid lines */
.hr-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border, #e0e0e0);
  pointer-events: none;
}
.hr-line.half {
  opacity: 0.35;
}

/* Course blocks */
.course-block {
  box-sizing: border-box;
}
.c-code {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx, #333);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.c-sub {
  font-size: 10px;
  color: var(--tx, #555);
  opacity: 0.75;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<!-- Popover 样式：不加 scoped，因为元素在 body 下 -->
<style>
.course-popover {
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 4px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 12px 14px;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 13px;
  line-height: 1.5;
  pointer-events: auto;
  box-sizing: border-box;
}

.course-popover .pop-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text, #1a1a1a);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}
.course-popover .pop-fullname {
  font-size: 10px;
  color: var(--text-3, #777);
  font-family: var(--font-mono, monospace);
  margin-bottom: 6px;
  word-break: break-all;
}
.course-popover .pop-divider {
  height: 1px;
  background: var(--border, #ebebeb);
  margin: 8px 0;
}
.course-popover .pop-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text, #333);
}
.course-popover .pop-row:last-child {
  margin-bottom: 0;
}
.course-popover .pop-label {
  width: 32px;
  flex-shrink: 0;
  color: var(--text-3, #999);
  font-size: 11px;
  padding-top: 1px;
}

/* 出现/消失动画 */
.pop-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.pop-leave-active {
  transition: opacity 0.08s ease;
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
.pop-leave-to {
  opacity: 0;
}
</style>
