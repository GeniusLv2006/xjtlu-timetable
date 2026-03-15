<template>
  <!-- 协议门控 -->
  <div v-if="!termsAccepted" class="terms-gate">
    <div class="terms-card">
      <div class="tg-header">
        <div class="tg-title">使用前请阅读并同意用户协议</div>
        <div class="tg-sub">首次使用导入功能前需确认以下内容</div>
      </div>
      <div class="tg-body">
        <p>本服务是由个人开发者独立开发和运营的课表辅助工具，<strong>与西交利物浦大学官方不存在任何隶属、授权或合作关系</strong>。</p>
        <p>课表数据由你通过书签工具从 e-Bridge 页面自行提取并上传，本服务不会直接访问 e-Bridge 系统。<strong>课表数据以 e-Bridge 官方系统为准</strong>，本服务展示内容仅供个人参考，不得用于任何正式考勤、考试安排或法律用途。</p>
        <p>本服务启用 <strong>Cloudflare</strong> 提供安全防护，并通过 <strong>Cloudflare Web Analytics</strong>（无 Cookie、无跨站追踪）收集聚合访问统计数据。你主动提供的数据（邮箱、课表内容等）仅用于功能实现，不会出售或用于商业目的。</p>
        <p>你可以随时在"设置"页面注销账号并永久删除全部数据。</p>
        <router-link to="/terms" target="_blank" class="terms-link">查看完整用户协议与隐私政策 →</router-link>
      </div>
      <label class="tg-check">
        <input type="checkbox" v-model="agreedToTerms" />
        <span>我已阅读并同意上述<router-link to="/terms" target="_blank">用户协议与隐私政策</router-link></span>
      </label>
      <button
        class="btn btn-primary tg-btn"
        :disabled="!agreedToTerms"
        @click="acceptTerms"
      >
        同意并继续
      </button>
    </div>
  </div>

  <div v-else class="import-page">

    <div class="page-toolbar">
      <h1 class="page-title">导入课表</h1>
    </div>

    <!-- Step 1 -->
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-title">添加书签工具</div>
        <div class="step-desc">
          复制下方代码，在浏览器书签栏新建书签，将 URL 替换为复制的代码。只需做一次。
        </div>
        <div class="code-block">
          <div class="code-text">{{ BOOKMARKLET }}</div>
          <div class="code-fade" />
        </div>
        <button class="btn btn-secondary" @click="copyBookmarklet">
          {{ bookmarkCopied ? '✓ 已复制' : '复制书签代码' }}
        </button>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-title">在 e-Bridge 课表页运行书签</div>
        <div class="step-desc">
          登录 <code class="inline-code">ebridge.xjtlu.edu.cn</code>，打开课表页面，
          等课表加载完毕后点击书签，出现 "✓ HASH 已复制" 提示即成功。
        </div>
        <div class="notice notice-blue">
          书签直接从页面内的 iframe 元素读取链接，无需打开 DevTools。
        </div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-title">粘贴 HASH 并导入</div>
        <div class="input-row">
          <input
            v-model="hashInput"
            type="text"
            class="field-input hash-input"
            placeholder="粘贴 HASH（64位十六进制）或完整 URL"
            @keydown.enter="handleImport"
            :disabled="phase !== 'idle'"
          />
          <button
            class="btn btn-primary"
            :disabled="!hashInput.trim() || phase !== 'idle'"
            @click="handleImport"
          >
            {{ phaseLabel }}
          </button>
        </div>

        <div v-if="phase === 'fetching'" class="status-line msg-info">正在从 timetableplus 拉取数据…</div>
        <div v-if="phase === 'saving'" class="status-line msg-info">
          正在写入数据库… ({{ savedCount + skippedCount }}&thinsp;/&thinsp;{{ totalCount }})
        </div>
        <div v-if="error" class="status-line msg-error">{{ error }}</div>
        <div v-if="phase === 'done'" class="status-line msg-success">
          ✓ 导入完成：新增 {{ savedCount }} 条，跳过 {{ skippedCount }} 条（已存在）。即将跳转…
        </div>
      </div>
    </div>

    <!-- Warning -->
    <div class="notice notice-amber">
      ⚠ HASH 是课表的只读访问凭证，持有者无需登录即可查询你的课表。
      有效期由学校服务端控制，可能在学期结束或重新选课后失效。
    </div>

  </div>
</template>


<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// ── 协议门控 ──────────────────────────────────────────────────────────────
const TERMS_KEY = 'xjtlu_terms_v1'
const termsAccepted = ref(localStorage.getItem(TERMS_KEY) === '1')
const agreedToTerms = ref(false)
function acceptTerms() {
  localStorage.setItem(TERMS_KEY, '1')
  termsAccepted.value = true
}
import pb from '../lib/pocketbase'

const router = useRouter()

// ── 书签代码 ─────────────────────────────────────────────────────────────────
const BOOKMARKLET = `javascript:(function(){var f=document.getElementById('myFrame');var src=f&&(f.src||f.getAttribute('src'));if(!src){var frames=document.querySelectorAll('iframe');for(var i=0;i<frames.length;i++){if((frames[i].src||'').includes('timetableplus')){src=frames[i].src;break;}}}if(!src){alert('未找到课表框架\\n请确保：\\n1. 已登录 e-Bridge\\n2. 当前页面已展示课表（非空白）');return;}var m=src.match(/[#\\/]([0-9A-Fa-f]{40,})/);if(!m){alert('找到框架但无法提取 HASH，src: '+src.slice(0,80));return;}navigator.clipboard.writeText(m[1].toUpperCase()).then(function(){alert('✓ HASH 已复制到剪贴板\\n请切换到课表导入页面粘贴')}).catch(function(){prompt('请手动复制以下 HASH：',m[1].toUpperCase());});})();`

// ── 常量 ─────────────────────────────────────────────────────────────────────
const SCHEDULED_DAY_MAP = {
  '0': 'MON', '1': 'TUE', '2': 'WED', '3': 'THU',
  '4': 'FRI', '5': 'SAT', '6': 'SUN',
}

// ── 状态 ─────────────────────────────────────────────────────────────────────
const hashInput     = ref('')
const phase         = ref('idle') // idle | fetching | saving | done
const error         = ref('')
const savedCount    = ref(0)
const skippedCount  = ref(0)
const totalCount    = ref(0)
const bookmarkCopied = ref(false)

const phaseLabel = computed(() => {
  if (phase.value === 'fetching') return '获取中…'
  if (phase.value === 'saving')   return '保存中…'
  if (phase.value === 'done')     return '导入完成'
  return '获取并导入'
})

// ── 工具 ─────────────────────────────────────────────────────────────────────

function extractHash(input) {
  const s = (input || '').trim()
  const m = s.match(/[#/]([0-9A-Fa-f]{40,})/)
  if (m) return m[1].toUpperCase()
  if (/^[0-9A-Fa-f]{40,}$/.test(s)) return s.toUpperCase()
  return null
}

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
  const totalMin = hh * 60 + mm + 480 - subtractMinutes
  const ch = Math.floor(totalMin / 60) % 24
  const cm = totalMin % 60
  return `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`
}

function normalizeActivities(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => {
      if (!a) return null
      const startRaw    = a.startTime || a.start || ''
      const endRaw      = a.endTime   || a.end   || ''
      const nameRaw     = a.name      || ''
      const activityType = a.activityType || ''

      const day =
        SCHEDULED_DAY_MAP[String(a.scheduledDay)] ||
        (startRaw
          ? ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(startRaw).getDay()]
          : 'MON')

      const startTime = isoToCST(startRaw, 0)
      const endTime   = isoToCST(endRaw, 10)

      const m = nameRaw.match(/^([A-Z]+\d+)[-–]([^-–]+)[-–](.+)$/)
      const code    = m ? m[1] : (a.moduleId || nameRaw.split(/[-–]/)[0] || nameRaw)
      const section = m ? m[3].trim() : ''

      return {
        identity:      a.identity || a.id || '',
        code:          code.trim(),
        activity_type: activityType || (m ? m[2].trim() : ''),
        section,
        day,
        start_time:    startTime || '--:--',
        end_time:      endTime   || '--:--',
        location:      (a.location || '').trim(),
        staff:         (a.staff    || '').trim(),
        weeks:         a.weekPattern || a.week || '',
      }
    })
    .filter(Boolean)
}

async function copyBookmarklet() {
  try {
    await navigator.clipboard.writeText(BOOKMARKLET)
    bookmarkCopied.value = true
    setTimeout(() => (bookmarkCopied.value = false), 2000)
  } catch {
    alert('请手动复制书签代码')
  }
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
async function handleImport() {
  error.value       = ''
  savedCount.value  = 0
  skippedCount.value = 0
  totalCount.value  = 0

  const hash = extractHash(hashInput.value)
  if (!hash) {
    error.value = '无法识别 HASH，请粘贴剪贴板内容或完整 URL'
    return
  }

  phase.value = 'fetching'
  let rawList
  try {
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

  phase.value = 'saving'
  try {
    const userId = pb.authStore.model?.id
    if (!userId) throw new Error('未登录，请刷新页面重试')

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
      const label = `${userId.slice(0, 8)}-${Math.floor(Date.now() / 1000)}`
      timetable = await pb.collection('timetables').create({
        user:        userId,
        hash,
        label,
        visibility:  'private',
        last_synced: new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
      })
    }

    const existingCourses = await pb.collection('courses').getFullList({
      filter: `timetable = "${timetable.id}"`,
      fields: 'identity',
    })
    const existingIdentities = new Set(existingCourses.map((c) => c.identity))

    for (const act of activities) {
      if (act.identity && existingIdentities.has(act.identity)) {
        skippedCount.value++
        continue
      }
      await pb.collection('courses').create({
        timetable:     timetable.id,
        code:          act.code,
        activity_type: act.activity_type,
        section:       act.section,
        day:           act.day,
        start_time:    act.start_time,
        end_time:      act.end_time,
        location:      act.location,
        staff:         act.staff,
        weeks:         act.weeks,
        identity:      act.identity,
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
/* ── 协议门控 ────────────────────────────────────────────────────────────── */
.terms-gate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  background: var(--bg);
}
.terms-card {
  width: 100%;
  max-width: 520px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.tg-header {
  background: #18181A;
  padding: var(--sp-5) var(--sp-6);
}
.tg-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}
.tg-sub {
  font-size: var(--text-xs);
  color: #5A5850;
}
.tg-body {
  padding: var(--sp-5) var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  border-bottom: 1px solid var(--border);
}
.tg-body p {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.7;
  margin: 0;
}
.terms-link {
  font-size: var(--text-xs);
  color: var(--accent);
  text-decoration: none;
  margin-top: calc(-1 * var(--sp-1));
}
.terms-link:hover { text-decoration: underline; }
.tg-check {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-6);
  font-size: var(--text-sm);
  color: var(--text-2);
  cursor: pointer;
  line-height: 1.5;
}
.tg-check input { margin-top: 2px; flex-shrink: 0; cursor: pointer; }
.tg-check a { color: var(--accent); text-decoration: none; }
.tg-check a:hover { text-decoration: underline; }
.tg-btn {
  width: calc(100% - var(--sp-6) * 2);
  margin: 0 var(--sp-6) var(--sp-5);
  justify-content: center;
  padding: 9px;
}

/* ── 正文 ─────────────────────────────────────────────────────────────────── */
.import-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-10);
}

.page-toolbar {
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Steps */
.step {
  display: flex;
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
}

.step-num {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--surface);
  background: var(--text);
  border-radius: 2px;
  margin-top: 1px;
}

.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.step-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.7;
}

/* Bookmarklet code block */
.code-block {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: var(--sp-3);
  position: relative;
  max-height: 56px;
  overflow: hidden;
}
.code-text {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-2);
  word-break: break-all;
  line-height: 1.55;
}
.code-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 22px;
  background: linear-gradient(transparent, var(--surface-2));
  pointer-events: none;
}

/* Inline code */
.inline-code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 2px;
  color: var(--text);
}

/* Input row */
.input-row {
  display: flex;
  gap: var(--sp-2);
}
.hash-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.status-line {
  margin-top: var(--sp-1);
  line-height: 1.5;
}

/* Notice boxes */
.notice {
  font-size: var(--text-sm);
  border-radius: 3px;
  padding: 9px 13px;
  line-height: 1.65;
  border: 1px solid;
}
.notice-blue {
  color: var(--blue);
  background: var(--blue-bg);
  border-color: #A8C8EA;
}
.notice-amber {
  color: var(--amber);
  background: var(--amber-bg);
  border-color: #E0C878;
  margin-top: var(--sp-4);
}
</style>
