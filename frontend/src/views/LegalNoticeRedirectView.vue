<template>
  <div class="redirect-page" role="status">
    正在打开本实例配置的用户协议与隐私政策…
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { instanceConfig, loadInstanceConfig } from '../stores/instanceConfig'
import { legalNoticeTarget } from '../utils/instanceMetadata'

const router = useRouter()

onMounted(async () => {
  await loadInstanceConfig()
  const target = legalNoticeTarget(instanceConfig.legal_notice_url)
  if (target !== '/terms') {
    window.location.replace(target)
    return
  }
  await router.replace('/terms')
})
</script>

<style scoped>
.redirect-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sp-10) var(--sp-4);
  color: var(--text-3);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
