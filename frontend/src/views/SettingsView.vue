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
          <!-- Token 吊销 / 泄露警告横幅 -->
          <div v-if="icalToken?.is_revoked" class="ical-alert-banner ical-alert-revoked">
            <span>🔴 <strong>订阅链接已被自动吊销：</strong>由于安全风险，日历已停止同步。请立即重置以恢复。</span>
            <button class="btn btn-danger btn-sm" @click="resetToken">立即重置</button>
          </div>
          <div v-else-if="icalToken?.is_suspicious" class="ical-alert-banner">
            <span>⚠️ <strong>安全提醒：</strong>订阅链接近期被多个来源访问，疑似已泄露。若不及时重置，系统将自动吊销该链接。</span>
            <button class="btn btn-danger btn-sm" @click="resetToken">立即重置</button>
          </div>

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
                <span class="log-country-name">{{ g.city ? g.city + ', ' + fmtCountry(g.country) : fmtCountry(g.country) }}</span>
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
        <button
          class="btn btn-secondary"
          :disabled="exporting || exportStatusLoading || (exportStatusKnown && !exportCanExport)"
          @click="exportData"
        >
          {{ exportStage || (exportStatusLoading ? '检查导出状态…' : '导出我的数据') }}
        </button>
        <button class="btn btn-danger" @click="authStore.logout">退出登录</button>
        <button class="btn btn-danger" @click="showDeleteConfirm = true" :disabled="deleting">
          注销账号
        </button>
      </div>
      <p
        v-if="exportStatusKnown && !exportCanExport && exportNextAllowedLabel"
        class="export-limit"
      >
        下次可申请时间：{{ exportNextAllowedLabel }}
      </p>
      <p v-if="exportError" class="msg-error">{{ exportError }}</p>

      <!-- 注销确认 -->
      <Transition name="confirm-bar">
        <div v-if="showDeleteConfirm" class="delete-confirm">
          <p class="delete-warn">
            <strong>此操作不可撤回。</strong>
            你的账号、所有课表、课程、好友关系及 iCal 令牌将被永久删除。
          </p>
          <p class="section-desc">
            安全日志和备份可能按隐私政策所述期限继续保留。若账号在删除时处于封禁状态，系统还会保存假名化邮箱指纹，以防止规避封禁后重新注册。
          </p>
          <div class="field-group">
            <label class="field-label">输入当前密码以确认</label>
            <input
              v-model="deletePassword"
              type="password"
              class="field-input"
              autocomplete="current-password"
              @keydown.enter="deleteAccount"
            />
          </div>
          <p v-if="deleteError" class="msg-error">{{ deleteError }}</p>
          <div class="delete-btns">
            <button class="btn btn-danger" :disabled="deleting || !deletePassword" @click="deleteAccount">
              {{ deleting ? '删除中…' : '确认永久注销' }}
            </button>
            <button class="btn btn-secondary" :disabled="deleting" @click="showDeleteConfirm = false; deletePassword = ''">
              取消
            </button>
          </div>
        </div>
      </Transition>

      <a
        v-if="instanceConfig.legal_notice_url"
        :href="instanceConfig.legal_notice_url"
        class="terms-footer-link"
        target="_blank"
        rel="noopener noreferrer"
      >《用户协议与隐私政策》</a>
      <router-link v-else to="/terms" class="terms-footer-link">《用户协议与隐私政策》</router-link>
    </section>

    </div><!-- end .settings-grid -->
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAccountData } from '../composables/useAccountData'
import { useIcalSubscription } from '../composables/useIcalSubscription'
import { useSettingsAccount } from '../composables/useSettingsAccount'
import { useSettingsInvites } from '../composables/useSettingsInvites'
import pb from '../lib/pocketbase'
import { useAuthStore } from '../stores/auth'
import { instanceConfig } from '../stores/instanceConfig'

const authStore = useAuthStore()

const {
  copyInvite,
  createMyInvite,
  deleteMyInvite,
  inviteCreateError,
  inviteCreating,
  inviteLoaded,
  inviteQuotaExhausted,
  inviteQuotaLeft,
  inviteSettings,
  loadMyInvites,
  myInvites,
} = useSettingsInvites(authStore)

const {
  cancelNickname,
  changePassword,
  copyFriendCode,
  editingNickname,
  friendCodeCopied,
  newPwd,
  newPwdConfirm,
  nicknameError,
  nicknameInput,
  nicknameSaving,
  oldPwd,
  pwdError,
  pwdLoading,
  pwdSuccess,
  saveNickname,
  showNewPwd,
  showNewPwdConfirm,
  showOldPwd,
  startNickname,
} = useSettingsAccount(authStore)

const {
  accessLogs,
  accessLogsLoading,
  copied,
  copyUrl,
  fmtCountry,
  fmtLogDate,
  generateToken,
  groupedLogs,
  icalError,
  icalLoading,
  icalToken,
  icalUrl,
  isProduction,
  loadIcalSubscription,
  logStats,
  resetToken,
  webcalUrl,
} = useIcalSubscription(authStore)

const {
  deleteAccount,
  deleteError,
  deletePassword,
  deleting,
  exportCanExport,
  exportData,
  exportError,
  exportNextAllowedLabel,
  exportStage,
  exportStatusKnown,
  exportStatusLoading,
  exporting,
  loadExportStatus,
  showDeleteConfirm,
} = useAccountData(authStore)

onMounted(async () => {
  try {
    await pb.collection('users').authRefresh({ requestKey: null })
  } catch {
    // Keep settings available when a background refresh cannot complete.
  }
  loadExportStatus()
  loadMyInvites()
  loadIcalSubscription()
})
</script>

<style scoped src="../styles/settings-view.css"></style>
