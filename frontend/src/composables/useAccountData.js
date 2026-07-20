import { ref } from 'vue'
import pb from '../lib/pocketbase'
import { buildDataExportPayload } from '../utils/dataExport'

export function useAccountData(authStore) {
  const exporting = ref(false)
  const exportError = ref('')
  const showDeleteConfirm = ref(false)
  const deleting = ref(false)
  const deleteError = ref('')

  async function exportData() {
    exporting.value = true
    exportError.value = ''
    try {
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
      const payload = buildDataExportPayload({
        user,
        timetables,
        courses,
        friendships,
        ical_tokens: icalTokens,
        invite_codes: inviteCodes,
        login_logs: loginLogs,
        ical_access_logs: icalAccessLogs,
        legal_acceptances: legalAcceptances,
      })
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `xjtlu-timetable-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      exportError.value = error.message || '导出失败，请重试'
    } finally {
      exporting.value = false
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
    exportError,
    exporting,
    showDeleteConfirm,
  }
}
