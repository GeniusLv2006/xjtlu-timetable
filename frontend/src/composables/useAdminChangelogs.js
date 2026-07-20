import { reactive, ref } from 'vue'
import adminPb from '../lib/adminPb'

export function useAdminChangelogs() {
  // ── Changelogs ─────────────────────────────────────────────────────────────
  const changelogs       = ref([])
  const changelogsLoading = ref(false)
  const changelogsError   = ref('')
  const changelogModal    = ref(false)
  const changelogSaving   = ref(false)
  const editingChangelog  = ref(null)
  const changelogForm     = reactive({ version: '', title: '', published_at: '', content: '' })

  async function loadChangelogs() {
    changelogsLoading.value = true
    changelogsError.value = ''
    try {
      changelogs.value = await adminPb.collection('changelogs').getFullList({
        sort: '-published_at', requestKey: null,
      })
    } catch (e) {
      changelogsError.value = e.message
    } finally {
      changelogsLoading.value = false
    }
  }

  function openChangelogModal(cl) {
    changelogsError.value = ''
    editingChangelog.value = cl
    if (cl) {
      changelogForm.version    = cl.version
      changelogForm.title      = cl.title
      changelogForm.published_at = cl.published_at?.slice(0, 10) ?? ''
      changelogForm.content    = cl.content || ''
    } else {
      changelogForm.version    = ''
      changelogForm.title      = ''
      changelogForm.published_at = new Date().toISOString().slice(0, 10)
      changelogForm.content    = ''
    }
    changelogModal.value = true
  }

  async function saveChangelog() {
    changelogsError.value = ''
    changelogSaving.value = true
    try {
      const data = {
        version:      changelogForm.version.trim(),
        title:        changelogForm.title.trim(),
        published_at: changelogForm.published_at,
        content:      changelogForm.content,
      }
      if (editingChangelog.value) {
        const updated = await adminPb.collection('changelogs').update(
          editingChangelog.value.id, data, { requestKey: null }
        )
        const idx = changelogs.value.findIndex(c => c.id === editingChangelog.value.id)
        if (idx !== -1) changelogs.value[idx] = updated
      } else {
        const created = await adminPb.collection('changelogs').create(data, { requestKey: null })
        changelogs.value.unshift(created)
      }
      changelogModal.value = false
    } catch (e) {
      changelogsError.value = e.message
    } finally {
      changelogSaving.value = false
    }
  }

  async function deleteChangelog(cl) {
    if (!confirm(`删除公告「${cl.version} ${cl.title}」？`)) return
    try {
      await adminPb.collection('changelogs').delete(cl.id, { requestKey: null })
      changelogs.value = changelogs.value.filter(c => c.id !== cl.id)
    } catch (e) {
      changelogsError.value = e.message
    }
  }

  return {
    changelogForm,
    changelogModal,
    changelogSaving,
    changelogs,
    changelogsError,
    changelogsLoading,
    deleteChangelog,
    editingChangelog,
    loadChangelogs,
    openChangelogModal,
    saveChangelog,
  }
}
