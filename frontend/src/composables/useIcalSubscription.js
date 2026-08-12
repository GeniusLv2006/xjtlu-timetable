import { computed, ref } from 'vue'
import pb from '../lib/pocketbase'

export function useIcalSubscription(authStore) {
  const icalToken = ref(null)
  const icalLoading = ref(true)
  const icalError = ref('')
  const copied = ref(false)
  const accessLogs = ref([])
  const accessLogsLoading = ref(false)

  const icalUrl = computed(() => {
    if (!icalToken.value) return ''
    const base = import.meta.env.DEV ? 'http://localhost:8091' : window.location.origin
    return `${base}/api/ical/${icalToken.value.token}/timetable.ics`
  })
  const isProduction = !import.meta.env.DEV
  const webcalUrl = computed(() => icalUrl.value.replace(/^https?:/, 'webcal:'))

  async function loadAccessLogs() {
    accessLogsLoading.value = true
    try {
      const result = await pb.collection('ical_access_logs').getList(1, 50, {
        sort: '-created',
        requestKey: null,
      })
      accessLogs.value = result.items
    } catch {
      accessLogs.value = []
    } finally {
      accessLogsLoading.value = false
    }
  }

  const groupedLogs = computed(() => {
    const groups = {}
    for (const log of accessLogs.value) {
      const key = log.ip_prefix || '未知'
      if (!groups[key]) {
        groups[key] = {
          ip: key,
          country: log.country,
          count: 0,
          latest: log.created,
        }
      }
      groups[key].count++
      if (log.created > groups[key].latest) {
        groups[key].latest = log.created
        groups[key].country = log.country
      }
    }
    return Object.values(groups).sort((a, b) => b.latest.localeCompare(a.latest))
  })

  const logStats = computed(() => ({
    total: accessLogs.value.length,
    sources: new Set(accessLogs.value.map(log => log.ip_prefix || '未知')).size,
  }))

  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

  function fmtCountry(code) {
    if (!code) return '—'
    try {
      return countryNames.of(code) || code
    } catch {
      return code
    }
  }

  function fmtLogDate(value) {
    if (!value) return '—'
    return new Date(value).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  async function loadIcalSubscription() {
    try {
      const records = await pb.collection('ical_tokens').getFullList({ requestKey: null })
      if (records.length > 0) {
        icalToken.value = records[0]
        loadAccessLogs()
      }
    } catch (error) {
      icalError.value = error.message
    } finally {
      icalLoading.value = false
    }
  }

  function randomHex32() {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  async function generateToken() {
    icalLoading.value = true
    icalError.value = ''
    try {
      icalToken.value = await pb.collection('ical_tokens').create({
        user: authStore.model.id,
        token: randomHex32(),
      }, { requestKey: null })
      accessLogs.value = []
    } catch (error) {
      icalError.value = error.message
    } finally {
      icalLoading.value = false
    }
  }

  async function resetToken() {
    if (!icalToken.value) return
    if (!confirm('重置后旧链接将立即失效，是否继续？')) return

    icalLoading.value = true
    icalError.value = ''
    try {
      await pb.collection('ical_tokens').delete(icalToken.value.id, { requestKey: null })
      icalToken.value = null
      await generateToken()
    } catch (error) {
      icalError.value = error.message
      icalLoading.value = false
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(icalUrl.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch {
      const input = document.querySelector('.url-input')
      if (input) {
        input.select()
        document.execCommand('copy')
      }
    }
  }

  return {
    accessLogs,
    accessLogsLoading,
    copied,
    copyUrl,
    fmtCountry,
    fmtLogDate,
    generateToken,
    groupedLogs,
    icalError,
    icalLoading,
    icalToken,
    icalUrl,
    isProduction,
    loadIcalSubscription,
    logStats,
    resetToken,
    webcalUrl,
  }
}
