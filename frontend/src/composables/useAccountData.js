import { computed, ref } from 'vue'
import pb from '../lib/pocketbase'
import { instanceConfig } from '../stores/instanceConfig'
import {
  buildDataExportFiles,
  buildDataExportZip,
  dataExportFilename,
} from '../utils/dataExport'

export function useAccountData(authStore) {
  const exporting = ref(false)
  const exportError = ref('')
  const exportStage = ref('')
  const exportStatusLoading = ref(true)
  const exportStatusKnown = ref(false)
  const exportCanExport = ref(false)
  const exportNextAllowedAt = ref(null)
  const showDeleteConfirm = ref(false)
  const deleting = ref(false)
  const deleteError = ref('')

  const exportNextAllowedLabel = computed(() => {
    if (!exportNextAllowedAt.value) return ''
    const date = new Date(exportNextAllowedAt.value)
    if (!Number.isFinite(date.getTime())) return ''
    return date.toLocaleString('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  })

  function applyExportStatus(status = {}) {
    exportStatusKnown.value = true
    exportCanExport.value = status.can_export === true
    exportNextAllowedAt.value = status.next_allowed_at || null
  }

  async function loadExportStatus() {
    exportStatusLoading.value = true
    try {
      const status = await pb.send('/api/user-data-export/status', {
        method: 'GET',
        requestKey: null,
      })
      applyExportStatus(status)
    } catch {
      // Authorization remains the source of truth if status preloading fails.
      exportStatusKnown.value = false
      exportCanExport.value = false
      exportNextAllowedAt.value = null
    } finally {
      exportStatusLoading.value = false
    }
  }

  async function exportData() {
    exporting.value = true
    exportError.value = ''
    exportStage.value = '正在申请导出…'
    let authorization = null
    try {
      authorization = await pb.send('/api/user-data-export/authorize', {
        method: 'POST',
        requestKey: null,
      })
      applyExportStatus({
        can_export: false,
        next_allowed_at: authorization.next_allowed_at,
      })
      exportStage.value = '正在收集数据…'
      const userId = authStore.model.id
      const [
        user,
        timetables,
        courses,
        friendships,
        icalTokens,
        inviteCodes,
        loginLogs,
        icalAccessLogs,
        legalAcceptances,
      ] = await Promise.all([
        pb.collection('users').getOne(userId, { requestKey: null }),
        pb.collection('timetables').getFullList({
          filter: `user = "${userId}"`, requestKey: null,
        }),
        pb.collection('courses').getFullList({
          filter: `timetable.user = "${userId}"`, requestKey: null,
        }),
        pb.collection('friendships').getFullList({
          filter: `from_user = "${userId}" || to_user = "${userId}"`, requestKey: null,
        }),
        pb.collection('ical_tokens').getFullList({
          filter: `user = "${userId}"`, requestKey: null,
        }),
        pb.collection('invite_codes').getFullList({
          filter: `created_by = "${userId}"`, requestKey: null,
        }),
        pb.collection('login_logs').getFullList({
          filter: `user_id = "${userId}"`, requestKey: null,
        }),
        pb.collection('ical_access_logs').getFullList({
          filter: `user_id = "${userId}"`, requestKey: null,
        }),
        pb.collection('legal_acceptances').getFullList({
          filter: `user = "${userId}"`, requestKey: null,
        }),
      ])
      const data = {
        user,
        timetables,
        courses,
        friendships,
        ical_tokens: icalTokens,
        invite_codes: inviteCodes,
        login_logs: loginLogs,
        ical_access_logs: icalAccessLogs,
        legal_acceptances: legalAcceptances,
      }
      const exportedAt = new Date().toISOString()
      const files = buildDataExportFiles(
        data,
        instanceConfig,
        authorization,
        exportedAt,
      )
      exportStage.value = '正在生成压缩包…'
      const bytes = await buildDataExportZip(files)
      const blob = new Blob([bytes], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = dataExportFilename(exportedAt)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      if (error?.status === 429 && error.response) {
        applyExportStatus(error.response)
        exportError.value = exportNextAllowedLabel.value
          ? `每 24 小时只能申请一次，请于 ${exportNextAllowedLabel.value} 后重试。`
          : '每 24 小时只能申请一次，请稍后重试。'
      } else if (authorization) {
        exportError.value = exportNextAllowedLabel.value
          ? `导出生成失败，但本次申请已计入限额。可于 ${exportNextAllowedLabel.value} 后再次申请。`
          : '导出生成失败，但本次申请已计入 24 小时限额。'
      } else {
        exportError.value = error.message || '导出申请失败，请重试'
      }
    } finally {
      exporting.value = false
      exportStage.value = ''
    }
  }

  async function deleteAccount() {
    deleting.value = true
    deleteError.value = ''
    try {
      const userId = authStore.model.id
      const tokens = await pb.collection('ical_tokens').getFullList({ requestKey: null })
      await Promise.all(tokens.map(token => (
        pb.collection('ical_tokens').delete(token.id, { requestKey: null })
      )))

      const friendships = await pb.collection('friendships').getFullList({ requestKey: null })
      await Promise.all(friendships.map(friendship => (
        pb.collection('friendships').delete(friendship.id, { requestKey: null })
      )))

      const timetables = await pb.collection('timetables').getFullList({
        filter: `user = "${userId}"`, requestKey: null,
      })
      for (const timetable of timetables) {
        const courses = await pb.collection('courses').getFullList({
          filter: `timetable = "${timetable.id}"`, requestKey: null,
        })
        await Promise.all(courses.map(course => (
          pb.collection('courses').delete(course.id, { requestKey: null })
        )))
        await pb.collection('timetables').delete(timetable.id, { requestKey: null })
      }

      await pb.collection('users').delete(userId, { requestKey: null })
      authStore.logout()
    } catch (error) {
      deleteError.value = error.message || '注销失败，请重试或联系管理员'
      deleting.value = false
    }
  }

  return {
    deleteAccount,
    deleteError,
    deleting,
    exportData,
    exportCanExport,
    exportError,
    exportNextAllowedLabel,
    exportStage,
    exportStatusKnown,
    exportStatusLoading,
    exporting,
    loadExportStatus,
    showDeleteConfirm,
  }
}
