<template>
  <div class="import-page">
    <h2>导入课表</h2>

    <!-- Step 1: 书签工具 -->
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-title">添加书签工具</div>
        <div class="step-desc">
          点击复制书签代码，在浏览器书签栏新建书签，将 URL 替换为复制的代码。只需做一次。
        </div>
        <div class="bm-wrap">{{ BOOKMARKLET }}<div class="bm-fade"></div></div>
        <button class="btn-secondary" @click="copyBookmarklet">
          {{ bookmarkCopied ? '✓ 已复制' : '复制书签代码' }}
        </button>
      </div>
    </div>

    <!-- Step 2: 在 ebridge 运行 -->
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-title">在 ebridge 课表页运行书签</div>
        <div class="step-desc">
          登录 <code>ebridge.xjtlu.edu.cn</code>，打开课表页面，等课表加载完毕后点击书签。<br />
          出现 "✓ HASH 已复制到剪贴板" 提示即成功。
        </div>
        <div class="notice-info">
          书签直接从页面内的 iframe 元素读取链接，无需打开 DevTools。
        </div>
      </div>
    </div>

    <!-- Step 3: 粘贴并导入 -->
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-title">粘贴 HASH 并导入到课表库</div>
        <div class="input-row">
          <input
            v-model="hashInput"
            type="text"
            placeholder="粘贴 HASH（64位十六进制）或完整 URL"
            @keydown.enter="handleImport"
            :disabled="phase !== 'idle'"
          />
          <button
            class="btn-primary"
            :disabled="!hashInput.trim() || phase !== 'idle'"
            @click="handleImport"
          >
            {{ phaseLabel }}
          </button>
        </div>

        <div v-if="phase === 'fetching'" class="status-info">正在从 timetableplus 拉取数据…</div>
        <div v-if="phase === 'saving'" class="status-info">
          正在写入数据库… ({{ savedCount + skippedCount }} / {{ totalCount }})
        </div>
        <div v-if="error" class="status-error">{{ error }}</div>
        <div v-if="phase === 'done'" class="status-success">
          ✓ 导入完成：新增 {{ savedCount }} 条，跳过 {{ skippedCount }} 条（已存在）。即将跳转…
        </div>
      </div>
    </div>

    <div class="notice-warn">
      ⚠ HASH 是课表的只读访问凭证，持有者无需登录即可查询你的课表。<br />
      有效期由学校服务端控制，可能在学期结束或重新选课后失效。
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import pb from '../lib/pocketbase'

const router = useRouter()

// ── 书签代码（与参考原型完全一致）─────────────────────────────────────────
const BOOKMARKLET = `javascript:(function(){var f=document.getElementById('myFrame');var src=f&&(f.src||f.getAttribute('src'));if(!src){var frames=document.querySelectorAll('iframe');for(var i=0;i<frames.length;i++){if((frames[i].src||'').includes('timetableplus')){src=frames[i].src;break;}}}if(!src){alert('未找到课表框架\\n请确保：\\n1. 已登录 ebridge\\n2. 当前页面已展示课表（非空白）');return;}var m=src.match(/[#\\/]([0-9A-Fa-f]{40,})/);if(!m){alert('找到框架但无法提取 HASH，src: '+src.slice(0,80));return;}navigator.clipboard.writeText(m[1].toUpperCase()).then(function(){alert('✓ HASH 已复制到剪贴板\\n请切换到课表导入页面粘贴')}).catch(function(){prompt('请手动复制以下 HASH：',m[1].toUpperCase());});})();`

// ── 常量 ─────────────────────────────────────────────────────────────────
const SCHEDULED_DAY_MAP = {
  '0': 'MON', '1': 'TUE', '2': 'WED', '3': 'THU',
  '4': 'FRI', '5': 'SAT', '6': 'SUN',
}

// ── 状态 ─────────────────────────────────────────────────────────────────
const hashInput = ref('')
const phase = ref('idle') // idle | fetching | saving | done
const error = ref('')
const savedCount = ref(0)
const skippedCount = ref(0)
const totalCount = ref(0)
const bookmarkCopied = ref(false)

const phaseLabel = computed(() => {
  if (phase.value === 'fetching') return '获取中…'
  if (phase.value === 'saving') return '保存中…'
  if (phase.value === 'done') return '导入完成'
  return '获取并导入'
})

// ── 工具函数 ──────────────────────────────────────────────────────────────

function extractHash(input) {
  const s = (input || '').trim()
  const m = s.match(/[#/]([0-9A-Fa-f]{40,})/)
  if (m) return m[1].toUpperCase()
  if (/^[0-9A-Fa-f]{40,}$/.test(s)) return s.toUpperCase()
  return null
}

/**
 * ISO 8601 UTC → CST (UTC+8) HH:MM 字符串
 * subtractMinutes: endTime 减 10 分钟（XJTLU 课程50分钟，API 存整点）
 */
function isoToCST(iso, subtractMinutes = 0) {
  if (!iso) return null
  let hh, mm
  if (iso.includes('T')) {
    const d = new Date(iso)
    hh = d.getUTCHours()
    mm = d.getUTCMinutes()
  } else {
    const part = iso.includes(' ') ? iso.split(' ')[1] : iso
    ;[hh, mm] = (part || '00:00').split(':').map(Number)
  }
  const totalMin = hh * 60 + mm + 480 - subtractMinutes // +480 = UTC+8
  const ch = Math.floor(totalMin / 60) % 24
  const cm = totalMin % 60
  return `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`
}

function normalizeActivities(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => {
      if (!a) return null
      const startRaw = a.startTime || a.start || ''
      const endRaw = a.endTime || a.end || ''
      const nameRaw = a.name || ''
      const activityType = a.activityType || ''

      const day =
        SCHEDULED_DAY_MAP[String(a.scheduledDay)] ||
        (startRaw
          ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(startRaw).getDay()]
          : 'MON')

      const startTime = isoToCST(startRaw, 0)
      const endTime = isoToCST(endRaw, 10)

      // 从 name 解析 code / section，格式如 "IOM103-Lecture-D1/1"
      const m = nameRaw.match(/^([A-Z]+\d+)[-–]([^-–]+)[-–](.+)$/)
      const code = m ? m[1] : (a.moduleId || nameRaw.split(/[-–]/)[0] || nameRaw)
      const section = m ? m[3].trim() : ''

      return {
        identity: a.identity || a.id || '',
        code: code.trim(),
        activity_type: activityType || (m ? m[2].trim() : ''),
        section,
        day,
        start_time: startTime || '--:--',
        end_time: endTime || '--:--',
        location: (a.location || '').trim(),
        staff: (a.staff || '').trim(),
        weeks: a.weekPattern || a.week || '',
      }
    })
    .filter(Boolean)
}

// ── 书签复制 ──────────────────────────────────────────────────────────────
async function copyBookmarklet() {
  try {
    await navigator.clipboard.writeText(BOOKMARKLET)
    bookmarkCopied.value = true
    setTimeout(() => (bookmarkCopied.value = false), 2000)
  } catch {
    alert('请手动复制书签代码')
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────
async function handleImport() {
  error.value = ''
  savedCount.value = 0
  skippedCount.value = 0
  totalCount.value = 0

  const hash = extractHash(hashInput.value)
  if (!hash) {
    error.value = '无法识别 HASH，请粘贴剪贴板内容或完整 URL'
    return
  }

  // Step 1: 拉取 API 数据
  phase.value = 'fetching'
  let rawList
  try {
    // 先直接请求；若 CORS 被拒，自动降级到 Vite 代理 /timetable-api
    let res
    try {
      res = await fetch(
        `https://timetableplus.xjtlu.edu.cn/ptapi/api/enrollment/hash/${hash}/activity`,
        { headers: { Accept: 'application/json' } },
      )
    } catch {
      res = await fetch(`/timetable-api/ptapi/api/enrollment/hash/${hash}/activity`, {
        headers: { Accept: 'application/json' },
      })
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} — HASH 可能已失效，请重新运行书签`)
    const data = await res.json()
    rawList = Array.isArray(data) ? data : (data.data || data.activities || data.result || [])
    if (!rawList.length) throw new Error('返回空数据，可能是空课表或 HASH 已过期')
  } catch (e) {
    error.value = e.message
    phase.value = 'idle'
    return
  }

  const activities = normalizeActivities(rawList)
  totalCount.value = activities.length

  // Step 2: 写入 PocketBase
  phase.value = 'saving'
  try {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('未登录，请刷新页面重试')

    // 查找或创建 timetable 记录（同一 hash 不重复创建）
    let timetable
    const existing = await pb.collection('timetables').getList(1, 1, {
      filter: `user = "${userId}" && hash = "${hash}"`,
    })
    if (existing.totalItems > 0) {
      timetable = existing.items[0]
      await pb.collection('timetables').update(timetable.id, {
        last_synced: new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
      })
    } else {
      const label =
        new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) + ' 导入'
      timetable = await pb.collection('timetables').create({
        user: userId,
        hash,
        label,
        visibility: 'private',
        last_synced: new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
      })
    }

    // 获取已有的 identity 集合用于去重
    const existingCourses = await pb.collection('courses').getFullList({
      filter: `timetable = "${timetable.id}"`,
      fields: 'identity',
    })
    const existingIdentities = new Set(existingCourses.map((c) => c.identity))

    // 逐条创建新课程
    for (const act of activities) {
      if (act.identity && existingIdentities.has(act.identity)) {
        skippedCount.value++
        continue
      }
      await pb.collection('courses').create({
        timetable: timetable.id,
        code: act.code,
        activity_type: act.activity_type,
        section: act.section,
        day: act.day,
        start_time: act.start_time,
        end_time: act.end_time,
        location: act.location,
        staff: act.staff,
        weeks: act.weeks,
        identity: act.identity,
      })
      savedCount.value++
    }

    phase.value = 'done'
    setTimeout(() => router.push('/'), 2000)
  } catch (e) {
    error.value = e.message || '写入数据库失败'
    phase.value = 'idle'
  }
}
</script>

<style scoped>
.import-page {
  max-width: 600px;
  margin: 32px auto;
  padding: 0 16px;
}

h2 {
  margin-bottom: 24px;
}

.step {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f3f3f3;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  color: #666;
  margin-top: 2px;
}
.step-body {
  flex: 1;
}
.step-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}
.step-desc {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
}

.bm-wrap {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 8px 0;
  font-family: monospace;
  font-size: 10px;
  color: #777;
  word-break: break-all;
  max-height: 52px;
  overflow: hidden;
  position: relative;
  line-height: 1.5;
}
.bm-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, #f5f5f5);
}

.input-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.input-row input {
  flex: 1;
  padding: 8px 12px;
  font-family: monospace;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}
.input-row input:focus {
  border-color: #888;
}
.input-row input:disabled {
  opacity: 0.6;
}

.btn-primary {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  background: #333;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-secondary {
  margin-top: 6px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
}

.status-info    { font-size: 13px; color: #555;    margin-top: 8px; }
.status-error   { font-size: 13px; color: #c0392b; margin-top: 8px; }
.status-success { font-size: 13px; color: #27ae60; margin-top: 8px; }

.notice-info {
  font-size: 12px;
  color: #1a6fa0;
  background: #e8f4fb;
  border: 1px solid #a8d4ed;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 10px;
  line-height: 1.6;
}
.notice-warn {
  font-size: 12px;
  color: #7a5000;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  padding: 10px 14px;
  margin-top: 8px;
  line-height: 1.7;
}

code {
  font-family: monospace;
  font-size: 11px;
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
