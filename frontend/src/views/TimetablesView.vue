<template>
  <div class="timetables-page">
    <div class="page-toolbar">
      <div class="title-block">
        <h1 class="page-title">课表管理</h1>
        <span class="page-sub">{{ timetables.length }} 份课表</span>
      </div>
      <router-link to="/import" class="btn btn-primary">导入新课表</router-link>
    </div>

    <div v-if="loading" class="state-msg">正在加载课表…</div>
    <div v-else-if="loadError" class="state-msg state-error">{{ loadError }}</div>

    <div v-else-if="timetables.length === 0" class="empty-state">
      <h2>还没有已导入的课表</h2>
      <router-link to="/import" class="btn btn-primary">导入第一份课表</router-link>
    </div>

    <section v-else class="timetable-list" aria-label="账户中的课表">
      <article
        v-for="timetable in timetables"
        :key="timetable.id"
        class="timetable-row"
        :class="{ 'timetable-active': timetable.id === activeId }"
      >
        <div class="timetable-main">
          <div class="timetable-title-row">
            <h2 class="timetable-name">{{ timetable.label || '未命名课表' }}</h2>
            <span v-if="timetable.id === activeId" class="active-badge">当前课表 · iCal 同步中</span>
            <span class="visibility-badge">{{ visibilityLabel(timetable.visibility) }}</span>
          </div>
          <div class="timetable-meta">
            <span>最近同步 {{ formatDate(timetable.last_synced) }}</span>
            <span>导入于 {{ formatDate(timetable.created) }}</span>
          </div>
        </div>

        <div v-if="editingId !== timetable.id && deleteId !== timetable.id" class="timetable-actions">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pendingId === timetable.id"
            @click="selectTimetable(timetable.id)"
          >{{ timetable.id === activeId ? '查看' : '设为当前并查看' }}</button>
          <button class="btn btn-secondary btn-sm" @click="startRename(timetable)">重命名</button>
          <button class="btn btn-danger btn-sm" @click="deleteId = timetable.id">删除</button>
        </div>

        <form
          v-if="editingId === timetable.id"
          class="inline-editor"
          @submit.prevent="saveRename(timetable)"
        >
          <label :for="`rename-${timetable.id}`" class="sr-only">新课表名称</label>
          <input
            :id="`rename-${timetable.id}`"
            ref="renameInputs"
            v-model="renameValue"
            class="field-input rename-input"
            maxlength="80"
            :disabled="pendingId === timetable.id"
            @keydown.escape="cancelRename"
          />
          <button class="btn btn-primary btn-sm" :disabled="pendingId === timetable.id">保存</button>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="pendingId === timetable.id" @click="cancelRename">取消</button>
          <span v-if="renameError" class="msg-error inline-message">{{ renameError }}</span>
        </form>

        <div v-if="deleteId === timetable.id" class="delete-confirm" role="alert">
          <span>删除后，该课表及其中全部课程将永久移除。</span>
          <button
            class="btn btn-danger btn-sm"
            :disabled="pendingId === timetable.id"
            @click="deleteTimetable(timetable.id)"
          >{{ pendingId === timetable.id ? '删除中…' : '确认删除' }}</button>
          <button class="btn btn-secondary btn-sm" :disabled="pendingId === timetable.id" @click="deleteId = ''">取消</button>
        </div>
      </article>
    </section>

    <p v-if="actionError" class="msg-error action-message" role="status">{{ actionError }}</p>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import pb from '../lib/pocketbase'
import {
  readActiveTimetableId,
  validateTimetableLabel,
  writeActiveTimetableId,
} from '../utils/timetableSelection'

const router = useRouter()
const timetables = ref([])
const activeId = ref('')
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const pendingId = ref('')
const editingId = ref('')
const deleteId = ref('')
const renameValue = ref('')
const renameError = ref('')
const renameInputs = ref([])

const userId = pb.authStore.model?.id || ''

function visibilityLabel(visibility) {
  return visibility === 'friends' ? '好友可见' : '仅自己'
}

function formatDate(value) {
  if (!value) return '尚未同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function loadTimetables() {
  loading.value = true
  loadError.value = ''
  try {
    timetables.value = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created',
      requestKey: null,
    })
    const serverId = await readActiveTimetableId(pb)
    activeId.value = timetables.value.some((item) => item.id === serverId)
      ? serverId
      : (timetables.value[0]?.id || '')
  } catch (error) {
    loadError.value = error.message || '课表加载失败'
  } finally {
    loading.value = false
  }
}

async function selectTimetable(id) {
  if (id === activeId.value) {
    router.push({ name: 'Home' })
    return
  }
  pendingId.value = id
  actionError.value = ''
  try {
    activeId.value = await writeActiveTimetableId(pb, id)
    router.push({ name: 'Home' })
  } catch (error) {
    actionError.value = error.message || '当前课表切换失败'
  } finally {
    pendingId.value = ''
  }
}

async function startRename(timetable) {
  editingId.value = timetable.id
  deleteId.value = ''
  renameValue.value = timetable.label || ''
  renameError.value = ''
  actionError.value = ''
  await nextTick()
  renameInputs.value.at(-1)?.focus()
}

function cancelRename() {
  editingId.value = ''
  renameValue.value = ''
  renameError.value = ''
}

async function saveRename(timetable) {
  renameError.value = validateTimetableLabel(renameValue.value)
  if (renameError.value) return

  pendingId.value = timetable.id
  actionError.value = ''
  try {
    const updated = await pb.collection('timetables').update(
      timetable.id,
      { label: renameValue.value.trim() },
      { requestKey: null },
    )
    const index = timetables.value.findIndex((item) => item.id === timetable.id)
    if (index !== -1) timetables.value[index] = updated
    cancelRename()
  } catch (error) {
    renameError.value = error.message || '重命名失败'
  } finally {
    pendingId.value = ''
  }
}

async function deleteTimetable(id) {
  pendingId.value = id
  actionError.value = ''
  try {
    await pb.collection('timetables').delete(id, { requestKey: null })
    timetables.value = timetables.value.filter((item) => item.id !== id)
    deleteId.value = ''
    if (activeId.value === id) {
      activeId.value = await readActiveTimetableId(pb)
    }
  } catch (error) {
    actionError.value = error.message || '删除课表失败'
  } finally {
    pendingId.value = ''
  }
}

onMounted(loadTimetables)
</script>

<style scoped>
.timetables-page {
  width: min(920px, 100%);
  margin: 0 auto;
  padding: 28px 32px 48px;
}

.page-toolbar,
.title-block,
.timetable-title-row,
.timetable-meta,
.timetable-actions,
.inline-editor,
.delete-confirm {
  display: flex;
  align-items: center;
}

.page-toolbar {
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}

.title-block {
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
}

.page-sub,
.timetable-meta {
  font-size: var(--text-xs);
  color: var(--text-3);
}

.timetable-list {
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
}

.timetable-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sp-4);
  align-items: center;
  min-height: 88px;
  padding: var(--sp-4);
  border-bottom: 1px solid var(--border);
}

.timetable-row:last-child {
  border-bottom: 0;
}

.timetable-active {
  box-shadow: inset 3px 0 0 var(--accent);
  background: #FAFCFF;
}

.timetable-main {
  min-width: 0;
}

.timetable-title-row {
  min-width: 0;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.timetable-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--text-base);
  font-weight: 650;
}

.active-badge,
.visibility-badge {
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.active-badge {
  color: var(--blue);
  background: var(--blue-bg);
}

.visibility-badge {
  color: var(--text-2);
  background: var(--surface-2);
}

.timetable-meta {
  gap: var(--sp-3);
  margin-top: 7px;
  flex-wrap: wrap;
}

.timetable-actions,
.inline-editor,
.delete-confirm {
  justify-content: flex-end;
  gap: var(--sp-2);
}

.inline-editor,
.delete-confirm {
  grid-column: 1 / -1;
  justify-content: flex-start;
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.rename-input {
  width: min(360px, 100%);
}

.inline-message {
  flex-basis: 100%;
}

.delete-confirm {
  color: var(--red);
  font-size: var(--text-sm);
}

.delete-confirm span {
  flex: 1;
  min-width: 220px;
}

.btn-sm {
  padding: 5px 10px;
}

.action-message {
  margin-top: var(--sp-4);
}

.empty-state {
  padding: 64px var(--sp-5);
  text-align: center;
  border-block: 1px solid var(--border);
}

.empty-state h2 {
  margin-bottom: var(--sp-4);
  font-size: var(--text-base);
}

.state-msg {
  padding: 64px 0;
  text-align: center;
  color: var(--text-3);
}

.state-error {
  color: var(--red);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .timetables-page {
    padding: 20px 16px 40px;
  }

  .timetable-row {
    grid-template-columns: 1fr;
  }

  .timetable-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .page-toolbar {
    align-items: flex-start;
  }

  .timetable-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .inline-editor .rename-input {
    flex-basis: 100%;
  }
}
</style>
