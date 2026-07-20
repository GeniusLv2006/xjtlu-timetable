<template>
  <div class="restricted-page">
    <main class="restricted-shell">
      <div class="restricted-mark" aria-hidden="true">!</div>
      <p class="restricted-kicker">账户访问受限</p>
      <h1>你的账号已被暂停</h1>
      <p class="restricted-summary">
        你仍可下载与账号相关的数据，或永久注销账号。课表、导入、好友、订阅和账号修改功能不可用。
      </p>

      <section class="restricted-actions" aria-labelledby="available-actions">
        <h2 id="available-actions">可用操作</h2>
        <button
          class="btn btn-primary action-button"
          :disabled="exporting || exportStatusLoading || (exportStatusKnown && !exportCanExport)"
          @click="exportData"
        >
          {{ exportStage || (exportStatusLoading ? '检查导出状态…' : '导出我的数据') }}
        </button>
        <p v-if="exportStatusKnown && !exportCanExport && exportNextAllowedLabel" class="action-note">
          下次可申请时间：{{ exportNextAllowedLabel }}
        </p>
        <p v-if="exportError" class="msg-error">{{ exportError }}</p>

        <button class="btn btn-danger action-button" :disabled="deleting" @click="showDeleteConfirm = true">
          永久注销账号
        </button>
        <button class="btn btn-secondary action-button" @click="authStore.logout">退出登录</button>
      </section>

      <section v-if="showDeleteConfirm" class="delete-panel" aria-labelledby="delete-title">
        <h2 id="delete-title">确认永久注销</h2>
        <p>
          主要账号数据将从实时应用数据库中删除。为防止规避封禁，本实例会将你的规范化邮箱转换为带服务端密钥的假名化指纹，并保留最多
          <strong>{{ retentionDays }} 天</strong>。该指纹不是匿名数据，处理不以你的同意为依据。
        </p>
        <label class="field-group">
          <span class="field-label">当前密码</span>
          <input
            v-model="deletePassword"
            type="password"
            class="field-input"
            autocomplete="current-password"
            @keydown.enter="deleteAccount"
          />
        </label>
        <p v-if="deleteError" class="msg-error">{{ deleteError }}</p>
        <div class="delete-actions">
          <button class="btn btn-danger" :disabled="deleting || !deletePassword" @click="deleteAccount">
            {{ deleting ? '注销中…' : '确认永久注销' }}
          </button>
          <button class="btn btn-secondary" :disabled="deleting" @click="cancelDelete">取消</button>
        </div>
      </section>

      <p class="restricted-privacy">
        这项设计旨在提高处理透明度，并作为我们努力遵守适用 UK GDPR 要求的一部分；它不构成法律意见或完全合规保证。
        <a
          v-if="instanceConfig.legal_notice_url"
          :href="instanceConfig.legal_notice_url"
          target="_blank"
          rel="noopener noreferrer"
        >查看用户协议与隐私政策</a>
        <router-link v-else to="/terms" target="_blank">查看用户协议与隐私政策</router-link>
      </p>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAccountData } from '../composables/useAccountData'
import { useAuthStore } from '../stores/auth'
import { instanceConfig, loadInstanceConfig } from '../stores/instanceConfig'

const authStore = useAuthStore()
const retentionDays = computed(() => instanceConfig.blocked_registration_retention_days || 0)
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

function cancelDelete() {
  showDeleteConfirm.value = false
  deletePassword.value = ''
  deleteError.value = ''
}

onMounted(async () => {
  await loadInstanceConfig()
  loadExportStatus()
})
</script>

<style scoped>
.restricted-page {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 32px 18px;
  background: var(--surface-2);
}

.restricted-shell {
  width: min(100%, 560px);
  padding: 32px;
  border: 1px solid var(--border);
  border-top: 4px solid var(--red);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 16px 42px rgba(24, 24, 26, 0.08);
}

.restricted-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border: 1px solid color-mix(in srgb, var(--red) 50%, var(--border));
  border-radius: 50%;
  color: var(--red);
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
}

.restricted-kicker {
  margin: 0 0 5px;
  color: var(--red);
  font-size: var(--text-xs);
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 1.65rem;
  letter-spacing: 0;
}

.restricted-summary,
.restricted-privacy,
.delete-panel p {
  color: var(--text-2);
  font-size: var(--text-sm);
  line-height: 1.7;
}

.restricted-summary { margin: 12px 0 26px; }

.restricted-actions {
  display: grid;
  gap: 10px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
}

.restricted-actions h2,
.delete-panel h2 {
  margin: 0 0 4px;
  font-size: var(--text-base);
}

.action-button {
  width: 100%;
  min-height: 40px;
  justify-content: center;
}

.action-note {
  margin: -3px 0 4px;
  color: var(--text-3);
  font-size: var(--text-xs);
}

.delete-panel {
  margin-top: 22px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--red) 35%, var(--border));
  border-radius: 4px;
  background: color-mix(in srgb, var(--red) 4%, var(--surface));
}

.delete-panel .field-group { margin-top: 16px; }

.delete-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.restricted-privacy {
  margin: 24px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: var(--text-xs);
}

.restricted-privacy a { display: inline-block; margin-left: 4px; }

@media (max-width: 560px) {
  .restricted-page { place-items: start center; padding: 0; background: var(--surface); }
  .restricted-shell { min-height: 100dvh; padding: 28px 20px; border: 0; border-top: 4px solid var(--red); box-shadow: none; }
  .delete-actions { flex-direction: column; }
  .delete-actions .btn { width: 100%; justify-content: center; }
}
</style>
