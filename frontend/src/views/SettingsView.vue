<template>
  <div class="settings-page">

    <div class="page-toolbar">
      <h1 class="page-title">设置</h1>
    </div>

    <!-- 账号信息 -->
    <section class="settings-section">
      <h2 class="section-title">账号</h2>
      <div class="info-row">
        <span class="info-label">邮箱</span>
        <span class="info-value">{{ authStore.model?.email }}</span>
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
            <input :value="icalUrl" readonly class="field-input url-input" />
            <button class="btn btn-secondary" @click="copyUrl">
              {{ copied ? '✓ 已复制' : '复制' }}
            </button>
          </div>

          <div class="action-row">
            <a v-if="isProduction" :href="webcalUrl" class="btn btn-primary">
              添加到 Apple Calendar
            </a>
            <a v-else :href="icalUrl" download="timetable.ics" class="btn btn-primary">
              下载 .ics 文件
            </a>
            <button class="btn btn-danger" @click="resetToken">重置链接</button>
          </div>

          <div class="instructions">
            <template v-if="isProduction">
              <p><strong>订阅方式（自动更新）：</strong></p>
              <ol>
                <li>点击上方 "添加到 Apple Calendar" 按钮</li>
                <li>或打开 Calendar → 文件 → 新建日历订阅，粘贴上方 URL</li>
                <li>刷新频率建议设为 "每小时"</li>
              </ol>
              <p class="mt"><strong>Google Calendar：</strong>
                设置 → 通过 URL 添加日历 → 粘贴上方 URL
              </p>
            </template>
            <template v-else>
              <p><strong>本地开发模式：</strong>订阅链接无法通过 webcal:// 使用（Apple Calendar 不允许访问 localhost）。</p>
              <p>点击上方按钮下载 .ics 文件，然后双击导入 Calendar。</p>
              <p>部署到生产环境后可直接使用订阅链接。</p>
            </template>
          </div>
        </template>

        <!-- 尚未生成 -->
        <template v-else>
          <p class="section-desc">尚未生成订阅链接。</p>
          <button class="btn btn-primary" @click="generateToken">生成订阅链接</button>
        </template>
      </template>
    </section>

    <!-- 修改密码 -->
    <section class="settings-section">
      <h2 class="section-title">修改密码</h2>
      <div class="field-group">
        <label class="field-label">当前密码</label>
        <input v-model="oldPwd" type="password" class="field-input" autocomplete="current-password" />
      </div>
      <div class="field-group">
        <label class="field-label">新密码</label>
        <input v-model="newPwd" type="password" class="field-input" autocomplete="new-password" />
      </div>
      <div class="field-group">
        <label class="field-label">确认新密码</label>
        <input v-model="newPwdConfirm" type="password" class="field-input" autocomplete="new-password" />
      </div>
      <p v-if="pwdError"   class="msg-error">{{ pwdError }}</p>
      <p v-if="pwdSuccess" class="msg-success">{{ pwdSuccess }}</p>
      <button class="btn btn-primary" :disabled="pwdLoading" @click="changePassword">
        {{ pwdLoading ? '保存中…' : '保存新密码' }}
      </button>
    </section>

    <!-- 危险操作 -->
    <section class="settings-section">
      <h2 class="section-title">账号操作</h2>
      <button class="btn btn-danger" @click="authStore.logout">退出登录</button>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import pb from '../lib/pocketbase'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

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
    await pb.collection('users').update(
      authStore.model.id,
      { oldPassword: oldPwd.value, password: newPwd.value, passwordConfirm: newPwdConfirm.value },
      { requestKey: null }
    )
    pwdSuccess.value = '密码已更新，请重新登录。'
    oldPwd.value = ''
    newPwd.value = ''
    newPwdConfirm.value = ''
    // PocketBase invalidates token after password change — log out
    setTimeout(() => authStore.logout(), 1500)
  } catch (e) {
    pwdError.value = e.message
  } finally {
    pwdLoading.value = false
  }
}

const icalToken   = ref(null)
const icalLoading = ref(true)
const icalError   = ref('')
const copied      = ref(false)

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

onMounted(async () => {
  try {
    const records = await pb.collection('ical_tokens').getFullList({
      requestKey: null,
    })
    if (records.length > 0) icalToken.value = records[0]
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
  max-width: 560px;
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

/* Section */
.settings-section {
  padding: var(--sp-5) 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.settings-section:last-child { border-bottom: none; }

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
  width: 44px;
  flex-shrink: 0;
}
.info-value {
  font-size: var(--text-sm);
  color: var(--text);
  font-family: var(--font-mono);
}
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
}
.url-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-2);
  background: var(--surface-2);
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

/* State messages */
.state-msg {
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }
</style>
