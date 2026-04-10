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
        <div class="step-title">添加书签工具 <span class="step-once">只需做一次</span></div>

        <!-- 方法一：拖拽 -->
        <div class="method-block">
          <div class="method-label">方法一：拖拽（推荐）</div>
          <p class="step-desc">将下方按钮直接拖到浏览器顶部的书签栏即可。</p>
          <a
            :href="BOOKMARKLET"
            class="btn btn-secondary drag-btn"
            draggable="true"
            @click.prevent
          >⚙ 课表书签工具</a>
          <p class="step-hint">
            看不到书签栏？按
            <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
            <span class="hint-sep">（Mac：</span>
            <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
            <span class="hint-sep">）</span>
            显示。
          </p>
        </div>

        <!-- 方法二：手动 -->
        <div class="method-block">
          <div class="method-label">方法二：手动添加</div>
          <ol class="step-ol">
            <li>点击下方"复制书签代码"按钮</li>
            <li>在书签栏空白处<strong>右键 → 添加书签</strong>（Edge 显示为"添加网页"）</li>
            <li>名称随意填写，如"课表书签"</li>
            <li>将地址/URL 栏内容<strong>全部清空</strong>，然后粘贴刚才复制的代码</li>
            <li>点击保存</li>
          </ol>
          <div class="code-block">
            <div class="code-text">{{ BOOKMARKLET }}</div>
            <div class="code-fade" />
          </div>
          <button class="btn btn-secondary" @click="copyBookmarklet">
            {{ bookmarkCopied ? '✓ 已复制' : '复制书签代码' }}
          </button>
        </div>

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
          在 e-Bridge 左侧导航栏点击 <strong>Timetable</strong>，进入 <strong>My Personal Class Timetable</strong> 页面，等待课表完整加载后再点击书签。若提示"未找到课表框架"，请确认课表区域已显示具体课程安排后重试。
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
        <div v-if="phase === 'saving' && isReimport" class="status-line msg-info">
          检测到已有相同课表，正在同步更新… ({{ savedCount + skippedCount }}&thinsp;/&thinsp;{{ totalCount }})
        </div>
        <div v-else-if="phase === 'saving'" class="status-line msg-info">
          正在写入数据库… ({{ savedCount + skippedCount }}&thinsp;/&thinsp;{{ totalCount }})
        </div>
        <div v-if="error" class="status-line msg-error">{{ error }}</div>
        <div v-if="phase === 'done' && isReimport" class="status-line msg-success">
          ✓ 同步完成：新增 {{ savedCount }} 条，已跳过 {{ skippedCount }} 条（无变化）。即将跳转…
        </div>
        <div v-else-if="phase === 'done'" class="status-line msg-success">
          ✓ 导入完成：新增 {{ savedCount }} 条，跳过 {{ skippedCount }} 条（已存在）。即将跳转…
        </div>
      </div>
    </div>

    <!-- Warning -->
    <div class="notice notice-amber">
      <strong>关于 HASH 的安全说明</strong><br>
      HASH 是由学校服务器签发的课表只读访问凭证，任何持有该凭证的人无需登录即可读取你的完整课表内容。
      请妥善保管，避免公开分享至不受信任的渠道。<br><br>
      本服务在导入课表时，会将 HASH 关联保存到你的账号，以便日后在课表有变动时手动触发更新。
      HASH 仅用于从学校服务器拉取你的课表数据，不用于任何其他用途，且仅你本人可访问。<br><br>
      HASH 的有效期由学校服务端控制，通常在每学期选课结束后失效，届时需重新运行书签获取新凭证。
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
import { normalizeActivities } from '../utils/timetableSync'

const router = useRouter()

// ── 书签代码 ─────────────────────────────────────────────────────────────────
const BOOKMARKLET = `javascript:(function(){var f=document.getElementById('myFrame');var src=f&&(f.src||f.getAttribute('src'));if(!src){var frames=document.querySelectorAll('iframe');for(var i=0;i<frames.length;i++){if((frames[i].src||'').includes('timetableplus')){src=frames[i].src;break;}}}if(!src){alert('未找到课表框架\\n请确保：\\n1. 已登录 e-Bridge\\n2. 当前页面已展示课表（非空白）');return;}var m=src.match(/[#\\/]([0-9A-Fa-f]{40,})/);if(!m){alert('找到框架但无法提取 HASH，src: '+src.slice(0,80));return;}navigator.clipboard.writeText(m[1].toUpperCase()).then(function(){alert('✓ HASH 已复制到剪贴板\\n请切换到课表导入页面粘贴')}).catch(function(){prompt('请手动复制以下 HASH：',m[1].toUpperCase());});})();`

// ── 状态 ─────────────────────────────────────────────────────────────────────
const hashInput     = ref('')
const phase         = ref('idle') // idle | fetching | saving | done
const error         = ref('')
const savedCount    = ref(0)
const skippedCount  = ref(0)
const totalCount    = ref(0)
const bookmarkCopied = ref(false)
const isReimport    = ref(false)

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
  isReimport.value  = false

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
      isReimport.value = true
      await pb.collection('timetables').update(timetable.id, {
        last_synced: new Date().toISOString(),
      })
    } else {
      const label = `${userId.slice(0, 8)}-${Math.floor(Date.now() / 1000)}`
      timetable = await pb.collection('timetables').create({
        user:        userId,
        hash,
        label,
        visibility:  'private',
        last_synced: new Date().toISOString(),
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
  max-width: 700px;
  margin: 0 auto;
  padding: 28px 32px 48px;
}

@media (max-width: 768px) {
  .import-page { padding: 20px 16px 40px; }
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
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.step-once {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 7px;
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.7;
  margin: 0;
}

/* Method blocks */
.method-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.method-label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.drag-btn {
  align-self: flex-start;
  cursor: grab;
  user-select: none;
}
.drag-btn:active { cursor: grabbing; }
.step-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin: 0;
  line-height: 1.6;
}
.hint-sep { color: var(--text-3); }
kbd {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 1.8;
  color: var(--text-2);
}
.step-ol {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step-ol li {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.6;
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
