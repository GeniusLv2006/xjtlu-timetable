import { computed, reactive, ref, watch, watchEffect } from 'vue'
import adminPb from '../lib/adminPb'

export function useAdminLogs(activeTab) {
  // ── Logs ───────────────────────────────────────────────────────────────────
  const LOGS_PER_PAGE   = 50
  const logsSubTab      = ref('login')
  const currentPageLogs = ref([])
  const logsPage        = ref(1)
  const logsTotalItems  = ref(0)
  const logsTotalPages  = ref(1)
  const logsLoading     = ref(false)
  const logsError       = ref('')
  const logsFilter      = reactive({ email: '', ip: '', isp: '', country: '', dateFrom: '', dateTo: '' })
  const logsJumpInput   = ref(null)

  const hasLogsFilter = computed(() =>
    !!(logsFilter.email || logsFilter.ip || logsFilter.isp || logsFilter.country || logsFilter.dateFrom || logsFilter.dateTo)
  )

  function buildLogsFilter() {
    const parts = []
    const esc = v => v.replace(/"/g, '')
    if (logsFilter.email)    parts.push(`email ~ "${esc(logsFilter.email)}"`)
    if (logsFilter.ip)       parts.push(`ip_prefix ~ "${esc(logsFilter.ip)}"`)
    if (logsFilter.isp)      parts.push(`isp ~ "${esc(logsFilter.isp)}"`)
    if (logsFilter.country)  parts.push(`country = "${esc(logsFilter.country).toUpperCase()}"`)
    if (logsFilter.dateFrom) {
      const d = new Date(logsFilter.dateFrom + 'T00:00:00+08:00')
      parts.push(`created >= "${d.toISOString().slice(0, 19).replace('T', ' ')}"`)
    }
    if (logsFilter.dateTo) {
      const d = new Date(logsFilter.dateTo + 'T23:59:59+08:00')
      parts.push(`created <= "${d.toISOString().slice(0, 19).replace('T', ' ')}"`)
    }
    return parts.join(' && ')
  }

  function applyLogsFilter() { loadLogs(1) }

  function clearLogsFilter() {
    logsFilter.email = ''
    logsFilter.ip = ''
    logsFilter.isp = ''
    logsFilter.country = ''
    logsFilter.dateFrom = ''
    logsFilter.dateTo = ''
    loadLogs(1)
  }

  function jumpToLogsPage() {
    const p = logsJumpInput.value
    if (p && p >= 1 && p <= logsTotalPages.value) {
      loadLogs(p)
      logsJumpInput.value = null
    }
  }

  function quickFilterEmail(email) {
    logsFilter.email = email
    logsFilter.ip = ''
    loadLogs(1)
  }

  function quickFilterIp(ipPrefix) {
    logsFilter.ip = ipPrefix
    logsFilter.email = ''
    loadLogs(1)
  }

  const logCountryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
  function fmtLogCountry(code) {
    if (!code) return '—'
    try { return logCountryNames.of(code) || code } catch { return code }
  }
  function parseDevice(ua, ctx) {
    if (!ua) return '—'
    if (ctx === 'ical') {
      if (/iPhone|iPad/.test(ua))                            return 'Apple Calendar · iOS'
      if (/Mac OS X/.test(ua))                               return 'Apple Calendar · macOS'
      if (/GoogleCalendarSyncAdapter/.test(ua))              return 'Google Calendar'
      if (/Microsoft Outlook/i.test(ua))                     return 'Outlook'
      if (/Thunderbird/i.test(ua))                           return 'Thunderbird'
      if (/DAVdroid|DAVx5/i.test(ua))                        return 'DAVx5 · Android'
      if (/Fantastical/i.test(ua))                           return 'Fantastical'
      if (/BusyCal/i.test(ua))                               return 'BusyCal'
      return ua.length > 40 ? ua.slice(0, 40) + '…' : ua
    }
    // login context
    let os = ''
    if (/iPhone|iPad/.test(ua))        os = 'iOS'
    else if (/Android/.test(ua))       { const m = ua.match(/Android ([\d.]+)/); os = 'Android' + (m ? ' ' + m[1] : '') }
    else if (/Windows/.test(ua))       os = 'Windows'
    else if (/Mac OS X/.test(ua))      os = 'macOS'
    else if (/Linux/.test(ua))         os = 'Linux'

    let browser = ''
    if (/Edg\//.test(ua))              browser = 'Edge'
    else if (/OPR\/|Opera/.test(ua))   browser = 'Opera'
    else if (/Chrome\//.test(ua))      browser = 'Chrome'
    else if (/Firefox\//.test(ua))     browser = 'Firefox'
    else if (/Safari\//.test(ua))      browser = 'Safari'

    if (browser && os) return browser + ' · ' + os
    if (browser)       return browser
    if (os)            return os
    return ua.length > 30 ? ua.slice(0, 30) + '…' : ua
  }

  function fmtLogTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
  }

  async function loadLogs(page = 1) {
    logsLoading.value = true
    logsError.value = ''
    try {
      const collection = logsSubTab.value === 'login' ? 'login_logs' : 'ical_access_logs'
      const filter = buildLogsFilter()
      const res = await adminPb.collection(collection).getList(page, LOGS_PER_PAGE, {
        sort: '-created',
        ...(filter ? { filter } : {}),
        requestKey: null,
      })
      currentPageLogs.value = res.items
      logsTotalItems.value  = res.totalItems
      logsTotalPages.value  = res.totalPages
      logsPage.value        = page
      selectedLogIds.value  = new Set()
      syncUrlState()
    } catch (e) {
      logsError.value = e.message
    } finally {
      logsLoading.value = false
    }
  }

  function switchLogsTab(tab) {
    logsSubTab.value = tab
    logsFilter.email = ''
    logsFilter.ip = ''
    logsFilter.isp = ''
    logsFilter.country = ''
    logsFilter.dateFrom = ''
    logsFilter.dateTo = ''
    loadLogs(1)
    if (tab === 'ical') loadSuspiciousTokens()
  }

  // ── URL 状态同步（直接操作 history，绕过 Vue Router 避免导航冲突）────────
  function syncUrlState() {
    const p = new URLSearchParams()
    p.set('tab', activeTab.value)
    if (activeTab.value === 'logs') {
      p.set('sub', logsSubTab.value)
      if (logsPage.value > 1)  p.set('page', String(logsPage.value))
      if (logsFilter.email)    p.set('email',   logsFilter.email)
      if (logsFilter.ip)       p.set('ip',      logsFilter.ip)
      if (logsFilter.isp)      p.set('isp',     logsFilter.isp)
      if (logsFilter.country)  p.set('country', logsFilter.country)
      if (logsFilter.dateFrom) p.set('from',    logsFilter.dateFrom)
      if (logsFilter.dateTo)   p.set('to',      logsFilter.dateTo)
    }
    const qs = p.toString()
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''))
  }

  // ── 批量选择与删除 ────────────────────────────────────────────────────────
  const selectedLogIds      = ref(new Set())
  const selectAllCheckboxRef = ref(null)
  const logsDeleting        = ref(false)

  const allCurrentSelected = computed(() =>
    currentPageLogs.value.length > 0 &&
    currentPageLogs.value.every(l => selectedLogIds.value.has(l.id))
  )
  const someCurrentSelected = computed(() =>
    currentPageLogs.value.some(l => selectedLogIds.value.has(l.id)) && !allCurrentSelected.value
  )

  watchEffect(() => {
    if (selectAllCheckboxRef.value) {
      selectAllCheckboxRef.value.indeterminate = someCurrentSelected.value
    }
  })

  function toggleSelectAll() {
    if (allCurrentSelected.value) {
      currentPageLogs.value.forEach(l => selectedLogIds.value.delete(l.id))
    } else {
      currentPageLogs.value.forEach(l => selectedLogIds.value.add(l.id))
    }
    selectedLogIds.value = new Set(selectedLogIds.value)
  }

  function toggleSelectLog(id) {
    const s = new Set(selectedLogIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selectedLogIds.value = s
  }

  async function deleteSelectedLogs() {
    const ids = [...selectedLogIds.value]
    if (!ids.length) return
    if (!confirm(`确定删除已选的 ${ids.length} 条日志记录？`)) return
    const collection = logsSubTab.value === 'login' ? 'login_logs' : 'ical_access_logs'
    logsDeleting.value = true
    try {
      await Promise.all(ids.map(id => adminPb.collection(collection).delete(id, { requestKey: null })))
      selectedLogIds.value = new Set()
      currentPageLogs.value = currentPageLogs.value.filter(l => !ids.includes(l.id))
      logsTotalItems.value = Math.max(0, logsTotalItems.value - ids.length)
    } catch (e) {
      alert('删除失败：' + e.message)
    } finally {
      logsDeleting.value = false
    }
  }

  async function deleteAllFilteredLogs() {
    if (!hasLogsFilter.value || logsTotalItems.value === 0) return

    const parts = []
    if (logsFilter.email) parts.push(`邮箱「${logsFilter.email}」`)
    if (logsFilter.ip)    parts.push(`IP「${logsFilter.ip}」`)
    if (logsFilter.isp)   parts.push(`ISP「${logsFilter.isp}」`)
    if (logsFilter.country) parts.push(`国家「${logsFilter.country}」`)
    if (logsFilter.dateFrom || logsFilter.dateTo) parts.push('时间范围')
    const desc = parts.join(' + ') || '当前筛选条件'

    if (!confirm(`确定删除 ${desc} 的全部 ${logsTotalItems.value} 条日志？\n此操作不可撤回。`)) return

    const collection = logsSubTab.value === 'login' ? 'login_logs' : 'ical_access_logs'
    const filter = buildLogsFilter()
    logsDeleting.value = true
    try {
      // 拉取所有匹配记录的 ID
      const allRecords = await adminPb.collection(collection).getFullList({
        filter,
        fields: 'id',
        requestKey: null,
      })
      // 分批并发删除（每批 20 条）
      const CHUNK = 20
      for (let i = 0; i < allRecords.length; i += CHUNK) {
        const chunk = allRecords.slice(i, i + CHUNK)
        await Promise.all(chunk.map(r => adminPb.collection(collection).delete(r.id, { requestKey: null })))
      }
      selectedLogIds.value = new Set()
      await loadLogs(1)
    } catch (e) {
      alert('删除失败：' + e.message)
    } finally {
      logsDeleting.value = false
    }
  }

  // ── 可疑 / 已吊销 iCal Token ──────────────────────────────────────────────
  const suspiciousTokens = ref([])

  async function loadSuspiciousTokens() {
    try {
      suspiciousTokens.value = await adminPb.collection('ical_tokens').getFullList({
        filter:     'is_suspicious = true',
        expand:     'user',
        requestKey: null,
      })
    } catch (_) {}
  }

  async function clearTokenRevocation(tokenId) {
    try {
      await adminPb.collection('ical_tokens').update(tokenId, {
        is_suspicious: false, suspicious_at: '',
        is_revoked:    false, revoked_at:    '',
      }, { requestKey: null })
      await loadSuspiciousTokens()
    } catch (e) {
      alert('清除失败：' + e.message)
    }
  }

  return {
    LOGS_PER_PAGE,
    allCurrentSelected,
    applyLogsFilter,
    clearLogsFilter,
    clearTokenRevocation,
    currentPageLogs,
    deleteAllFilteredLogs,
    deleteSelectedLogs,
    fmtLogCountry,
    fmtLogTime,
    hasLogsFilter,
    jumpToLogsPage,
    loadLogs,
    loadSuspiciousTokens,
    logsDeleting,
    logsError,
    logsFilter,
    logsJumpInput,
    logsLoading,
    logsPage,
    logsSubTab,
    logsTotalItems,
    logsTotalPages,
    parseDevice,
    quickFilterEmail,
    quickFilterIp,
    selectedLogIds,
    selectAllCheckboxRef,
    someCurrentSelected,
    suspiciousTokens,
    switchLogsTab,
    syncUrlState,
    toggleSelectAll,
    toggleSelectLog,
  }
}
