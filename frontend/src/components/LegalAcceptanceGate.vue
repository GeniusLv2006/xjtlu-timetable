<template>
  <div
    v-if="visible"
    class="legal-gate"
    role="dialog"
    aria-modal="true"
    aria-labelledby="legal-gate-title"
  >
    <section class="legal-panel">
      <h2 id="legal-gate-title">请确认使用条件</h2>
      <p class="legal-summary">
        本实例的使用条件已经更新。继续使用前，请完成以下确认。
      </p>

      <label v-if="requirements.minimum_age" class="legal-check">
        <input v-model="ageConfirmed" type="checkbox" />
        <span>我确认我已年满 {{ requirements.minimum_age }} 周岁</span>
      </label>

      <label v-if="requirements.legal_notice_version" class="legal-check">
        <input v-model="noticeAccepted" type="checkbox" />
        <span>
          我已阅读并同意
          <a
            v-if="instanceConfig.legal_notice_url"
            :href="instanceConfig.legal_notice_url"
            target="_blank"
            rel="noopener noreferrer"
          >用户协议与隐私政策（版本 {{ requirements.legal_notice_version }}）</a>
          <router-link v-else to="/terms" target="_blank">
            用户协议与隐私政策（版本 {{ requirements.legal_notice_version }}）
          </router-link>
        </span>
      </label>

      <p v-if="error" class="legal-error">{{ error }}</p>
      <button
        class="btn btn-primary legal-submit"
        :disabled="saving || !canAccept"
        @click="accept"
      >
        {{ saving ? '保存中…' : '同意并继续' }}
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import pb from '../lib/pocketbase'
import { useAuthStore } from '../stores/auth'
import { instanceConfig, loadInstanceConfig } from '../stores/instanceConfig'
import {
  buildLegalAcceptancePayload,
  hasCurrentLegalAcceptance,
  normalizeLegalRequirements,
  requiresLegalAcceptance,
} from '../utils/legalAcceptance'

const authStore = useAuthStore()
const visible = ref(false)
const saving = ref(false)
const error = ref('')
const ageConfirmed = ref(false)
const noticeAccepted = ref(false)
const requirements = computed(() => normalizeLegalRequirements(instanceConfig))
const canAccept = computed(() =>
  (!requirements.value.minimum_age || ageConfirmed.value) &&
  (!requirements.value.legal_notice_version || noticeAccepted.value)
)

async function refresh() {
  visible.value = false
  error.value = ''
  ageConfirmed.value = false
  noticeAccepted.value = false
  if (!authStore.isLoggedIn) return

  await loadInstanceConfig()
  if (!requiresLegalAcceptance(instanceConfig)) return

  try {
    const records = await pb.collection('legal_acceptances').getFullList({
      sort: '-created',
      requestKey: null,
    })
    visible.value = !hasCurrentLegalAcceptance(records, instanceConfig)
  } catch (e) {
    error.value = e.message || '无法检查使用条件，请刷新页面重试'
    visible.value = true
  }
}

async function accept() {
  if (!canAccept.value || !authStore.model?.id) return
  saving.value = true
  error.value = ''
  try {
    await pb.collection('legal_acceptances').create(
      buildLegalAcceptancePayload(authStore.model.id, instanceConfig),
      { requestKey: null },
    )
    await refresh()
  } catch (e) {
    error.value = e.message || '保存失败，请刷新页面后重试'
  } finally {
    saving.value = false
  }
}

watch(() => authStore.isLoggedIn, refresh, { immediate: true })
</script>

<style scoped>
.legal-gate {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(24, 24, 26, 0.68);
}

.legal-panel {
  width: min(100%, 480px);
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
}

.legal-panel h2 {
  font-size: var(--text-lg);
  margin-bottom: 8px;
}

.legal-summary {
  margin-bottom: 20px;
  color: var(--text-2);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.legal-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 14px;
  color: var(--text);
  font-size: var(--text-sm);
  line-height: 1.55;
  cursor: pointer;
}

.legal-check input {
  margin-top: 3px;
  flex: 0 0 auto;
}

.legal-error {
  margin-top: 16px;
  color: var(--red);
  font-size: var(--text-sm);
}

.legal-submit {
  width: 100%;
  justify-content: center;
  margin-top: 20px;
}
</style>
