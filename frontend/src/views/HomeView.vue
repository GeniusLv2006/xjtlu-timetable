<template>
  <div class="home-page">
    <div class="toolbar">
      <h2>我的课表</h2>
      <div class="toolbar-right">
        <select v-if="timetables.length > 1" v-model="selectedId">
          <option v-for="t in timetables" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <span v-if="timetables.length === 0 && !loading" class="hint">
          还没有课表，<router-link to="/import">去导入</router-link>
        </span>
      </div>
    </div>

    <div v-if="loading" class="status">加载中…</div>
    <div v-else-if="error" class="status error">{{ error }}</div>
    <TimetableGrid v-else :courses="courses" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import pb from '../lib/pocketbase'
import TimetableGrid from '../components/TimetableGrid.vue'

const timetables = ref([])
const selectedId = ref(null)
const courses = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const userId = pb.authStore.model?.id
    const result = await pb.collection('timetables').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created',
      requestKey: null,
    })
    timetables.value = result
    if (result.length > 0) selectedId.value = result[0].id
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

watch(selectedId, async (id) => {
  if (!id) { courses.value = []; return }
  loading.value = true
  error.value = ''
  try {
    courses.value = await pb.collection('courses').getFullList({
      filter: `timetable = "${id}"`,
      requestKey: null,
    })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.home-page {
  max-width: 960px;
  margin: 24px auto;
  padding: 0 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.toolbar h2 {
  margin: 0;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}
.hint {
  font-size: 13px;
  color: #888;
}
.status {
  padding: 40px;
  text-align: center;
  color: #888;
  font-size: 13px;
}
.status.error {
  color: #c0392b;
}
</style>
