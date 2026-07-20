import { reactive, ref } from 'vue'
import adminPb from '../lib/adminPb'

export function useAdminSemesters() {
  // ── Semesters ─────────────────────────────────────────────────────────────
  const semesters        = ref([])
  const semestersLoading = ref(false)
  const semestersError   = ref('')

  async function loadSemesters() {
    semestersLoading.value = true
    semestersError.value = ''
    try {
      semesters.value = await adminPb.collection('semesters').getFullList({
        sort: '-start_date',
        requestKey: null,
      })
    } catch (e) {
      semestersError.value = e.message
    } finally {
      semestersLoading.value = false
    }
  }

  async function setCurrentSemester(target) {
    semestersError.value = ''
    try {
      // Unset all others, then set target
      for (const s of semesters.value) {
        if (s.is_current && s.id !== target.id) {
          await adminPb.collection('semesters').update(s.id, { is_current: false }, { requestKey: null })
          s.is_current = false
        }
      }
      await adminPb.collection('semesters').update(target.id, { is_current: true }, { requestKey: null })
      target.is_current = true
    } catch (e) {
      semestersError.value = e.message
    }
  }

  async function deleteSemester(s) {
    if (!confirm(`删除学期「${s.name}」？`)) return
    try {
      await adminPb.collection('semesters').delete(s.id, { requestKey: null })
      semesters.value = semesters.value.filter(x => x.id !== s.id)
    } catch (e) {
      semestersError.value = e.message
    }
  }

  // Create semester modal
  const createSemesterModal   = ref(false)
  const createSemesterLoading = ref(false)
  const createSemesterError   = ref('')
  const newSemester = reactive({ name: '', start_date: '', weeks_total: 16, is_current: false })

  function openCreateSemester() {
    Object.assign(newSemester, { name: '', start_date: '', weeks_total: 16, is_current: false })
    createSemesterError.value = ''
    createSemesterModal.value = true
  }

  async function createSemester() {
    createSemesterError.value = ''
    if (!newSemester.name || !newSemester.start_date) {
      createSemesterError.value = '学期名称和开始日期不能为空'
      return
    }
    createSemesterLoading.value = true
    try {
      if (newSemester.is_current) {
        for (const s of semesters.value) {
          if (s.is_current) {
            await adminPb.collection('semesters').update(s.id, { is_current: false }, { requestKey: null })
            s.is_current = false
          }
        }
      }
      const record = await adminPb.collection('semesters').create({ ...newSemester }, { requestKey: null })
      semesters.value.unshift(record)
      createSemesterModal.value = false
    } catch (e) {
      createSemesterError.value = e.message
    } finally {
      createSemesterLoading.value = false
    }
  }

  return {
    createSemester,
    createSemesterError,
    createSemesterLoading,
    createSemesterModal,
    deleteSemester,
    loadSemesters,
    newSemester,
    openCreateSemester,
    semesters,
    semestersError,
    semestersLoading,
    setCurrentSemester,
  }
}
