<template>
  <div class="settings-page">

    <div class="page-toolbar">
      <h1 class="page-title">设置</h1>
    </div>

    <div class="settings-grid">

    <!-- 账号信息 -->
    <section class="settings-section">
      <h2 class="section-title">账号</h2>
      <div class="info-row">
        <span class="info-label">邮箱</span>
        <span class="info-value">{{ authStore.model?.email }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">昵称</span>
        <div class="nickname-field">
          <template v-if="!editingNickname">
            <span class="info-value nickname-val">{{ authStore.model?.nickname || authStore.model?.name || '—' }}</span>
            <button class="btn btn-secondary btn-sm" @click="startNickname">修改</button>
          </template>
          <template v-else>
            <div class="nickname-input-wrap">
              <input
                v-model="nicknameInput"
                class="field-input nickname-input"
                maxlength="30"
                placeholder="输入昵称"
                @keydown.enter="saveNickname"
                @keydown.escape="cancelNickname"
              />
              <span class="char-count" :class="{ 'char-count-warn': nicknameInput.length >= 25 }">
                {{ nicknameInput.length }}/30
              </span>
            </div>
            <button class="btn btn-primary btn-sm" :disabled="nicknameSaving" @click="saveNickname">
              {{ nicknameSaving ? '…' : '保存' }}
            </button>
            <button class="btn btn-secondary btn-sm" :disabled="nicknameSaving" @click="cancelNickname">取消</button>
          </template>
        </div>
      </div>
      <p v-if="nicknameError" class="msg-error">{{ nicknameError }}</p>
      <div class="info-row">
        <span class="info-label">用户名</span>
        <span class="info-value">{{ authStore.model?.name }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">好友码</span>
        <div class="code-row">
          <span class="info-value">{{ authStore.model?.id }}</span>
          <button class="btn btn-secondary btn-sm" @click="copyFriendCode">
            {{ friendCodeCopied ? '✓ 已复制' : '复制' }}
          </button>
          <router-link to="/friends" class="btn btn-secondary btn-sm">管理好友</router-link>
        </div>
      </div>
    </section>

    <!-- iCal 订阅 -->
    <section class="settings-section">
      <h2 class="section-title">iCal 课表订阅</h2>
      <p class="section-desc">将课表订阅到 Apple Calendar、Google Calendar 或任意支持 iCal 的日历应用，课表变动自动同步。</p>

      <div v-if="icalLoading" class="state-msg">加载中…</div>
      <div v-else-if="icalError" class="state-msg state-error">{{ icalError }}</div>

      <template v-else>
        <!-- 已有 token -->
        <template v-if="icalUrl">
          <div class="url-row">
            <input :value="icalUrl" readonly class="field-input url-input" @click="copyUrl" title="点击复制" />
            <button class="btn btn-secondary url-copy-btn" @click="copyUrl">
              {{ copied ? '✓ 已复制' : '复制' }}
            </button>
          </div>

          <p class="ical-warn">此链接包含你的专属访问凭证，请勿截图发布或分享给他人。</p>

          <div class="action-row">
            <a v-if="isProduction" :href="webcalUrl" class="btn btn-primary">
              在日历 App 中订阅
            </a>
            <a v-else :href="icalUrl" download="timetable.ics" class="btn btn-primary">
              下载 .ics 文件
            </a>
            <button class="btn btn-danger" @click="resetToken">重置链接</button>
          </div>

          <div class="instructions">
            <template v-if="isProduction">
              <p><strong>订阅方式：</strong></p>
              <ol>
                <li>点击上方按钮，系统会用默认日历 App 打开（支持 Apple Calendar、Outlook、Fantastical 等）</li>
                <li>或在日历 App 中手动新建订阅，粘贴上方 URL</li>
              </ol>
              <p class="mt"><strong>Google Calendar：</strong>不支持 webcal:// 链接，请在设置 → 通过 URL 添加日历中粘贴上方 URL。
              </p>
            </template>
            <template v-else>
              <p><strong>本地开发模式：</strong>订阅链接无法通过 webcal:// 使用（Apple Calendar 不允许访问 localhost）。</p>
              <p>点击上方按钮下载 .ics 文件，然后双击导入 Calendar。</p>
              <p>部署到生产环境后可直接使用订阅链接。</p>
            </template>
          </div>

          <!-- iCal 访问记录 -->
          <div class="ical-logs">
            <div class="ical-logs-header">
              <span class="ical-logs-title">最近访问记录</span>
              <span v-if="accessLogs.length" class="logs-stats">
                共 {{ logStats.total }} 次 · {{ logStats.sources }} 个来源
              </span>
            </div>
            <div v-if="accessLogsLoading" class="state-msg">加载中…</div>
            <div v-else-if="accessLogs.length === 0" class="state-msg">暂无访问记录</div>
            <div v-else class="logs-grouped">
              <div v-for="g in groupedLogs" :key="g.ip" class="log-row">
                <span class="log-ip-chip">{{ g.ip }}</span>
                <span class="log-country-name">{{ fmtCountry(g.country) }}</span>
                <span class="log-count-badge">{{ g.count }} 次</span>
                <span class="log-latest">{{ fmtLogDate(g.latest) }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 尚未生成 -->
        <template v-else>
          <p class="section-desc">尚未生成订阅链接。</p>
          <button class="btn btn-primary" @click="generateToken">生成订阅链接</button>
        </template>
      </template>
    </section>

    <!-- 邀请码 -->
    <section v-if="authStore.model?.can_invite" class="settings-section">
      <h2 class="section-title">邀请码</h2>

      <template v-if="authStore.model?.can_invite">
        <div class="invite-quota-row">
          <span class="invite-quota-label">可创建</span>
          <span class="invite-quota-val">{{ inviteQuotaLeft }}</span>
          <span class="invite-quota-hint" v-if="inviteSettings.validity_days || inviteSettings.max_uses">
            （有效期 {{ inviteSettings.validity_days || '不限' }} 天 · 最多使用 {{ inviteSettings.max_uses || '不限' }} 次）
          </span>
        </div>

        <button
          class="btn btn-primary"
          :disabled="inviteCreating || inviteQuotaExhausted"
          @click="createMyInvite"
        >
          {{ inviteCreating ? '生成中…' : '生成邀请码' }}
        </button>

        <p v-if="inviteCreateError" class="msg-error">{{ inviteCreateError }}</p>

        <div v-if="myInvites.length > 0" class="invite-list">
          <div
            v-for="inv in myInvites"
            :key="inv.id"
            class="invite-item"
            :class="{ 'invite-inactive': !inv.is_active }"
          >
            <span class="invite-item-code">{{ inv.code }}</span>
            <span class="invite-item-meta">
              {{ inv.uses }}/{{ inv.max_uses || '∞' }} 次
              <template v-if="inv.expires_at"> · {{ inv.expires_at.slice(0, 10) }} 到期</template>
            </span>
            <span class="invite-item-status">{{ inv.is_active ? '有效' : '已停用' }}</span>
            <button class="btn btn-secondary btn-xs" @click="copyInvite(inv.code)">复制</button>
          </div>
        </div>
        <p v-else-if="!inviteCreating && inviteLoaded" class="section-desc">暂无邀请码，点击上方按钮生成。</p>
      </template>

    </section>

    <!-- 修改密码 -->
    <section class="settings-section">
      <h2 class="section-title">修改密码</h2>
      <div class="field-group">
        <label class="field-label">当前密码</label>
        <div class="pwd-wrap">
          <input v-model="oldPwd" :type="showOldPwd ? 'text' : 'password'" class="field-input" autocomplete="current-password" />
          <button type="button" class="pwd-toggle" @click="showOldPwd = !showOldPwd">{{ showOldPwd ? '隐藏' : '显示' }}</button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">新密码</label>
        <div class="pwd-wrap">
          <input v-model="newPwd" :type="showNewPwd ? 'text' : 'password'" class="field-input" autocomplete="new-password" />
          <button type="button" class="pwd-toggle" @click="showNewPwd = !showNewPwd">{{ showNewPwd ? '隐藏' : '显示' }}</button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">确认新密码</label>
        <div class="pwd-wrap">
          <input v-model="newPwdConfirm" :type="showNewPwdConfirm ? 'text' : 'password'" class="field-input" autocomplete="new-password" />
          <button type="button" class="pwd-toggle" @click="showNewPwdConfirm = !showNewPwdConfirm">{{ showNewPwdConfirm ? '隐藏' : '显示' }}</button>
        </div>
      </div>
      <p v-if="pwdError"   class="msg-error">{{ pwdError }}</p>
      <p v-if="pwdSuccess" class="msg-success">{{ pwdSuccess }}</p>
      <button class="btn btn-primary" :disabled="pwdLoading" @click="changePassword">
        {{ pwdLoading ? '保存中…' : '保存新密码' }}
      </button>
    </section>

    <!-- 账号操作 -->
    <section class="settings-section">
      <h2 class="section-title">账号操作</h2>
      <div class="action-row">
        <button class="btn btn-secondary" :disabled="exporting" @click="exportData">
          {{ exporting ? '导出中…' : '导出我的数据' }}
        </button>
        <button class="btn btn-danger" @click="authStore.logout">退出登录</button>
        <button class="btn btn-danger" @click="showDeleteConfirm = true" :disabled="deleting">
          注销账号
        </button>
      </div>
      <p v-if="exportError" class="msg-error">{{ exportError }}</p>

      <!-- 注销确认 -->
      <Transition name="confirm-bar">
        <div v-if="showDeleteConfirm" class="delete-confirm">
          <p class="delete-warn">
            <strong>此操作不可撤回。</strong>
            你的账号、所有课表、课程、好友关系及 iCal 令牌将被永久删除。
          </p>
          <p v-if="deleteError" class="msg-error">{{ deleteError }}</p>
          <div class="delete-btns">
            <button class="btn btn-danger" :disabled="deleting" @click="deleteAccount">
              {{ deleting ? '删除中…' : '确认永久注销' }}
            </button>
            <button class="btn btn-secondary" :disabled="deleting" @click="showDeleteConfirm = false">
              取消
            </button>
          </div>
        </div>
      </Transition>

      <router-link to="/terms" class="terms-footer-link">用户协议与隐私政策</router-link>
    </section>

    </div><!-- end .settings-grid -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import pb from '../lib/pocketbase'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// ── 邀请码 ────────────────────────────────────────────────────────────────
const myInvites        = ref([])
const inviteLoaded     = ref(false)
const inviteCreating   = ref(false)
const inviteCreateError = ref('')

const inviteSettings = computed(() => ({
  validity_days: authStore.model?.invite_validity_days || 0,
  max_uses:      authStore.model?.invite_max_uses      || 0,
}))

const inviteQuotaLeft = computed(() => {
  const quota = authStore.model?.invite_quota || 0
  const used  = myInvites.value.length
  if (quota === 0) return `已创建 ${used} 个（不限上限）`
  return `${used} / ${quota} 个`
})

const inviteQuotaExhausted = computed(() => {
  const quota = authStore.model?.invite_quota || 0
  return quota > 0 && myInvites.value.length >= quota
})

async function loadMyInvites() {
  if (!authStore.model?.can_invite) return
  try {
    myInvites.value = await pb.collection('invite_codes').getFullList({
      sort: '-created',
      requestKey: null,
    })
  } catch { /* ignore */ } finally {
    inviteLoaded.value = true
  }
}

function _randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function createMyInvite() {
  inviteCreateError.value = ''
  inviteCreating.value = true
  try {
    const record = await pb.collection('invite_codes').create(
      { code: _randomCode() },
      { requestKey: null }
    )
    myInvites.value.unshift(record)
  } catch (e) {
    inviteCreateError.value = e.message || '生成失败，请重试'
  } finally {
    inviteCreating.value = false
  }
}

async function deleteMyInvite(inv) {
  if (!confirm(`删除邀请码「${inv.code}」？`)) return
  try {
    await pb.collection('invite_codes').delete(inv.id, { requestKey: null })
    myInvites.value = myInvites.value.filter(x => x.id !== inv.id)
  } catch (e) {
    inviteCreateError.value = e.message
  }
}

async function copyInvite(code) {
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    prompt('复制邀请码：', code)
  }
}

// ── 昵称 ──────────────────────────────────────────────────────────────────
const editingNickname = ref(false)
const nicknameInput   = ref('')
const nicknameSaving  = ref(false)
const nicknameError   = ref('')

function startNickname() {
  nicknameInput.value = authStore.model?.nickname || ''
  editingNickname.value = true
  nicknameError.value = ''
}

function cancelNickname() {
  editingNickname.value = false
  nicknameError.value = ''
}

async function saveNickname() {
  nicknameSaving.value = true
  nicknameError.value = ''
  const value = nicknameInput.value.trim()
  try {
    await pb.collection('users').update(
      authStore.model.id,
      { nickname: value },
      { requestKey: null }
    )
    // Directly update the local auth store so Vue reactivity triggers immediately
    pb.authStore.save(pb.authStore.token, { ...pb.authStore.model, nickname: value })
    editingNickname.value = false
  } catch (e) {
    nicknameError.value = e.message
  } finally {
    nicknameSaving.value = false
  }
}

// ── 好友码 ────────────────────────────────────────────────────────────────
const friendCodeCopied = ref(false)
async function copyFriendCode() {
  try {
    await navigator.clipboard.writeText(authStore.model?.id ?? '')
    friendCodeCopied.value = true
    setTimeout(() => { friendCodeCopied.value = false }, 2000)
  } catch {
    prompt('请手动复制好友码：', authStore.model?.id ?? '')
  }
}

// ── 修改密码 ──────────────────────────────────────────────────────────────
const oldPwd       = ref('')
const newPwd       = ref('')
const newPwdConfirm = ref('')
const pwdLoading   = ref(false)
const pwdError     = ref('')
const pwdSuccess   = ref('')
const showOldPwd        = ref(false)
const showNewPwd        = ref(false)
const showNewPwdConfirm = ref(false)

async function changePassword() {
  pwdError.value   = ''
  pwdSuccess.value = ''
  if (!oldPwd.value || !newPwd.value) {
    pwdError.value = '请填写所有密码字段'
    return
  }
  if (newPwd.value !== newPwdConfirm.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (newPwd.value.length < 8) {
    pwdError.value = '新密码至少 8 位'
    return
  }
  pwdLoading.value = true
  try {
    const email = authStore.model.email
    await pb.collection('users').update(
      authStore.model.id,
      { oldPassword: oldPwd.value, password: newPwd.value, passwordConfirm: newPwdConfirm.value, must_change_pwd: false },
      { requestKey: null }
    )
    // Re-authenticate with new password so the session stays valid
    await pb.collection('users').authWithPassword(email, newPwd.value, { requestKey: null })
    pwdSuccess.value = '密码已更新 ✓'
    oldPwd.value = ''
    newPwd.value = ''
    newPwdConfirm.value = ''
    setTimeout(() => { pwdSuccess.value = '' }, 3000)
  } catch (e) {
    pwdError.value = e.message
  } finally {
    pwdLoading.value = false
  }
}

const icalToken        = ref(null)
const icalLoading      = ref(true)
const icalError        = ref('')
const copied           = ref(false)
const accessLogs       = ref([])
const accessLogsLoading = ref(false)

const PROD_BASE = 'https://timetable.xjtlu.uk'

const icalUrl = computed(() => {
  if (!icalToken.value) return ''
  const base = import.meta.env.DEV
    ? `http://localhost:8091`
    : PROD_BASE
  return `${base}/ical/${icalToken.value.token}/timetable.ics`
})

const isProduction = !import.meta.env.DEV
const webcalUrl = computed(() =>
  icalUrl.value.replace(/^https?:/, 'webcal:')
)

async function loadAccessLogs() {
  accessLogsLoading.value = true
  try {
    const res = await pb.collection('ical_access_logs').getList(1, 50, {
      sort: '-created',
      requestKey: null,
    })
    accessLogs.value = res.items
  } catch { accessLogs.value = [] } finally {
    accessLogsLoading.value = false
  }
}

const groupedLogs = computed(() => {
  const map = {}
  for (const log of accessLogs.value) {
    const key = log.ip_prefix || '未知'
    if (!map[key]) {
      map[key] = { ip: key, country: log.country, count: 0, latest: log.created }
    }
    map[key].count++
    if (log.created > map[key].latest) map[key].latest = log.created
  }
  return Object.values(map).sort((a, b) => b.latest.localeCompare(a.latest))
})

const logStats = computed(() => ({
  total:   accessLogs.value.length,
  sources: new Set(accessLogs.value.map(l => l.ip_prefix || '未知')).size,
}))

const countryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
function fmtCountry(code) {
  if (!code) return '—'
  try { return countryNames.of(code) || code } catch { return code }
}

function fmtLogDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(async () => {
  // 刷新用户信息，确保 can_invite 等字段是最新值
  try { await pb.collection('users').authRefresh({ requestKey: null }) } catch { /* ignore */ }
  loadMyInvites()
  try {
    const records = await pb.collection('ical_tokens').getFullList({
      requestKey: null,
    })
    if (records.length > 0) {
      icalToken.value = records[0]
      loadAccessLogs()
    }
  } catch (e) {
    icalError.value = e.message
  } finally {
    icalLoading.value = false
  }
})

function randomHex32() {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
}

async function generateToken() {
  icalLoading.value = true
  icalError.value = ''
  try {
    const record = await pb.collection('ical_tokens').create({
      user:  authStore.model.id,
      token: randomHex32(),
    }, { requestKey: null })
    icalToken.value = record
    accessLogs.value = []  // 重置后旧日志清空
  } catch (e) {
    icalError.value = e.message
  } finally {
    icalLoading.value = false
  }
}

async function resetToken() {
  if (!icalToken.value) return
  if (!confirm('重置后旧链接将立即失效，是否继续？')) return

  icalLoading.value = true
  icalError.value = ''
  try {
    await pb.collection('ical_tokens').delete(icalToken.value.id, { requestKey: null })
    icalToken.value = null
    await generateToken()
  } catch (e) {
    icalError.value = e.message
    icalLoading.value = false
  }
}

// ── 导出数据 ──────────────────────────────────────────────────────────────
const exporting   = ref(false)
const exportError = ref('')

async function exportData() {
  exporting.value = true
  exportError.value = ''
  try {
    const userId = authStore.model.id
    const timetables = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`, requestKey: null,
    })
    const allCourses = []
    for (const tt of timetables) {
      const courses = await pb.collection('courses').getFullList({
        filter: `timetable = "${tt.id}"`, requestKey: null,
      })
      allCourses.push(...courses.map(c => ({ ...c, timetable_label: tt.label })))
    }
    const payload = {
      exported_at: new Date().toISOString(),
      user: { id: authStore.model.id, email: authStore.model.email, nickname: authStore.model.nickname },
      timetables: timetables.map(({ id, label, hash, visibility, last_synced, created }) =>
        ({ id, label, hash, visibility, last_synced, created })
      ),
      courses: allCourses.map(({ id, timetable, timetable_label, code, activity_type, section, day, start_time, end_time, location, staff, weeks }) =>
        ({ id, timetable, timetable_label, code, activity_type, section, day, start_time, end_time, location, staff, weeks })
      ),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xjtlu-timetable-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e.message || '导出失败，请重试'
  } finally {
    exporting.value = false
  }
}

// ── 注销账号 ──────────────────────────────────────────────────────────────
const showDeleteConfirm = ref(false)
const deleting    = ref(false)
const deleteError = ref('')

async function deleteAccount() {
  deleting.value = true
  deleteError.value = ''
  try {
    const userId = authStore.model.id

    // 1. 删除 ical_tokens
    const tokens = await pb.collection('ical_tokens').getFullList({ requestKey: null })
    await Promise.all(tokens.map(t => pb.collection('ical_tokens').delete(t.id, { requestKey: null })))

    // 2. 删除 friendships（双向）
    const friendships = await pb.collection('friendships').getFullList({ requestKey: null })
    await Promise.all(friendships.map(f => pb.collection('friendships').delete(f.id, { requestKey: null })))

    // 3. 删除课程和课表
    const timetables = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`, requestKey: null,
    })
    for (const tt of timetables) {
      const courses = await pb.collection('courses').getFullList({
        filter: `timetable = "${tt.id}"`, requestKey: null,
      })
      await Promise.all(courses.map(c => pb.collection('courses').delete(c.id, { requestKey: null })))
      await pb.collection('timetables').delete(tt.id, { requestKey: null })
    }

    // 4. 删除用户账号
    await pb.collection('users').delete(userId, { requestKey: null })

    // 5. 登出并清除本地存储
    localStorage.removeItem('xjtlu_terms_v1')
    authStore.logout()
  } catch (e) {
    deleteError.value = e.message || '注销失败，请重试或联系管理员'
    deleting.value = false
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(icalUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const input = document.querySelector('.url-input')
    if (input) { input.select(); document.execCommand('copy') }
  }
}
</script>

<style scoped>
.settings-page {
  padding: 28px 32px 40px;
}

@media (max-width: 768px) {
  .settings-page { padding: 20px 16px 32px; }
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

/* Two-column masonry */
.settings-grid {
  columns: 2;
  column-gap: 28px;
}
.settings-section {
  break-inside: avoid;
  margin-bottom: 20px;
}

@media (max-width: 900px) {
  .settings-grid { columns: 1; }
}

/* Section cards */
.settings-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.65;
  margin-top: -var(--sp-1);
}

/* Info row */
.info-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.info-label {
  font-size: var(--text-sm);
  color: var(--text-3);
  width: 52px;
  flex-shrink: 0;
}
.info-value {
  font-size: var(--text-sm);
  color: var(--text);
  font-family: var(--font-mono);
}
.nickname-val {
  font-family: var(--font-sans);
}
.nickname-field {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
  min-width: 0;
}
.nickname-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.nickname-input {
  width: 100%;
  padding-right: 44px;
}
.char-count {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--text-3);
  pointer-events: none;
  font-family: var(--font-mono);
}
.char-count-warn { color: var(--amber); }
.code-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.btn-sm {
  padding: 4px 10px;
  font-size: var(--text-xs);
  text-decoration: none;
}

/* URL row */
.url-row {
  display: flex;
  gap: var(--sp-2);
  align-items: stretch;
}
.url-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-2);
  background: var(--surface-2);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.url-copy-btn {
  flex-shrink: 0;
}

/* Action row */
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

/* Instructions */
.instructions {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: var(--sp-4);
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.75;
}
.instructions p { margin: 0; }
.instructions p.mt { margin-top: var(--sp-3); }
.instructions ol {
  margin: var(--sp-2) 0 0;
  padding-left: 18px;
}
.instructions li { margin-bottom: 3px; }

/* iCal warning */
.ical-warn {
  font-size: var(--text-xs);
  color: #D97706;
  margin: 0;
  line-height: 1.5;
}

/* iCal access logs */
.ical-logs {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.ical-logs-header {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}
.ical-logs-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.logs-stats {
  font-size: var(--text-xs);
  color: var(--text-3);
}
.logs-grouped {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.log-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.log-row:last-child { border-bottom: none; }
.log-ip-chip {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-2, #2A2A2E);
  color: var(--text);
  padding: 2px 7px;
  border-radius: 3px;
  white-space: nowrap;
}
.log-country-name {
  font-size: var(--text-sm);
  color: var(--text-2);
  flex: 1;
  min-width: 40px;
}
.log-count-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-3);
  white-space: nowrap;
}
.log-latest {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-3);
  white-space: nowrap;
}

/* Password field with toggle */
.pwd-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.pwd-wrap .field-input {
  flex: 1;
  padding-right: 52px;
}
.pwd-toggle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  padding: 0 10px;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.12s;
}
.pwd-toggle:hover { color: var(--accent); }

/* Delete account */
.delete-confirm {
  padding: var(--sp-4);
  background: var(--red-bg);
  border: 1px solid #E5B4AF;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.delete-warn {
  font-size: var(--text-sm);
  color: var(--red);
  line-height: 1.6;
  margin: 0;
}
.delete-btns {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.confirm-bar-enter-active { transition: opacity 0.15s, transform 0.15s; }
.confirm-bar-leave-active { transition: opacity 0.15s; }
.confirm-bar-enter-from  { opacity: 0; transform: translateY(-4px); }
.confirm-bar-leave-to    { opacity: 0; }

.terms-footer-link {
  font-size: var(--text-xs);
  color: var(--text-3);
  text-decoration: none;
  margin-top: var(--sp-1);
  align-self: flex-start;
}
.terms-footer-link:hover { color: var(--accent); }

/* State messages */
.state-msg {
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }

/* Invite codes */
.invite-quota-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.invite-quota-label {
  font-size: var(--text-sm);
  color: var(--text-3);
}
.invite-quota-val {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}
.invite-quota-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.invite-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 8px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  flex-wrap: wrap;
}
.invite-inactive {
  opacity: 0.55;
}
.invite-item-code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text);
  flex-shrink: 0;
}
.invite-item-meta {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-family: var(--font-mono);
}
.invite-item-status {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-left: auto;
}
</style>
