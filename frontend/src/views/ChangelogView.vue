<template>
  <div class="changelog-page">
    <div class="page-toolbar">
      <router-link to="/" class="back-link">← 返回</router-link>
      <h1 class="page-title">更新日志</h1>
    </div>

    <div v-if="loading" class="state-msg">加载中…</div>
    <div v-else-if="error" class="state-msg state-error">{{ error }}</div>
    <div v-else-if="entries.length === 0" class="state-msg">暂无更新记录。</div>

    <div v-else class="entries">
      <article v-for="entry in entries" :key="entry.id" class="entry-card">
        <div class="entry-header">
          <span class="entry-version">{{ entry.version }}</span>
          <span class="entry-title">{{ entry.title }}</span>
          <span class="entry-date">{{ fmtDate(entry.published_at) }}</span>
        </div>
        <div class="entry-content" v-html="entry.content"></div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import pb from '../lib/pocketbase'

const entries = ref([])
const loading = ref(true)
const error   = ref('')

function fmtDate(str) {
  if (!str) return ''
  return str.slice(0, 10)
}

onMounted(async () => {
  try {
    const res = await pb.collection('changelogs').getFullList({
      sort: '-published_at',
      requestKey: null,
    })
    entries.value = res
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.changelog-page {
  padding: 28px 32px 40px;
  max-width: 860px;
}

@media (max-width: 768px) {
  .changelog-page { padding: 20px 16px 32px; }
}

.page-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: 28px;
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.back-link {
  font-size: var(--text-sm);
  color: var(--text-3);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.12s;
}
.back-link:hover { color: var(--accent); }
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.state-msg {
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }

/* Entries */
.entries {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.entry-card {
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface);
  overflow: hidden;
}

.entry-header {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-wrap: wrap;
}
.entry-version {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  background: var(--accent);
  color: #fff;
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
}
.entry-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
  flex: 1;
  min-width: 0;
}
.entry-date {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

/* Rich text content */
.entry-content {
  padding: 16px 20px;
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.75;
}
.entry-content :deep(p)        { margin: 0 0 0.65em; }
.entry-content :deep(p:last-child) { margin-bottom: 0; }
.entry-content :deep(h2)       { font-size: var(--text-base); font-weight: 700; color: var(--text); margin: 1em 0 0.4em; }
.entry-content :deep(h3)       { font-size: var(--text-sm); font-weight: 600; color: var(--text); margin: 0.8em 0 0.3em; }
.entry-content :deep(ul),
.entry-content :deep(ol)       { padding-left: 20px; margin: 0 0 0.65em; }
.entry-content :deep(li)       { margin-bottom: 3px; }
.entry-content :deep(strong)   { color: var(--text); font-weight: 600; }
.entry-content :deep(em)       { font-style: italic; }
.entry-content :deep(code)     {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: rgba(255,255,255,0.07);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--text);
}
.entry-content :deep(pre)      {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 14px;
  margin: 0 0 0.65em;
  overflow-x: auto;
}
.entry-content :deep(pre code) { background: none; padding: 0; font-size: var(--text-xs); }
.entry-content :deep(hr)       { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
</style>
